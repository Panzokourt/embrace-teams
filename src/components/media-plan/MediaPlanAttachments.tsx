import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeStorageFileName } from '@/utils/storageKeys';

interface MediaPlanAttachmentsProps {
  itemId: string;
  planId: string;
  disabled?: boolean;
}

export function MediaPlanAttachments({ itemId, planId, disabled }: MediaPlanAttachmentsProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [] } = useQuery({
    queryKey: ['media-plan-item-attachments', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_plan_item_attachments' as any)
        .select('*')
        .eq('media_plan_item_id', itemId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile?.id) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safeName = sanitizeStorageFileName(file.name);
        const filePath = `media-plan/${planId}/${itemId}/${Date.now()}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);
        if (uploadErr) throw uploadErr;

        const { error: insertErr } = await supabase
          .from('media_plan_item_attachments' as any)
          .insert({
            media_plan_item_id: itemId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type,
            uploaded_by: profile.id,
          } as any);
        if (insertErr) throw insertErr;
      }
      toast.success('File(s) uploaded');
      queryClient.invalidateQueries({ queryKey: ['media-plan-item-attachments', itemId] });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (att: any) => {
    const { data } = await supabase.storage.from('project-files').createSignedUrl(att.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (attId: string, filePath: string) => {
    await supabase.storage.from('project-files').remove([filePath]);
    await supabase.from('media_plan_item_attachments' as any).delete().eq('id', attId);
    queryClient.invalidateQueries({ queryKey: ['media-plan-item-attachments', itemId] });
    toast.success('File deleted');
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Paperclip className="h-3 w-3" /> Attachments ({attachments.length})
        </h4>
        {!disabled && (
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="h-3 w-3 mr-1" /> {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground">No files attached.</p>
      )}

      <div className="space-y-1">
        {attachments.map((att: any) => (
          <div key={att.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate flex-1 font-medium">{att.file_name}</span>
            <span className="text-muted-foreground shrink-0">{formatSize(att.file_size)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(att)}>
              <Download className="h-3 w-3" />
            </Button>
            {!disabled && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(att.id, att.file_path)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
