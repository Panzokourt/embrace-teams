import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortalContext {
  client: { id: string; name: string };
}

interface PortalFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  created_at: string;
  project: { name: string } | null;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalFiles() {
  const { client } = useOutletContext<PortalContext>();
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    fetchFiles();
  }, [client]);

  const fetchFiles = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', client.id);

    const projectIds = (projects || []).map(p => p.id);
    if (projectIds.length === 0) { setLoading(false); return; }

    const { data } = await supabase
      .from('file_attachments')
      .select('id, file_name, file_path, file_size, content_type, created_at, project:projects(name)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    setFiles((data as any[]) || []);
    setLoading(false);
  };

  const downloadFile = async (file: PortalFile) => {
    const { data } = await supabase.storage.from('project-files').createSignedUrl(file.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">Φόρτωση...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        Αρχεία
      </h2>

      {files.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Δεν βρέθηκαν αρχεία</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="py-3 px-5 flex items-center gap-3">
                <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    {file.project && <span>{file.project.name}</span>}
                    {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                    <span>{new Date(file.created_at).toLocaleDateString('el-GR')}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(file)}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
