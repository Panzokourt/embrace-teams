import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectCategories, sectorToCategory } from '@/hooks/useProjectCategories';
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
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

/* ───────── Types ───────── */

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
  client_id: string | null;
  sidebar_sort_order: number;
  is_internal?: boolean;
  client?: { id: string; name: string; sector: string | null } | null;
}

type TreeMode = 'manual' | 'auto';

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500';
    case 'completed': return 'bg-blue-500';
    case 'on_hold': case 'paused': return 'bg-amber-500';
    case 'cancelled': return 'bg-red-500';
    case 'lead': return 'bg-purple-500';
    case 'proposal': return 'bg-cyan-500';
    default: return 'bg-muted-foreground/40';
  }
}

/* ───────── Sortable Project (manual mode) ───────── */

function SortableProject({ project, isActive }: { project: ProjectItem; isActive: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `project-${project.id}`,
    data: { type: 'project', projectId: project.id, folderId: project.folder_id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={() => navigate(`/projects/${project.id}`)}
      className={cn(
        "flex items-center gap-2 w-full rounded-lg px-2 py-1 text-xs transition-colors truncate group",
        isDragging && "opacity-30 z-50",
        isActive
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
      )}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </span>
      <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor(project.status))} />
      <span className="truncate">{project.name}</span>
    </button>
  );
}

/* ───────── Sortable Folder (manual mode) ───────── */

function SortableFolder({
  folder, isOpen, children, onToggle, onRename, onDelete,
  renamingId, renameValue, setRenameValue, setRenamingId, onRenameSubmit, projectCount,
  isOverFolder,
}: {
  folder: ProjectFolder; isOpen: boolean; children: React.ReactNode;
  onToggle: () => void; onRename: () => void; onDelete: () => void;
  renamingId: string | null; renameValue: string;
  setRenameValue: (v: string) => void; setRenamingId: (v: string | null) => void;
  onRenameSubmit: () => void; projectCount: number;
  isOverFolder: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: `folder-${folder.id}`,
    data: { type: 'folder', folderId: folder.id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-30")}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all group",
              isOverFolder && "bg-accent/40 ring-2 ring-primary/40 scale-[1.02]"
            )}
          >
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="h-3 w-3" />
            </span>
            <ChevronRight className={cn("h-3 w-3 transition-transform duration-200 shrink-0", isOpen && "rotate-90")} />
            {isOpen ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color || undefined }} />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: folder.color || undefined }} />
            )}
            {renamingId === folder.id ? (
              <form onSubmit={e => { e.preventDefault(); onRenameSubmit(); }} onClick={e => e.stopPropagation()}>
                <Input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => setRenamingId(null)} className="h-5 text-xs px-1" />
              </form>
            ) : (
              <span className="truncate text-xs">{folder.name}</span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground/40">{projectCount}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onRename}><Pencil className="h-3.5 w-3.5 mr-2" />Μετονομασία</ContextMenuItem>
          <ContextMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Διαγραφή</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && children}
    </div>
  );
}

/* ───────── Auto-mode helpers ───────── */

function ProjectLink({ project, isActive }: { project: ProjectItem; isActive: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className={cn(
        "flex items-center gap-2 w-full rounded-lg px-2 py-1 text-xs transition-colors truncate",
        isActive
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor(project.status))} />
      <span className="truncate">{project.name}</span>
    </button>
  );
}

