import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Upload, 
  Loader2, 
  File, 
  FileText, 
  Image, 
  FileVideo, 
  FileAudio,
  Trash2,
  Download,
  Eye,
  Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';

interface FileAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name: string | null;
    email: string;
  };
}

interface TenderFileAttachmentsProps {
  tenderId: string;
}

export function TenderFileAttachments({ tenderId }: TenderFileAttachmentsProps) {
  const { user, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchFiles();
  }, [tenderId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('tender_id', tenderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch uploader profiles
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(f => f.uploaded_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const filesWithUploaders = data.map(file => ({
          ...file,
          uploader: profilesMap.get(file.uploaded_by) || { full_name: null, email: 'Unknown' }
        }));
        setFiles(filesWithUploaders);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('Error fetching tender files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;

    setUploading(true);

    try {
      for (const file of Array.from(selectedFiles)) {
        // Keep userId as first folder segment for storage policies; keep tender context in prefix.
        const fileName = createProjectFilesObjectKey({
          userId: user.id,
          originalName: file.name,
          prefix: `tenders/${tenderId}`,
        });

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save file metadata with tender_id
        const { error: insertError } = await supabase
          .from('file_attachments')
          .insert({
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            content_type: file.type,
            uploaded_by: user.id,
            tender_id: tenderId,
          });

        if (insertError) throw insertError;
      }

      toast.success('Τα αρχεία ανέβηκαν επιτυχώς!');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Σφάλμα κατά το ανέβασμα');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Σφάλμα κατά τη λήψη');
    }
  };

  const handlePreview = async (file: FileAttachment) => {
    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.file_path, 60);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Σφάλμα κατά την προεπισκόπηση');
    }
  };

  const handleDelete = async (file: FileAttachment) => {
    if (!canManage && user?.id !== file.uploaded_by) {
      toast.error('Δεν έχετε δικαίωμα διαγραφής');
      return;
    }

    try {
      // Delete from storage
      await supabase.storage.from('project-files').remove([file.file_path]);

      // Delete metadata
      const { error } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', file.id);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success('Το αρχείο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const getFileIcon = (contentType: string | null) => {
    if (!contentType) return <File className="h-5 w-5" />;
    if (contentType.startsWith('image/')) return <Image className="h-5 w-5 text-primary" />;
    if (contentType.startsWith('video/')) return <FileVideo className="h-5 w-5 text-secondary-foreground" />;
    if (contentType.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-success" />;
    if (contentType.includes('pdf')) return <FileText className="h-5 w-5 text-destructive" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Upload button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
            id="tender-file-upload"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Ανέβασμα...' : 'Ανέβασμα αρχείων'}
          </Button>
        </div>

        {/* Files list */}
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Δεν υπάρχουν αρχεία</p>
            <p className="text-xs mt-1">Ανεβάστε αρχεία σχετικά με τον διαγωνισμό</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
              >
                {getFileIcon(file.content_type)}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)} • {file.uploader?.full_name || file.uploader?.email} • {format(new Date(file.created_at), 'd MMM', { locale: el })}
                  </p>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePreview(file)}
                    title="Προεπισκόπηση"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(file)}
                    title="Λήψη"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {(canManage || user?.id === file.uploaded_by) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(file)}
                      title="Διαγραφή"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
