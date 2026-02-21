import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  FileText,
  GripVertical,
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

// Draggable project item
function DraggableProject({ project, isActive }: { project: ProjectItem; isActive: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `project-${project.id}`,
    data: { type: 'project', projectId: project.id },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={() => navigate(`/projects/${project.id}`)}
      className={cn(
        "flex items-center gap-2 w-full rounded-lg px-2 py-1 text-xs transition-colors truncate group",
        isDragging && "opacity-30",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
      )}
    >
      <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" onClick={e => e.stopPropagation()}>
        <GripVertical className="h-3 w-3" />
      </span>
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate">{project.name}</span>
    </button>
  );
}

// Droppable folder
function DroppableFolder({
  folder,
  isOpen,
  isOver,
  children,
  onToggle,
  onRename,
  onDelete,
  renamingId,
  renameValue,
  setRenameValue,
  setRenamingId,
  onRenameSubmit,
  projectCount,
}: {
  folder: ProjectFolder;
  isOpen: boolean;
  isOver: boolean;
  children: React.ReactNode;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  setRenamingId: (v: string | null) => void;
  onRenameSubmit: () => void;
  projectCount: number;
}) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: 'folder', folderId: folder.id },
  });

  return (
    <div ref={setNodeRef}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors group",
              (isOver || droppableIsOver) && "bg-primary/10 ring-1 ring-primary/30"
            )}
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform duration-200 shrink-0", isOpen && "rotate-90")} />
            {isOpen ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color || undefined }} />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color || undefined }} />
            )}
            {renamingId === folder.id ? (
              <form
                onSubmit={e => { e.preventDefault(); onRenameSubmit(); }}
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
            <span className="ml-auto text-[10px] text-muted-foreground/40">{projectCount}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onRename}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Μετονομασία
          </ContextMenuItem>
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Διαγραφή
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen && children}
    </div>
  );
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const moveProject = useMutation({
    mutationFn: async ({ projectId, folderId }: { projectId: string; folderId: string | null }) => {
      const { error } = await supabase.from('projects').update({ folder_id: folderId }).eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      toast.success('Το έργο μετακινήθηκε');
    },
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || activeData.type !== 'project') return;

    const projectId = activeData.projectId as string;
    let targetFolderId: string | null = null;

    if (overData?.type === 'folder') {
      targetFolderId = overData.folderId as string;
    } else if (over.id === 'root-drop') {
      targetFolderId = null;
    }

    // Check if actually changed
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject && currentProject.folder_id !== targetFolderId) {
      moveProject.mutate({ projectId, folderId: targetFolderId });
    }
  };

  if (collapsed) return null;

  const rootFolders = folders.filter(f => !f.parent_folder_id);
  const unfolderedProjects = projects.filter(p => !p.folder_id);
  const currentProjectId = location.pathname.match(/\/projects\/(.+)/)?.[1];

  const draggedProject = activeDragId
    ? projects.find(p => `project-${p.id}` === activeDragId)
    : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="max-h-[300px] overflow-y-auto space-y-0.5 mt-1 scrollbar-thin">
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
            <DroppableFolder
              key={folder.id}
              folder={folder}
              isOpen={isOpen}
              isOver={false}
              onToggle={() => toggleFolder(folder.id)}
              onRename={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}
              onDelete={() => deleteFolder.mutate(folder.id)}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              setRenamingId={setRenamingId}
              onRenameSubmit={() => renameFolder.mutate({ id: folder.id, name: renameValue })}
              projectCount={folderProjects.length}
            >
              {folderProjects.length > 0 && (
                <div className="ml-4 pl-2 border-l border-border/20 space-y-0.5">
                  {folderProjects.map(project => (
                    <DraggableProject
                      key={project.id}
                      project={project}
                      isActive={currentProjectId === project.id}
                    />
                  ))}
                </div>
              )}
            </DroppableFolder>
          );
        })}

        {/* Unfoldered projects - droppable root */}
        <RootDropZone>
          {unfolderedProjects.map(project => (
            <DraggableProject
              key={project.id}
              project={project}
              isActive={currentProjectId === project.id}
            />
          ))}
        </RootDropZone>
      </div>

      <DragOverlay>
        {draggedProject && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs bg-card border shadow-lg">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{draggedProject.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function RootDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-drop',
    data: { type: 'root' },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-0.5 transition-colors rounded-lg",
        isOver && "bg-secondary/30 ring-1 ring-primary/20"
      )}
    >
      {children}
    </div>
  );
}