function VirtualFolder({ name, color, children, open, onToggle }: {
  name: string; color?: string | null; children: React.ReactNode; open: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform duration-200 shrink-0", open && "rotate-90")} />
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: color || undefined }} />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: color || undefined }} />
        )}
        <span className="truncate text-xs font-medium">{name}</span>
      </button>
      {open && <div className="ml-4 pl-2 border-l border-border/20 space-y-0.5">{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function SidebarProjectTree({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { company } = useAuth();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<TreeMode>(() =>
    (localStorage.getItem('sidebar-project-tree-mode') as TreeMode) || 'auto'
  );

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('sidebar-project-folders') || '[]'));
    } catch { return new Set(); }
  });

  const [expandedVirtual, setExpandedVirtual] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingSubfolderId, setCreatingSubfolderId] = useState<string | null>(null);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Persist mode & folders
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('sidebar-project-tree-mode') as TreeMode;
      if (stored && stored !== mode) setMode(stored);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [mode]);

  useEffect(() => { localStorage.setItem('sidebar-project-tree-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('sidebar-project-folders', JSON.stringify([...expandedFolders])); }, [expandedFolders]);

  const { data: categories = [] } = useProjectCategories();

  /* ── Queries ── */

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
    queryKey: ['sidebar-projects', companyId, mode],
    queryFn: async () => {
      if (!companyId) return [];
      if (mode === 'auto') {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, status, folder_id, client_id, sidebar_sort_order, is_internal, client:clients(id, name, sector)')
          .eq('company_id', companyId)
          .order('name');
        if (error) throw error;
        return (data || []).map((d: any) => ({
          id: d.id, name: d.name, status: d.status, folder_id: d.folder_id,
          client_id: d.client_id, sidebar_sort_order: d.sidebar_sort_order ?? 0,
          is_internal: d.is_internal || false,
          client: d.client,
        })) as ProjectItem[];
      } else {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, status, folder_id, client_id, sidebar_sort_order')
          .eq('company_id', companyId)
          .in('status', ['active', 'lead', 'proposal'])
          .order('sidebar_sort_order')
          .order('name');
        if (error) throw error;
        return (data || []).map((d: any) => ({
          ...d, sidebar_sort_order: d.sidebar_sort_order ?? 0,
        })) as ProjectItem[];
      }
    },
    enabled: !!companyId,
  });

  const currentProjectId = location.pathname.match(/\/projects\/(.+)/)?.[1];

  // Auto-expand for active project (manual mode)
  useEffect(() => {
    if (mode !== 'manual' || !currentProjectId || projects.length === 0) return;
    const ap = projects.find(p => p.id === currentProjectId);
    if (ap?.folder_id && !expandedFolders.has(ap.folder_id)) {
      setExpandedFolders(prev => new Set([...prev, ap.folder_id!]));
    }
  }, [currentProjectId, projects, mode]);

  // Auto-expand for active project (auto mode)
  useEffect(() => {
    if (mode !== 'auto' || !currentProjectId || projects.length === 0) return;
    const ap = projects.find(p => p.id === currentProjectId);
    if (!ap) return;
    const keys: string[] = [];
    if (ap.is_internal) {
      keys.push('cat::__internal__');
      if (ap.folder_id) keys.push(ap.folder_id);
    } else if (ap.client) {
      const cat = sectorToCategory(ap.client.sector);
      const cn = ap.client.name;
      if (cat) { keys.push(`cat::${cat}`, `cat::${cat}::${cn}`); }
      else { keys.push('cat::__uncategorized__', `cat::__uncategorized__::${cn}`); }
    } else {
      keys.push('cat::__uncategorized__');
    }
    setExpandedVirtual(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const k of keys) if (!next.has(k)) { next.add(k); changed = true; }
      return changed ? next : prev;
    });
  }, [currentProjectId, projects, mode]);

  /* ── Mutations ── */

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.sort_order)) + 1 : 0;
      const { error } = await supabase.from('project_folders').insert({ company_id: companyId!, name, sort_order: maxOrder });
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

  const createSubfolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string }) => {
      const { error } = await supabase.from('project_folders').insert({ 
        company_id: companyId!, name, parent_folder_id: parentId, sort_order: 0 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      toast.success('Υποφάκελος δημιουργήθηκε');
      setCreatingSubfolderId(null);
      setNewSubfolderName('');
    },
    onError: () => toast.error('Σφάλμα δημιουργίας υποφακέλου'),
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
      // Prevent deletion of the Internal root folder
      const folder = folders.find(f => f.id === id);
      if (folder?.name === 'Internal' && !folder.parent_folder_id) {
        throw new Error('Ο φάκελος Internal δεν μπορεί να διαγραφεί');
      }
      await supabase.from('projects').update({ folder_id: null }).eq('folder_id', id);
      const { error } = await supabase.from('project_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      toast.success('Φάκελος διαγράφηκε');
    onError: (err: any) => toast.error(err?.message || 'Σφάλμα διαγραφής φακέλου'),
  });

  const moveProject = useMutation({
    mutationFn: async ({ projectId, folderId }: { projectId: string; folderId: string | null }) => {
      const { error } = await supabase.from('projects').update({ folder_id: folderId }).eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
    },
  });

  const reorderProjects = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(
        items.map(it =>
          supabase.from('projects').update({ sidebar_sort_order: it.sort_order }).eq('id', it.id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
    },
  });

  const reorderFolders = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(
        items.map(it =>
          supabase.from('project_folders').update({ sort_order: it.sort_order }).eq('id', it.id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
    },
  });

  /* ── Helpers ── */

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleVirtual = (key: string) => {
    setExpandedVirtual(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* ── DnD derived data ── */

  const rootFolders = useMemo(() => folders.filter(f => !f.parent_folder_id), [folders]);

  const projectsByFolder = useMemo(() => {
    const map = new Map<string | null, ProjectItem[]>();
    projects.forEach(p => {
      const key = p.folder_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    // Sort each group by sidebar_sort_order
    map.forEach((arr) => arr.sort((a, b) => a.sidebar_sort_order - b.sidebar_sort_order));
    return map;
  }, [projects]);

  // Build sortable IDs for the root level (folders + unfoldered projects interleaved)
  const rootSortableIds = useMemo(() => {
    const ids: string[] = [];
    rootFolders.forEach(f => ids.push(`folder-${f.id}`));
    (projectsByFolder.get(null) || []).forEach(p => ids.push(`project-${p.id}`));
    return ids;
  }, [rootFolders, projectsByFolder]);

  const folderProjectIds = useCallback((folderId: string) => {
    return (projectsByFolder.get(folderId) || []).map(p => `project-${p.id}`);
  }, [projectsByFolder]);

  /* ── DnD handlers ── */

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverFolderId(null); return; }
    const overData = over.data.current;
    if (overData?.type === 'folder') {
      setOverFolderId(overData.folderId as string);
    } else {
      setOverFolderId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setOverFolderId(null);
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData) return;

    // ─── PROJECT DRAG ───
    if (activeData.type === 'project') {
      const projectId = activeData.projectId as string;
      const sourceFolderId = activeData.folderId as string | null;

      // Dropped on a folder → move to that folder
      if (overData?.type === 'folder') {
        const targetFolderId = overData.folderId as string;
        if (sourceFolderId !== targetFolderId) {
          moveProject.mutate({ projectId, folderId: targetFolderId });
          // Auto-expand target folder
          setExpandedFolders(prev => new Set([...prev, targetFolderId]));
        }
        return;
      }

      // Dropped on another project → reorder within same folder or move
      if (overData?.type === 'project') {
        const overProjectId = overData.projectId as string;
        const targetFolderId = overData.folderId as string | null;

        if (sourceFolderId !== targetFolderId) {
          // Moving to a different folder
          moveProject.mutate({ projectId, folderId: targetFolderId });
          return;
        }

        // Same folder → reorder
        const folderProjects = [...(projectsByFolder.get(sourceFolderId) || [])];
        const oldIndex = folderProjects.findIndex(p => p.id === projectId);
        const newIndex = folderProjects.findIndex(p => p.id === overProjectId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(folderProjects, oldIndex, newIndex);
        const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
        reorderProjects.mutate(updates);
        return;
      }

      // Dropped on root-drop zone → remove from folder
      if (over.id === 'root-drop') {
        if (sourceFolderId !== null) {
          moveProject.mutate({ projectId, folderId: null });
        }
        return;
      }
    }

    // ─── FOLDER DRAG ───
    if (activeData.type === 'folder') {
      const activeFolderId = activeData.folderId as string;

      // Reorder folders at root level
      if (overData?.type === 'folder') {
        const overFid = overData.folderId as string;
        if (activeFolderId === overFid) return;
        const oldIndex = rootFolders.findIndex(f => f.id === activeFolderId);
        const newIndex = rootFolders.findIndex(f => f.id === overFid);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(rootFolders, oldIndex, newIndex);
        const updates = reordered.map((f, i) => ({ id: f.id, sort_order: i }));
        reorderFolders.mutate(updates);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setOverFolderId(null);
  };

  /* ── Render ── */

  if (collapsed) return null;

  // ─── AUTO MODE ───
  if (mode === 'auto') {
    const categoryLookup = new Map<string, { color: string | null; sortOrder: number }>();
    categories.forEach(cat => categoryLookup.set(cat.name, { color: cat.color, sortOrder: cat.sort_order }));

    const dynamicCategories = new Map<string, { color: string | null; sortOrder: number; clients: Map<string, ProjectItem[]> }>();
    const internalProjects: ProjectItem[] = [];
    const uncategorized: { clients: Map<string, ProjectItem[]>; orphans: ProjectItem[] } = { clients: new Map(), orphans: [] };

    projects.forEach(project => {
      // Internal projects go to their own virtual folder
      if (project.is_internal) { internalProjects.push(project); return; }
      if (!project.client) { uncategorized.orphans.push(project); return; }
      const clientName = project.client.name;
      const categoryName = sectorToCategory(project.client.sector);
      if (!categoryName) {
        if (!uncategorized.clients.has(clientName)) uncategorized.clients.set(clientName, []);
        uncategorized.clients.get(clientName)!.push(project);
        return;
      }
      if (!dynamicCategories.has(categoryName)) {
        const defined = categoryLookup.get(categoryName);
        dynamicCategories.set(categoryName, {
          color: defined?.color || '#6B7280', sortOrder: defined?.sortOrder ?? 999, clients: new Map(),
        });
      }
      const cat = dynamicCategories.get(categoryName)!;
      if (!cat.clients.has(clientName)) cat.clients.set(clientName, []);
      cat.clients.get(clientName)!.push(project);
    });

    const sortedCategories = Array.from(dynamicCategories.entries())
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder || a[0].localeCompare(b[0], 'el', { numeric: true, sensitivity: 'base' }));

    return (
      <div className="space-y-0.5 mt-1">
        <div className="max-h-[50vh] overflow-y-auto space-y-0.5 scrollbar-thin">
          {sortedCategories.map(([catName, catData]) => {
            if (catData.clients.size === 0) return null;
            const catKey = `cat::${catName}`;
            return (
              <VirtualFolder key={catName} name={catName} color={catData.color} open={expandedVirtual.has(catKey)} onToggle={() => toggleVirtual(catKey)}>
                {Array.from(catData.clients.entries()).sort((a, b) => a[0].localeCompare(b[0], 'el', { numeric: true, sensitivity: 'base' })).map(([clientName, clientProjects]) => {
                  const clientKey = `cat::${catName}::${clientName}`;
                  return (
                    <VirtualFolder key={clientName} name={clientName} open={expandedVirtual.has(clientKey)} onToggle={() => toggleVirtual(clientKey)}>
                      {clientProjects.map(p => <ProjectLink key={p.id} project={p} isActive={currentProjectId === p.id} />)}
                    </VirtualFolder>
                  );
                })}
              </VirtualFolder>
            );
          })}

          {(() => {
            // Find the Internal root folder from DB
            const internalRootFolder = folders.find(f => f.name === 'Internal' && !f.parent_folder_id);
            const internalSubfolders = internalRootFolder 
              ? folders.filter(f => f.parent_folder_id === internalRootFolder.id)
              : [];
            const internalOpen = expandedVirtual.has('cat::__internal__');
            
            // Group internal projects by subfolder
            const internalBySubfolder = new Map<string | null, ProjectItem[]>();
            internalProjects.forEach(p => {
              // Check if project is in a subfolder of Internal
              const subKey = internalSubfolders.find(sf => sf.id === p.folder_id)?.id || null;
              if (!internalBySubfolder.has(subKey)) internalBySubfolder.set(subKey, []);
              internalBySubfolder.get(subKey)!.push(p);
            });
            const rootInternalProjects = internalBySubfolder.get(null) || [];

            return (
              <div>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      onClick={() => toggleVirtual('cat::__internal__')}
                      className="flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <ChevronRight className={cn("h-3 w-3 transition-transform duration-200 shrink-0", internalOpen && "rotate-90")} />
                      {internalOpen ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: '#6B7280' }} />
                      ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: '#6B7280' }} />
                      )}
                      <span className="truncate text-xs font-medium">Internal</span>
                      <span className="ml-auto text-[10px] text-muted-foreground/40">{internalProjects.length}</span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => {
                      if (internalRootFolder) {
                        setCreatingSubfolderId(internalRootFolder.id);
                        setNewSubfolderName('');
                      }
                    }}>
                      <Plus className="h-3.5 w-3.5 mr-2" />Νέος Υποφάκελος
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {internalOpen && (
                  <div className="ml-4 pl-2 border-l border-border/20 space-y-0.5">
                    {/* Subfolder creation input */}
                    {creatingSubfolderId && internalRootFolder && creatingSubfolderId === internalRootFolder.id && (
                      <form onSubmit={e => { e.preventDefault(); if (newSubfolderName.trim()) createSubfolder.mutate({ name: newSubfolderName.trim(), parentId: internalRootFolder.id }); }} className="flex items-center gap-1 px-2">
                        <Input autoFocus value={newSubfolderName} onChange={e => setNewSubfolderName(e.target.value)} onBlur={() => { if (!newSubfolderName.trim()) setCreatingSubfolderId(null); }} placeholder="Υποφάκελος..." className="h-6 text-xs" />
                      </form>
                    )}

                    {/* Subfolders */}
                    {internalSubfolders.map(sf => {
                      const sfProjects = internalBySubfolder.get(sf.id) || [];
                      const sfOpen = expandedFolders.has(sf.id);
                      return (
                        <div key={sf.id}>
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <button
                                onClick={() => toggleFolder(sf.id)}
                                className="flex items-center gap-2 w-full rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                              >
                                <ChevronRight className={cn("h-3 w-3 transition-transform duration-200 shrink-0", sfOpen && "rotate-90")} />
                                {sfOpen ? <FolderOpen className="h-3 w-3 shrink-0" style={{ color: sf.color || '#6B7280' }} /> : <Folder className="h-3 w-3 shrink-0" style={{ color: sf.color || '#6B7280' }} />}
                                {renamingId === sf.id ? (
                                  <form onSubmit={e => { e.preventDefault(); renameFolder.mutate({ id: sf.id, name: renameValue }); }} onClick={e => e.stopPropagation()}>
                                    <Input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => setRenamingId(null)} className="h-5 text-xs px-1" />
                                  </form>
                                ) : (
                                  <span className="truncate">{sf.name}</span>
                                )}
                                <span className="ml-auto text-[10px] text-muted-foreground/40">{sfProjects.length}</span>
                              </button>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem onClick={() => { setCreatingSubfolderId(sf.id); setNewSubfolderName(''); }}>
                                <Plus className="h-3.5 w-3.5 mr-2" />Νέος Υποφάκελος
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => { setRenamingId(sf.id); setRenameValue(sf.name); }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />Μετονομασία
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => deleteFolder.mutate(sf.id)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" />Διαγραφή
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>

                          {/* Subfolder creation inside subfolder */}
                          {creatingSubfolderId === sf.id && (
                            <div className="ml-4 pl-2">
                              <form onSubmit={e => { e.preventDefault(); if (newSubfolderName.trim()) createSubfolder.mutate({ name: newSubfolderName.trim(), parentId: sf.id }); }} className="flex items-center gap-1 px-2">
                                <Input autoFocus value={newSubfolderName} onChange={e => setNewSubfolderName(e.target.value)} onBlur={() => { if (!newSubfolderName.trim()) setCreatingSubfolderId(null); }} placeholder="Υποφάκελος..." className="h-6 text-xs" />
                              </form>
                            </div>
                          )}

                          {sfOpen && (
                            <div className="ml-4 pl-2 border-l border-border/20 space-y-0.5">
                              {/* Nested subfolders */}
                              {folders.filter(nsf => nsf.parent_folder_id === sf.id).map(nsf => {
                                const nsfProjects = internalProjects.filter(p => p.folder_id === nsf.id);
                                const nsfOpen = expandedFolders.has(nsf.id);
                                return (
                                  <div key={nsf.id}>
                                    <button onClick={() => toggleFolder(nsf.id)} className="flex items-center gap-2 w-full rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
                                      <ChevronRight className={cn("h-3 w-3 transition-transform duration-200 shrink-0", nsfOpen && "rotate-90")} />
                                      <Folder className="h-3 w-3 shrink-0" style={{ color: nsf.color || '#6B7280' }} />
                                      <span className="truncate">{nsf.name}</span>
                                    </button>
                                    {nsfOpen && nsfProjects.length > 0 && (
                                      <div className="ml-4 pl-2 border-l border-border/20 space-y-0.5">
                                        {nsfProjects.map(p => <ProjectLink key={p.id} project={p} isActive={currentProjectId === p.id} />)}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {sfProjects.map(p => <ProjectLink key={p.id} project={p} isActive={currentProjectId === p.id} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Root-level internal projects (in the Internal folder directly) */}
                    {rootInternalProjects.map(p => <ProjectLink key={p.id} project={p} isActive={currentProjectId === p.id} />)}
                  </div>
                )}
              </div>
            );
          })()}

          {(uncategorized.clients.size > 0 || uncategorized.orphans.length > 0) && (
            <VirtualFolder name="Χωρίς Κατηγορία" color="#9CA3AF" open={expandedVirtual.has('cat::__uncategorized__')} onToggle={() => toggleVirtual('cat::__uncategorized__')}>
              {Array.from(uncategorized.clients.entries()).sort((a, b) => a[0].localeCompare(b[0], 'el', { numeric: true, sensitivity: 'base' })).map(([clientName, clientProjects]) => {
                const clientKey = `cat::__uncategorized__::${clientName}`;
                return (
                  <VirtualFolder key={clientName} name={clientName} open={expandedVirtual.has(clientKey)} onToggle={() => toggleVirtual(clientKey)}>
                    {clientProjects.map(p => <ProjectLink key={p.id} project={p} isActive={currentProjectId === p.id} />)}
                  </VirtualFolder>
                );
              })}
              {uncategorized.orphans.map(p => <ProjectLink key={p.id} project={p} isActive={currentProjectId === p.id} />)}
            </VirtualFolder>
          )}

          {projects.length === 0 && (
            <p className="text-[11px] text-muted-foreground/50 px-2 py-2">Δεν υπάρχουν ενεργά έργα</p>
          )}
        </div>
      </div>
    );
  }

  // ─── MANUAL MODE ───
  const unfolderedProjects = projectsByFolder.get(null) || [];
  const draggedProject = activeDragId?.startsWith('project-')
    ? projects.find(p => `project-${p.id}` === activeDragId)
    : null;
  const draggedFolder = activeDragId?.startsWith('folder-')
    ? folders.find(f => `folder-${f.id}` === activeDragId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-0.5 mt-1">
        <div className="max-h-[300px] overflow-y-auto space-y-0.5 scrollbar-thin">
          {/* Create folder */}
          {creatingFolder ? (
            <form onSubmit={e => { e.preventDefault(); if (newFolderName.trim()) createFolder.mutate(newFolderName.trim()); }} className="flex items-center gap-1 px-2">
              <Input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }} placeholder="Φάκελος..." className="h-7 text-xs" />
            </form>
          ) : (
            <button onClick={() => setCreatingFolder(true)} className="flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/30 transition-colors">
              <Plus className="h-3 w-3" /><span>Νέος Φάκελος</span>
            </button>
          )}

          {/* Root-level sortable context (folders + unfoldered projects) */}
          <SortableContext items={rootSortableIds} strategy={verticalListSortingStrategy}>
            {/* Folders */}
            {rootFolders.map(folder => {
              const folderProjects = projectsByFolder.get(folder.id) || [];
              const isOpen = expandedFolders.has(folder.id);
              const projIds = folderProjectIds(folder.id);
              return (
                <SortableFolder
                  key={folder.id}
                  folder={folder}
                  isOpen={isOpen}
                  onToggle={() => toggleFolder(folder.id)}
                  onRename={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}
                  onDelete={() => deleteFolder.mutate(folder.id)}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  setRenamingId={setRenamingId}
                  onRenameSubmit={() => renameFolder.mutate({ id: folder.id, name: renameValue })}
                  projectCount={folderProjects.length}
                  isOverFolder={overFolderId === folder.id}
                >
                  {folderProjects.length > 0 && (
                    <div className="ml-4 pl-2 border-l border-border/20 space-y-0.5">
                      <SortableContext items={projIds} strategy={verticalListSortingStrategy}>
                        {folderProjects.map(project => (
                          <SortableProject key={project.id} project={project} isActive={currentProjectId === project.id} />
                        ))}
                      </SortableContext>
                    </div>
                  )}
                </SortableFolder>
              );
            })}

            {/* Unfoldered projects */}
            {unfolderedProjects.map(project => (
              <SortableProject key={project.id} project={project} isActive={currentProjectId === project.id} />
            ))}
          </SortableContext>
        </div>
      </div>

      <DragOverlay>
        {draggedProject && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs bg-card border shadow-lg">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{draggedProject.name}</span>
          </div>
        )}
        {draggedFolder && (
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm bg-card border shadow-lg">
            <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: draggedFolder.color || undefined }} />
            <span className="truncate text-xs">{draggedFolder.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
