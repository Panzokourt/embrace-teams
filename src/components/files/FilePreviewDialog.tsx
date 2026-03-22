import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
  fileName: string;
  contentType: string | null;
}

export function FilePreviewDialog({ open, onOpenChange, filePath, fileName, contentType }: FilePreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && filePath) {
      setLoading(true);
      supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, 600)
        .then(({ data }) => {
          setSignedUrl(data?.signedUrl ?? null);
          setLoading(false);
        });
    } else {
      setSignedUrl(null);
    }
  }, [open, filePath]);

  const isImage = contentType?.startsWith('image/');
  const isPdf = contentType?.includes('pdf');
  const isVideo = contentType?.startsWith('video/');
  const isAudio = contentType?.startsWith('audio/');
  const canPreview = isImage || isPdf || isVideo || isAudio;

  const handleDownload = () => {
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold truncate max-w-[60%]">{fileName}</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Λήψη
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-center min-h-[400px] max-h-[calc(90vh-60px)] overflow-auto bg-background/50">
          {loading && (
            <div className="text-sm text-muted-foreground animate-pulse">Φόρτωση...</div>
          )}

          {!loading && signedUrl && isImage && (
            <img
              src={signedUrl}
              alt={fileName}
              className="max-w-full max-h-[calc(90vh-80px)] object-contain"
            />
          )}

          {!loading && signedUrl && isPdf && (
            <iframe
              src={signedUrl}
              title={fileName}
              className="w-full h-[calc(90vh-80px)]"
            />
          )}

          {!loading && signedUrl && isVideo && (
            <video
              src={signedUrl}
              controls
              className="max-w-full max-h-[calc(90vh-80px)]"
            />
          )}

          {!loading && signedUrl && isAudio && (
            <div className="flex flex-col items-center gap-4 p-8">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm font-medium">{fileName}</p>
              <audio src={signedUrl} controls className="w-full max-w-md" />
            </div>
          )}

          {!loading && signedUrl && !canPreview && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Δεν είναι δυνατή η προεπισκόπηση αυτού του αρχείου.
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" /> Λήψη αρχείου
              </Button>
            </div>
          )}

          {!loading && !signedUrl && (
            <div className="text-sm text-muted-foreground">Σφάλμα φόρτωσης</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
