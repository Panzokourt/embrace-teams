import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Plus, Upload, Download } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface ProjectContract {
  id: string;
  contract_type: string | null;
  status: string | null;
  file_attachment_id: string | null;
  created_at: string;
  file_name?: string;
  file_path?: string;
}

interface ProjectContractsCardProps {
  projectId: string;
  onUploadContract?: () => void;
}

export function ProjectContractsCard({ projectId, onUploadContract }: ProjectContractsCardProps) {
  const [contracts, setContracts] = useState<ProjectContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [projectId]);

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from('project_contracts')
      .select('id, contract_type, status, file_attachment_id, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error || !data) { setLoading(false); return; }

    // Fetch file names for linked attachments
    const fileIds = data.map(c => c.file_attachment_id).filter(Boolean) as string[];
    let fileMap = new Map<string, { file_name: string; file_path: string }>();
    if (fileIds.length > 0) {
      const { data: files } = await supabase.from('file_attachments').select('id, file_name, file_path').in('id', fileIds);
      if (files) fileMap = new Map(files.map(f => [f.id, { file_name: f.file_name, file_path: f.file_path }]));
    }

    setContracts(data.map(c => ({
      ...c,
      file_name: c.file_attachment_id ? fileMap.get(c.file_attachment_id)?.file_name : undefined,
      file_path: c.file_attachment_id ? fileMap.get(c.file_attachment_id)?.file_path : undefined,
    })) as ProjectContract[]);
    setLoading(false);
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('project-files').createSignedUrl(filePath, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-700 border-green-500/20',
    expired: 'bg-muted text-muted-foreground',
    draft: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    terminated: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  if (loading) {
    return (
      <Card><CardContent className="p-5 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Συμβόλαια {contracts.length > 0 && `(${contracts.length})`}
          </p>
          {onUploadContract && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onUploadContract}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Προσθήκη
            </Button>
          )}
        </div>

        {contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Δεν υπάρχουν συμβόλαια ακόμα</p>
            {onUploadContract && (
              <Button variant="outline" size="sm" onClick={onUploadContract}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Ανέβασμα Συμβολαίου
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map(c => (
              <div key={c.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.file_name || c.contract_type || 'Σύμβαση'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), 'd MMM yyyy', { locale: el })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={statusColors[c.status || 'active'] || ''}>
                    {c.status === 'active' ? 'Ενεργό' : c.status === 'expired' ? 'Ληγμένο' : c.status || 'Ενεργό'}
                  </Badge>
                  {c.file_path && c.file_name && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(c.file_path!, c.file_name!)}>
                      <Download className="h-3.5 w-3.5" />
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
