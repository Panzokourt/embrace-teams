import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectCreatives } from '@/components/projects/ProjectCreatives';
import { FileExplorer } from '@/components/files/FileExplorer';
import { Search, Image, FileText, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectAssetsTabProps {
  projectId: string;
  projectName: string;
  deliverables: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
}

type AssetFilter = 'all' | 'creatives' | 'files';

export function ProjectAssetsTab({ projectId, projectName, deliverables, tasks }: ProjectAssetsTabProps) {
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [search, setSearch] = useState('');

  const filters: { id: AssetFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'Όλα', icon: FolderOpen },
    { id: 'creatives', label: 'Δημιουργικά', icon: Image },
    { id: 'files', label: 'Αρχεία', icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
          {filters.map(f => (
            <Button
              key={f.id}
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-xs rounded-lg',
                filter === f.id && 'bg-background shadow-sm text-foreground font-semibold'
              )}
              onClick={() => setFilter(f.id)}
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση αρχείων..."
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {(filter === 'all' || filter === 'creatives') && (
        <div>
          {filter === 'all' && <h3 className="text-sm font-semibold mb-2">Δημιουργικά</h3>}
          <ProjectCreatives
            projectId={projectId}
            projectName={projectName}
            deliverables={deliverables}
            tasks={tasks}
            mediaPlanItems={[]}
          />
        </div>
      )}

      {(filter === 'all' || filter === 'files') && (
        <div>
          {filter === 'all' && <h3 className="text-sm font-semibold mb-2 mt-6">Αρχεία</h3>}
          <FileExplorer projectId={projectId} />
        </div>
      )}
    </div>
  );
}
