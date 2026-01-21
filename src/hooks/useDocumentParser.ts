import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ParsedFile {
  fileName: string;
  content: string;
  metadata: {
    fileType: string;
    wordCount: number;
    characterCount: number;
    pagesProcessed?: number;
    lowQuality?: boolean;
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

  const isReadableText = useCallback((text: string) => {
    if (text.length < 100) return false;
    const greekPattern = /[α-ωά-ώΑ-ΩΆ-Ώ]/g;
    const latinPattern = /[a-zA-Z]/g;
    const greekMatches = text.match(greekPattern) || [];
    const latinMatches = text.match(latinPattern) || [];
    const totalLetters = greekMatches.length + latinMatches.length;
    const garbagePattern = /[^\x20-\x7E\xA0-\xFF\u0370-\u03FF\u1F00-\u1FFF\n\r\t]/g;
    const garbageMatches = text.match(garbagePattern) || [];
    const garbageRatio = garbageMatches.length / text.length;
    const letterRatio = totalLetters / text.length;
    return letterRatio > 0.25 && garbageRatio < 0.3;
  }, []);

  const extractPdfTextClientSide = useCallback(async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let combined = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as any[])
        .map((it) => (typeof it.str === 'string' ? it.str : ''))
        .filter(Boolean)
        .join(' ');
      combined += `\n\n=== Σελίδα ${pageNum} ===\n${pageText}`;
    }

    return { text: combined.trim(), pages: pdf.numPages };
  }, []);

  const ocrPdfClientSide = useCallback(async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Render and OCR sequentially so we don't keep all pages in memory
    const BATCH = 2;
    const SCALE = 2;
    const combinedParts: string[] = [];
    let batch: Array<{ fileName: string; contentType: string; data: string }> = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];

      batch.push({
        data: base64,
        fileName: `${file.name.replace(/\.pdf$/i, '')}_page_${pageNum}.jpg`,
        contentType: 'image/jpeg',
      });

      if (batch.length >= BATCH || pageNum === pdf.numPages) {
        const { data, error } = await supabase.functions.invoke('parse-document', {
          body: { base64Files: batch },
        });
        if (error) throw new Error(error.message || 'Failed OCR batch');

        if (data?.success && data?.files) {
          for (const f of data.files) {
            combinedParts.push(`\n\n=== ${f.metadata.fileName} ===\n${f.text}`);
          }
        }

        batch = [];

        // small backoff to reduce 429s on big PDFs
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    const finalText = combinedParts.join('').trim();
    return { text: finalText, pages: pdf.numPages };
  }, []);

  const parseFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return [];

    setParsing(true);
    const fileArray = Array.from(files);
    const results: ParsedFile[] = [];

    try {
      // PDFs: do client-side extraction first (most reliable for Greek text PDFs)
      for (const file of fileArray) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const loadingToast = toast.loading(`Ανάγνωση PDF: ${file.name}`);
          try {
            const { text, pages } = await extractPdfTextClientSide(file);
            const readable = isReadableText(text) && text.length > 500;

            if (readable) {
              results.push({
                fileName: file.name,
                content: text,
                metadata: {
                  fileType: 'pdf',
                  wordCount: text.split(/\s+/).filter(Boolean).length,
                  characterCount: text.length,
                  pagesProcessed: pages,
                  lowQuality: false,
                },
              });
              toast.dismiss(loadingToast);
              continue;
            }

            // Scanned/garbled PDFs: OCR via backend by converting pages to images
            toast.dismiss(loadingToast);
            const ocrToast = toast.loading(`OCR PDF (σελίδες): ${file.name}`);

            const { text: finalText, pages: numPages } = await ocrPdfClientSide(file);
            results.push({
              fileName: file.name,
              content: finalText,
              metadata: {
                fileType: 'pdf',
                wordCount: finalText.split(/\s+/).filter(Boolean).length,
                characterCount: finalText.length,
                pagesProcessed: numPages,
                lowQuality: !isReadableText(finalText),
              },
            });

            toast.dismiss(ocrToast);
          } catch (e: any) {
            toast.dismiss(loadingToast);
            console.error('PDF parse error:', e);
            throw e;
          }
          continue;
        }
      }

      // Non-PDFs: send to backend parse-document
      const nonPdfFiles = fileArray.filter(
        (f) => !(f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      );

      if (nonPdfFiles.length > 0) {
        const base64Files = await Promise.all(
          nonPdfFiles.map(async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return {
              data: btoa(binary),
              fileName: file.name,
              contentType: file.type || 'application/octet-stream',
            };
          })
        );

        const { data, error } = await supabase.functions.invoke('parse-document', {
          body: { base64Files },
        });

        if (error) throw new Error(error.message || 'Failed to parse documents');

        if (data?.success && data?.files) {
          for (const file of data.files) {
            results.push({
              fileName: file.metadata.fileName,
              content: file.text,
              metadata: {
                fileType: file.metadata.fileType,
                wordCount: file.metadata.wordCount,
                characterCount: file.metadata.characterCount,
                pagesProcessed: file.metadata.pagesProcessed,
                lowQuality: file.metadata.lowQuality,
              },
            });
          }
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
  }, [options, extractPdfTextClientSide, isReadableText, ocrPdfClientSide]);

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
