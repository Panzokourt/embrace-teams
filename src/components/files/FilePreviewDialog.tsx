import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string | null;
  fileName: string;
  contentType: string | null;
}

function getPreviewType(contentType: string | null, fileName: string): 'image' | 'pdf' | 'video' | 'audio' | 'office' | 'none' {
  if (contentType?.startsWith('image/')) return 'image';
  if (contentType?.includes('pdf')) return 'pdf';
  if (contentType?.startsWith('video/')) return 'video';
  if (contentType?.startsWith('audio/')) return 'audio';

  const officeTypes = [
    'msword',
    'wordprocessingml',
    'spreadsheetml',
    'presentationml',
    'ms-excel',
    'ms-powerpoint',
    'opendocument',
    'officedocument',
  ];
  if (contentType && officeTypes.some((type) => contentType.includes(type))) return 'office';

  const ext = fileName.split('.').pop()?.toLowerCase();
  const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'csv'];
  if (ext && officeExts.includes(ext)) return 'office';

  return 'none';
}

function toAbsoluteStorageUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) return url;

  return `${baseUrl}/storage/v1${url}`;
}

export function FilePreviewDialog({ open, onOpenChange, filePath, fileName, contentType }: FilePreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!open || !filePath) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    supabase.storage
      .from('project-files')
      .createSignedUrl(filePath, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setSignedUrl(null);
          setLoading(false);
          return;
        }

        setSignedUrl(toAbsoluteStorageUrl(data?.signedUrl ?? null));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, filePath]);

  const previewType = getPreviewType(contentType, fileName);

  const googleViewerUrl = useMemo(() => {
    if (!signedUrl) return null;
    return `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`;
  }, [signedUrl]);

  const handleDownload = () => {
    if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenExternal = () => {
    if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] max-h-[92vh] w-[92vw] h-[92vh] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 pr-12 py-2 border-b border-border bg-muted/30 flex-none gap-3">
          <h3 className="text-sm font-semibold truncate min-w-0 flex-1">{fileName}</h3>
          <div className="flex items-center gap-2 flex-none">
            <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5 flex-none">
              <Download className="h-3.5 w-3.5" /> Λήψη
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden bg-background/50 min-h-0 relative">
          {!loading && signedUrl && (previewType === 'pdf' || previewType === 'office') && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleOpenExternal}
              className="absolute right-4 top-4 z-10"
              aria-label="Άνοιγμα σε νέα καρτέλα"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Φόρτωση...</p>
            </div>
          )}

          {!loading && signedUrl && previewType === 'image' && (
            <img src={signedUrl} alt={fileName} className="max-w-full max-h-full object-contain p-4" />
          )}

          {!loading && signedUrl && previewType === 'pdf' && (
            <object data={signedUrl} type="application/pdf" className="w-full h-full">
              <iframe src={googleViewerUrl ?? signedUrl} title={fileName} className="w-full h-full border-0" />
            </object>
          )}

          {!loading && signedUrl && previewType === 'office' && googleViewerUrl && (
            <iframe src={googleViewerUrl} title={fileName} className="w-full h-full border-0" />
          )}

          {!loading && signedUrl && previewType === 'video' && (
            <video src={signedUrl} controls className="max-w-full max-h-full" />
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
              <p className="text-sm text-muted-foreground">Δεν είναι δυνατή η προεπισκόπηση αυτού του αρχείου.</p>
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

