import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ParsedFile {
  fileName: string;
  content: string;
  metadata: {
    fileType: string;
    wordCount: number;
    characterCount: number;
  };
}

export interface UseDocumentParserOptions {
  onSuccess?: (files: ParsedFile[]) => void;
  onError?: (error: Error) => void;
  saveToStorage?: boolean;
  projectId?: string;
  tenderId?: string;
}

export function useDocumentParser(options: UseDocumentParserOptions = {}) {
  const [parsing, setParsing] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);

  const parseFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return [];

    setParsing(true);
    const fileArray = Array.from(files);
    const results: ParsedFile[] = [];

    try {
      // Convert files to base64 for sending to edge function
      const base64Files = await Promise.all(
        fileArray.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return {
            data: btoa(binary),
            fileName: file.name,
            contentType: file.type || 'application/octet-stream'
          };
        })
      );

      // Call the parse-document edge function
      const { data, error } = await supabase.functions.invoke('parse-document', {
        body: { base64Files }
      });

      if (error) {
        throw new Error(error.message || 'Failed to parse documents');
      }

      if (data.success && data.files) {
        for (const file of data.files) {
          results.push({
            fileName: file.metadata.fileName,
            content: file.text,
            metadata: {
              fileType: file.metadata.fileType,
              wordCount: file.metadata.wordCount,
              characterCount: file.metadata.characterCount
            }
          });
        }
      }

      // Optionally save to storage
      if (options.saveToStorage && (options.projectId || options.tenderId)) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          for (const file of fileArray) {
            const fileName = `${userData.user.id}/${Date.now()}_${file.name}`;
            
            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('project-files')
              .upload(fileName, file);

            if (uploadError) {
              console.error('Error uploading file to storage:', uploadError);
              continue;
            }

            // Save file metadata
            const attachmentData: any = {
              file_name: file.name,
              file_path: fileName,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: userData.user.id,
            };

            if (options.projectId) {
              attachmentData.project_id = options.projectId;
            }
            if (options.tenderId) {
              attachmentData.tender_id = options.tenderId;
            }

            await supabase.from('file_attachments').insert(attachmentData);
          }
        }
      }

      setParsedFiles(prev => [...prev, ...results]);
      options.onSuccess?.(results);

      return results;
    } catch (error: any) {
      console.error('Error parsing documents:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      toast.error('Σφάλμα κατά την ανάγνωση αρχείων');
      return [];
    } finally {
      setParsing(false);
    }
  }, [options]);

  const clearParsedFiles = useCallback(() => {
    setParsedFiles([]);
  }, []);

  return {
    parsing,
    parsedFiles,
    parseFiles,
    clearParsedFiles
  };
}
