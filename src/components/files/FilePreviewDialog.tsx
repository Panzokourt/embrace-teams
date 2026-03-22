import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
  fileName: string;
  contentType: string | null;
}

function getPreviewType(contentType: string | null, fileName: string): 'image' | 'pdf' | 'video' | 'audio' | 'office' | 'none' {
  if (!contentType) return 'none';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  
  // Office documents — use Google Docs Viewer
  const officeTypes = [
    'msword', 'wordprocessingml', 'spreadsheetml', 'presentationml',
    'ms-excel', 'ms-powerpoint', 'opendocument', 'officedocument',
  ];
  if (officeTypes.some(t => contentType.includes(t))) return 'office';
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'csv'];
  if (ext && officeExts.includes(ext)) return 'office';
  
  return 'none';
}

export function FilePreviewDialog({ open, onOpenChange, filePath, fileName, contentType }: FilePreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && filePath) {
      setLoading(true);
      supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, 3600)
        .then(({ data }) => {
          setSignedUrl(data?.signedUrl ?? null);
          setLoading(false);
        });
    } else {
      setSignedUrl(null);
    }
  }, [open, filePath]);

  const previewType = getPreviewType(contentType, fileName);

  const handleDownload = () => {
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  // Google Docs Viewer URL for office files
  const googleViewerUrl = signedUrl
    ? `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] max-h-[92vh] w-[92vw] h-[92vh] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 flex-none">
          <h3 className="text-sm font-semibold truncate max-w-[70%]">{fileName}</h3>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5 flex-none">
            <Download className="h-3.5 w-3.5" /> Λήψη
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-background/50 min-h-0">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Φόρτωση...</p>
            </div>
          )}

          {!loading && signedUrl && previewType === 'image' && (
            <img
              src={signedUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain p-4"
            />
          )}

          {!loading && signedUrl && previewType === 'pdf' && (
            <iframe
              src={signedUrl}
              title={fileName}
              className="w-full h-full border-0"
            />
          )}

          {!loading && signedUrl && previewType === 'office' && googleViewerUrl && (
            <iframe
              src={googleViewerUrl}
              title={fileName}
              className="w-full h-full border-0"
            />
          )}

          {!loading && signedUrl && previewType === 'video' && (
            <video
              src={signedUrl}
              controls
              className="max-w-full max-h-full"
            />
          )}

          {!loading && signedUrl && previewType === 'audio' && (
            <div className="flex flex-col items-center gap-4 p-8">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm font-medium">{fileName}</p>
              <audio src={signedUrl} controls className="w-full max-w-md" />
            </div>
          )}

          {!loading && signedUrl && previewType === 'none' && (
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
