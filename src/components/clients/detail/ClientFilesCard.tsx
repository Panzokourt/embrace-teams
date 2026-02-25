import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Download, File, Image, Presentation } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface FileItem {
  id: string;
  file_name: string;
  content_type: string | null;
  created_at: string;
  uploaded_by_name: string | null;
  file_path: string;
  category: string;
}

interface Props {
  files: FileItem[];
}

const categories = ['contracts', 'proposals', 'presentations', 'reports', 'creative'] as const;

const categoryLabels: Record<string, string> = {
  contracts: 'Contracts',
  proposals: 'Proposals',
  presentations: 'Presentations',
  reports: 'Reports',
  creative: 'Creative',
};

function getFileIcon(contentType: string | null) {
  if (contentType?.startsWith('image/')) return <Image className="h-4 w-4 text-muted-foreground" />;
  if (contentType?.includes('presentation')) return <Presentation className="h-4 w-4 text-muted-foreground" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function ClientFilesCard({ files }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Files & Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contracts">
          <TabsList className="mb-3">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {categoryLabels[cat]} ({files.filter(f => f.category === cat).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map(cat => (
            <TabsContent key={cat} value={cat}>
              {files.filter(f => f.category === cat).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Δεν υπάρχουν αρχεία</p>
              ) : (
                <div className="space-y-2">
                  {files.filter(f => f.category === cat).map(file => (
                    <div key={file.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50 group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getFileIcon(file.content_type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(file.created_at), 'd MMM yyyy', { locale: el })}
                            {file.uploaded_by_name && ` • ${file.uploaded_by_name}`}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
