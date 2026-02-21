import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ProjectFolder {
  id: string;
  name: string;
  color: string | null;
  parent_folder_id: string | null;
  sort_order: number;
}

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  folder_id: string | null;
}

export function SidebarProjectTree({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { company } = useAuth();
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sidebar-project-folders') || '[]');
      return new Set(stored);
    } catch { return new Set(); }
  });
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Save expanded state
  useEffect(() => {
    localStorage.setItem('sidebar-project-folders', JSON.stringify([...expandedFolders]));
  }, [expandedFolders]);

  const { data: folders = [] } = useQuery({
    queryKey: ['project-folders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('project_folders')
        .select('id, name, color, parent_folder_id, sort_order')
        .eq('company_id', companyId)
        .order('sort_order');
      if (error) throw error;
      return data as ProjectFolder[];
    },
    enabled: !!companyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['sidebar-projects', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, folder_id')
        .eq('company_id', companyId)
        .in('status', ['active', 'lead', 'proposal'])
        .order('name');
      if (error) throw error;
      return data as ProjectItem[];
    },
    enabled: !!companyId,
  });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('project_folders').insert({
        company_id: companyId!,
        name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      toast.success('Φάκελος δημιουργήθηκε');
      setCreatingFolder(false);
      setNewFolderName('');
    },
    onError: () => toast.error('Σφάλμα δημιουργίας φακέλου'),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('project_folders').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      setRenamingId(null);
      toast.success('Μετονομασία ολοκληρώθηκε');
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      // Unassign projects first
      await supabase.from('projects').update({ folder_id: null }).eq('folder_id', id);
      const { error } = await supabase.from('project_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      toast.success('Φάκελος διαγράφηκε');
    },
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (collapsed) return null;

  const rootFolders = folders.filter(f => !f.parent_folder_id);
  const unfolderedProjects = projects.filter(p => !p.folder_id);
  const currentProjectId = location.pathname.match(/\/projects\/(.+)/)?.[1];

  return (
    <div className="space-y-0.5 mt-1">
      {/* Create folder button */}
      {creatingFolder ? (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (newFolderName.trim()) createFolder.mutate(newFolderName.trim());
          }}
          className="flex items-center gap-1 px-2"
        >
          <Input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }}
            placeholder="Φάκελος..."
            className="h-7 text-xs"
          />
        </form>
      ) : (
        <button
          onClick={() => setCreatingFolder(true)}
          className="flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
        >
          <Plus className="h-3 w-3" />
          <span>Νέος Φάκελος</span>
        </button>
      )}

      {/* Folders */}
      {rootFolders.map(folder => {
        const folderProjects = projects.filter(p => p.folder_id === folder.id);
        const isOpen = expandedFolders.has(folder.id);

        return (
          <div key={folder.id}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors group"
                >
                  <ChevronRight className={cn("h-3 w-3 transition-transform duration-200 shrink-0", isOpen && "rotate-90")} />
                  {isOpen ? (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color || undefined }} />
                  ) : (
                    <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color || undefined }} />
                  )}
                  {renamingId === folder.id ? (
                    <form
                      onSubmit={e => { e.preventDefault(); renameFolder.mutate({ id: folder.id, name: renameValue }); }}
                      onClick={e => e.stopPropagation()}
                    >
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => setRenamingId(null)}
                        className="h-5 text-xs px-1"
                      />
                    </form>
                  ) : (
                    <span className="truncate text-xs">{folder.name}</span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground/40">{folderProjects.length}</span>
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Μετονομασία
                </ContextMenuItem>
                <ContextMenuItem onClick={() => deleteFolder.mutate(folder.id)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Διαγραφή
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {isOpen && folderProjects.length > 0 && (
              <div className="ml-4 pl-2 border-l border-border/20 space-y-0.5">
                {folderProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className={cn(
                      "flex items-center gap-2 w-full rounded-lg px-2 py-1 text-xs transition-colors truncate",
                      currentProjectId === project.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    )}
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Unfoldered projects */}
      {unfolderedProjects.map(project => (
        <button
          key={project.id}
          onClick={() => navigate(`/projects/${project.id}`)}
          className={cn(
            "flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-xs transition-colors truncate",
            currentProjectId === project.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
          )}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">{project.name}</span>
        </button>
      ))}
    </div>
  );
}
