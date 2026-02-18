import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useProjectsRealtime } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UnifiedViewToggle, usePersistedViewMode, type UnifiedViewMode } from '@/components/ui/unified-view-toggle';
import { ClientSelector } from '@/components/shared/ClientSelector';
import { ProjectsTableView } from '@/components/projects/ProjectsTableView';
import { FileAttachments } from '@/components/files/FileAttachments';
import { ProjectAISuggestions } from '@/components/projects/ProjectAISuggestions';
import { useProjectTemplates } from '@/hooks/useProjectTemplates';
import { TemplatePreview } from '@/components/projects/TemplatePreview';
import { DynamicProjectFields } from '@/components/projects/DynamicProjectFields';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Calendar,
  DollarSign,
  Loader2,
  Paperclip,
  Sparkles,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DraggableCard } from '@/components/dnd/DraggableCard';
import { DroppableColumn } from '@/components/dnd/DroppableColumn';
import { cn } from '@/lib/utils';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { el } from 'date-fns/locale';

type ProjectStatus = 'lead' | 'proposal' | 'negotiation' | 'won' | 'active' | 'completed' | 'cancelled' | 'lost' | 'tender';

interface Project {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: ProjectStatus;
  budget: number;
  agency_fee_percentage: number;
  start_date: string | null;
  end_date: string | null;
  progress?: number | null;
  created_at: string;
  client?: { name: string } | null;
  taskStats?: { total: number; completed: number };
}

interface FileContent {
  fileName: string;
  content: string;
}

export default function ProjectsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const { logCreate, logUpdate, logDelete, logStatusChange } = useActivityLogger();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = usePersistedViewMode('projects', 'card');
  const [dialogTab, setDialogTab] = useState('details');
  const [uploadedFiles, setUploadedFiles] = useState<FileContent[]>([]);
  const [tempProjectId, setTempProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; project_type: string; default_budget: number; default_agency_fee_percentage: number }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [templateDeliverables, setTemplateDeliverables] = useState<any[]>([]);
  const [templateTasks, setTemplateTasks] = useState<any[]>([]);
  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<Set<string>>(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [projectMetadata, setProjectMetadata] = useState<Record<string, unknown>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { applyTemplate, applying: applyingTemplate } = useProjectTemplates();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const statuses: ProjectStatus[] = ['lead', 'proposal', 'negotiation', 'active', 'completed'];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    status: 'active' as ProjectStatus,
    budget: '',
    agency_fee_percentage: '30',
    start_date: '',
    end_date: '',
  });

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`*, client:clients(name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch task stats for each project
      const projectIds = (data || []).map(p => p.id);
      if (projectIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('project_id, status')
          .in('project_id', projectIds);

        const taskStatsMap: Record<string, { total: number; completed: number }> = {};
        (tasks || []).forEach(task => {
          if (!task.project_id) return;
          if (!taskStatsMap[task.project_id]) {
            taskStatsMap[task.project_id] = { total: 0, completed: 0 };
          }
          taskStatsMap[task.project_id].total++;
          if (task.status === 'completed') {
            taskStatsMap[task.project_id].completed++;
          }
        });

        setProjects((data || []).map(p => ({
          ...p,
          taskStats: taskStatsMap[p.id] || { total: 0, completed: 0 }
        })));
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Σφάλμα κατά τη φόρτωση έργων');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('project_templates')
      .select('id, name, project_type, default_budget, default_agency_fee_percentage')
      .eq('is_active', true)
      .order('sort_order');
    setTemplates(data || []);
  }, []);

  // Subscribe to realtime updates
  useProjectsRealtime(fetchProjects);

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchTemplates();
  }, [fetchProjects, fetchTemplates]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: FileContent[] = [];
    
    for (const file of Array.from(files)) {
      // Only process text-based files for AI analysis
      if (file.type.includes('text') || 
          file.name.endsWith('.txt') || 
          file.name.endsWith('.md') ||
          file.name.endsWith('.csv')) {
        const content = await file.text();
        newFiles.push({ fileName: file.name, content });
      } else if (file.type === 'application/pdf') {
        // For PDFs, we'll pass a placeholder - the AI edge function could be extended to parse PDFs
        newFiles.push({ 
          fileName: file.name, 
          content: `[PDF Document: ${file.name} - ${(file.size / 1024).toFixed(1)}KB]` 
        });
      } else {
        // Store other files as metadata only
        newFiles.push({ 
          fileName: file.name, 
          content: `[File: ${file.name} - ${file.type} - ${(file.size / 1024).toFixed(1)}KB]` 
        });
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${files.length} αρχείο(α) προστέθηκαν`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const projectData = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id || null,
        status: formData.status as 'active' | 'tender' | 'completed' | 'cancelled',
        budget: parseFloat(formData.budget) || 0,
        agency_fee_percentage: parseFloat(formData.agency_fee_percentage) || 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        metadata: (Object.keys(projectMetadata).length > 0 ? projectMetadata : {}) as Json,
      };

      if (editingProject) {
        const { data, error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)
          .select(`*, client:clients(name)`)
          .single();

        if (error) throw error;

        setProjects(prev => prev.map(p => p.id === editingProject.id ? data : p));
        toast.success('Το έργο ενημερώθηκε!');
        logUpdate('project', editingProject.id, formData.name);
        setDialogOpen(false);
        resetForm();
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select(`*, client:clients(name)`)
          .single();

        if (error) throw error;

        setProjects(prev => [data, ...prev]);
        
        // Apply template if selected
        if (selectedTemplateId && selectedTemplateId !== 'none') {
          await applyTemplate({
            projectId: data.id,
            templateId: selectedTemplateId,
            startDate: formData.start_date || undefined,
            selectedDeliverableIds: selectedDeliverableIds.size > 0 ? selectedDeliverableIds : undefined,
            selectedTaskIds: selectedTaskIds.size > 0 ? selectedTaskIds : undefined,
          });
        }

        toast.success('Το έργο δημιουργήθηκε!');
        logCreate('project', data.id, formData.name);
        
        // If we have uploaded files, set temp project ID for AI analysis
        if (uploadedFiles.length > 0) {
          setTempProjectId(data.id);
          setDialogTab('ai');
        } else {
          setDialogOpen(false);
          resetForm();
        }
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      client_id: project.client_id || '',
      status: project.status,
      budget: project.budget?.toString() || '',
      agency_fee_percentage: project.agency_fee_percentage?.toString() || '30',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
    });
    setDialogOpen(true);
    setDialogTab('details');
  };

  const handleDelete = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      const deletedProject = projects.find(p => p.id === projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Το έργο διαγράφηκε!');
      logDelete('project', projectId, deletedProject?.name);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Σφάλμα κατά τη διαγραφή. Ελέγξτε αν υπάρχουν συνδεδεμένα tasks ή invoices.');
    }
  };

  const handleInlineUpdate = async (projectId: string, field: string, value: string) => {
    try {
      let updateData: Record<string, unknown> = {};
      
      if (field === 'budget' || field === 'agency_fee_percentage') {
        updateData[field] = parseFloat(value) || 0;
      } else {
        updateData[field] = value || null;
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, ...updateData } : p
      ));
      toast.success('Ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const resetForm = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      client_id: '',
      status: 'active',
      budget: '',
      agency_fee_percentage: '30',
      start_date: '',
      end_date: '',
    });
    setUploadedFiles([]);
    setTempProjectId(null);
    setDialogTab('details');
    setSelectedTemplateId('none');
    setTemplateDeliverables([]);
    setTemplateTasks([]);
    setSelectedDeliverableIds(new Set());
    setSelectedTaskIds(new Set());
    setProjectMetadata({});
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const styles: Record<string, { className: string; label: string }> = {
      lead: { className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Lead' },
      proposal: { className: 'bg-warning/10 text-warning border-warning/20', label: 'Πρόταση' },
      negotiation: { className: 'bg-orange-500/10 text-orange-500 border-orange-500/20', label: 'Διαπραγμάτευση' },
      won: { className: 'bg-success/10 text-success border-success/20', label: 'Κερδήθηκε' },
      active: { className: 'bg-success/10 text-success border-success/20', label: 'Ενεργό' },
      completed: { className: 'bg-primary/10 text-primary border-primary/20', label: 'Ολοκληρώθηκε' },
      cancelled: { className: 'bg-muted text-muted-foreground', label: 'Ακυρώθηκε' },
      lost: { className: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Χάθηκε' },
      tender: { className: 'bg-warning/10 text-warning border-warning/20', label: 'Διαγωνισμός' },
    };
    const style = styles[status] || styles.lead;
    return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const projectsByStatus = useMemo(() => 
    statuses.reduce((acc, status) => {
      acc[status] = filteredProjects.filter(p => p.status === status);
      return acc;
    }, {} as Record<ProjectStatus, Project[]>)
  , [filteredProjects, statuses]);

  const canManage = isAdmin || isManager;

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find(p => p.id === event.active.id);
    setActiveProject(project || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedProject = projects.find(p => p.id === activeId);
    if (!draggedProject) return;

    if (statuses.includes(overId as ProjectStatus)) {
      if (draggedProject.status !== overId) {
        setProjects(prev => prev.map(p =>
          p.id === activeId ? { ...p, status: overId as ProjectStatus } : p
        ));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedProject = projects.find(p => p.id === activeId);
    if (!draggedProject) return;

    let targetStatus: ProjectStatus | null = null;

    if (statuses.includes(overId as ProjectStatus)) {
      targetStatus = overId as ProjectStatus;
    } else {
      const overProject = projects.find(p => p.id === overId);
      if (overProject) {
        targetStatus = overProject.status;
      }
    }

    if (targetStatus && draggedProject.status !== targetStatus) {
      try {
        const { error } = await supabase
          .from('projects')
          .update({ status: targetStatus })
          .eq('id', activeId);

        if (error) throw error;
        toast.success('Η κατάσταση ενημερώθηκε!');
        logStatusChange('project', activeId, draggedProject.name, draggedProject.status, targetStatus);
      } catch (error) {
        console.error('Error updating project:', error);
        fetchProjects();
        toast.error('Σφάλμα κατά την ενημέρωση');
      }
    }
  };

  const ProjectCard = ({ project, isDragOverlay = false }: { project: Project; isDragOverlay?: boolean }) => (
    <div 
      className={cn(
        "group bg-card rounded-xl border border-border/50 p-4 transition-all duration-200 ease-apple cursor-pointer",
        "hover:shadow-soft hover:border-border hover:-translate-y-0.5",
        isDragOverlay && "shadow-soft-xl rotate-1 scale-105"
      )}
      onClick={() => !isDragOverlay && navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 flex-shrink-0 cursor-grab transition-colors group-hover:text-muted-foreground/50" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm text-foreground/90 line-clamp-2 flex-1 group-hover:text-foreground transition-colors">
              {project.name}
            </h4>
            {canManage && !isDragOverlay && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-secondary" onClick={() => handleEdit(project)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(project.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {project.client && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              {project.client.name}
            </p>
          )}
          <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-border/30">
            <span className="text-primary font-semibold">
              €{project.budget?.toLocaleString() || 0}
            </span>
            {project.end_date && (
              <span className="flex items-center gap-1 text-muted-foreground/60">
                <Calendar className="h-3 w-3" />
                {format(new Date(project.end_date), 'd/M', { locale: el })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredProjects.map((project, index) => (
        <div 
          key={project.id} 
          className="group bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 ease-apple cursor-pointer hover:shadow-soft hover:border-border hover:-translate-y-0.5 animate-fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors line-clamp-1">
                  {project.name}
                </h3>
                {project.client && (
                  <p className="text-sm text-muted-foreground/70">{project.client.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(project.status)}
                {canManage && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <EditDeleteActions
                      onEdit={() => handleEdit(project)}
                      onDelete={() => handleDelete(project.id)}
                      itemName={`το έργο "${project.name}"`}
                    />
                  </div>
                )}
              </div>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground/60 line-clamp-2 mb-4">
                {project.description}
              </p>
            )}
          </div>
          <div className="px-5 py-3 bg-secondary/30 border-t border-border/30 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-primary font-semibold">
              <DollarSign className="h-4 w-4 opacity-60" />
              <span>€{project.budget?.toLocaleString() || 0}</span>
            </div>
            {project.end_date && (
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">{format(new Date(project.end_date), 'd MMM', { locale: el })}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <ProjectsTableView
      projects={filteredProjects}
      clients={clients}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onInlineUpdate={handleInlineUpdate}
      canManage={canManage}
    />
  );

  const statusLabels: Record<string, string> = {
    lead: 'Leads',
    proposal: 'Προτάσεις',
    negotiation: 'Διαπραγμάτευση',
    active: 'Ενεργά',
    completed: 'Ολοκληρωμένα',
    cancelled: 'Ακυρωμένα',
    lost: 'Χαμένα',
    won: 'Κερδήθηκαν',
    tender: 'Διαγωνισμοί',
  };

  const renderKanbanView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map((status, columnIndex) => (
          <div 
            key={status} 
            className="space-y-3 animate-fade-in"
            style={{ animationDelay: `${columnIndex * 50}ms` }}
          >
            <div className="flex items-center justify-between px-1">
              {getStatusBadge(status)}
              <span className="text-xs font-medium text-muted-foreground/60 bg-secondary/50 px-2 py-0.5 rounded-full">
                {projectsByStatus[status].length}
              </span>
            </div>
            <DroppableColumn
              id={status}
              items={projectsByStatus[status].map(p => p.id)}
            >
              <div className="space-y-3 min-h-[200px]">
                {projectsByStatus[status].map(project => (
                  <DraggableCard key={project.id} id={project.id}>
                    <ProjectCard project={project} />
                  </DraggableCard>
                ))}
                {projectsByStatus[status].length === 0 && (
                  <div className="border-2 border-dashed border-border/30 rounded-xl p-6 text-center transition-colors hover:border-border/50 hover:bg-secondary/20">
                    <p className="text-xs text-muted-foreground/50">
                      Σύρετε εδώ
                    </p>
                  </div>
                )}
              </div>
            </DroppableColumn>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 lg:p-8 space-y-6'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-primary" />
              </span>
              Έργα
            </h1>
            <p className="text-muted-foreground mt-1 text-sm ml-[52px]">
              Διαχείριση και παρακολούθηση έργων
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <UnifiedViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode}
          />

          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="shadow-soft">
                  <Plus className="h-4 w-4 mr-2" />
                  Νέο Έργο
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg">{editingProject ? 'Επεξεργασία Έργου' : 'Δημιουργία Νέου Έργου'}</DialogTitle>
                  <DialogDescription className="text-sm">
                    {editingProject ? 'Ενημερώστε τα στοιχεία του έργου' : 'Συμπληρώστε τα στοιχεία και ανεβάστε αρχεία για AI ανάλυση'}
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={dialogTab} onValueChange={setDialogTab}>
                  <TabsList className="w-full bg-secondary/50">
                    <TabsTrigger value="details" className="flex-1">Στοιχεία</TabsTrigger>
                    <TabsTrigger value="files" className="flex-1">
                      <Paperclip className="h-4 w-4 mr-1" /> Αρχεία
                    </TabsTrigger>
                    {(uploadedFiles.length > 0 || tempProjectId) && (
                      <TabsTrigger value="ai" className="flex-1">
                        <Sparkles className="h-4 w-4 mr-1" /> AI
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="details" className="mt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Template Selector - only for new projects */}
                      {!editingProject && templates.length > 0 && (
                        <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                          <Label>Template Έργου</Label>
                          <Select
                            value={selectedTemplateId}
                            onValueChange={async (value) => {
                              setSelectedTemplateId(value);
                              if (value !== 'none') {
                                const tpl = templates.find(t => t.id === value);
                                if (tpl) {
                                  setFormData(prev => ({
                                    ...prev,
                                    budget: tpl.default_budget ? tpl.default_budget.toString() : prev.budget,
                                    agency_fee_percentage: tpl.default_agency_fee_percentage ? tpl.default_agency_fee_percentage.toString() : prev.agency_fee_percentage,
                                  }));
                                  // Fetch template content
                                  const [{ data: dels }, { data: tsks }] = await Promise.all([
                                    supabase.from('project_template_deliverables').select('*').eq('template_id', value).order('sort_order'),
                                    supabase.from('project_template_tasks').select('*').eq('template_id', value).order('sort_order'),
                                  ]);
                                  setTemplateDeliverables(dels || []);
                                  setTemplateTasks(tsks || []);
                                  setSelectedDeliverableIds(new Set((dels || []).map((d: any) => d.id)));
                                  setSelectedTaskIds(new Set((tsks || []).map((t: any) => t.id)));
                                }
                              } else {
                                setTemplateDeliverables([]);
                                setTemplateTasks([]);
                                setSelectedDeliverableIds(new Set());
                                setSelectedTaskIds(new Set());
                                setProjectMetadata({});
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Χωρίς template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Χωρίς template</SelectItem>
                              {templates.map(tpl => (
                                <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Template Preview */}
                          {selectedTemplateId !== 'none' && (templateDeliverables.length > 0 || templateTasks.length > 0) && (
                            <TemplatePreview
                              deliverables={templateDeliverables}
                              tasks={templateTasks}
                              selectedDeliverableIds={selectedDeliverableIds}
                              selectedTaskIds={selectedTaskIds}
                              onToggleDeliverable={(id) => {
                                setSelectedDeliverableIds(prev => {
                                  const next = new Set(prev);
                                  next.has(id) ? next.delete(id) : next.add(id);
                                  return next;
                                });
                              }}
                              onToggleTask={(id) => {
                                setSelectedTaskIds(prev => {
                                  const next = new Set(prev);
                                  next.has(id) ? next.delete(id) : next.add(id);
                                  return next;
                                });
                              }}
                            />
                          )}

                          {/* Dynamic Fields */}
                          {selectedTemplateId !== 'none' && (() => {
                            const tpl = templates.find(t => t.id === selectedTemplateId);
                            return tpl ? (
                              <DynamicProjectFields
                                projectType={tpl.project_type}
                                metadata={projectMetadata}
                                onChange={setProjectMetadata}
                              />
                            ) : null;
                          })()}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="name">Όνομα Έργου *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="π.χ. Digital Campaign 2026"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Περιγραφή</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Σύντομη περιγραφή του έργου..."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="client">Πελάτης</Label>
                          <ClientSelector
                            value={formData.client_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                            clients={clients}
                            onClientCreated={(newClient) => {
                              setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
                            }}
                            placeholder="Επιλέξτε πελάτη"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status">Κατάσταση</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as ProjectStatus }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="proposal">Πρόταση</SelectItem>
                              <SelectItem value="negotiation">Διαπραγμάτευση</SelectItem>
                              <SelectItem value="active">Ενεργό</SelectItem>
                              <SelectItem value="completed">Ολοκληρώθηκε</SelectItem>
                              <SelectItem value="cancelled">Ακυρώθηκε</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="budget">Budget (€)</Label>
                          <Input
                            id="budget"
                            type="number"
                            value={formData.budget}
                            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fee">Agency Fee (%)</Label>
                          <Input
                            id="fee"
                            type="number"
                            value={formData.agency_fee_percentage}
                            onChange={(e) => setFormData(prev => ({ ...prev, agency_fee_percentage: e.target.value }))}
                            placeholder="30"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start_date">Ημ/νία Έναρξης</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="end_date">Ημ/νία Λήξης</Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                          Ακύρωση
                        </Button>
                        <Button type="submit" disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {editingProject ? 'Αποθήκευση' : 'Δημιουργία'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </TabsContent>

                  <TabsContent value="files" className="mt-4 space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".txt,.md,.csv,.pdf,.doc,.docx"
                      />
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <h3 className="font-medium mb-1">Ανέβασμα αρχείων για AI ανάλυση</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Υποστηρίζονται: TXT, MD, CSV, PDF
                      </p>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-4 w-4 mr-2" />
                        Επιλογή αρχείων
                      </Button>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Αρχεία για ανάλυση ({uploadedFiles.length})</p>
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <span className="text-sm truncate">{file.fileName}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {editingProject && (
                      <div className="pt-4 border-t">
                        <h3 className="font-medium mb-3">Αρχεία Έργου</h3>
                        <FileAttachments projectId={editingProject.id} />
                      </div>
                    )}
                  </TabsContent>

                  {(uploadedFiles.length > 0 || tempProjectId) && (
                    <TabsContent value="ai" className="mt-4">
                      <ProjectAISuggestions
                        projectId={tempProjectId || editingProject?.id || ''}
                        projectName={formData.name}
                        projectBudget={parseFloat(formData.budget) || undefined}
                        files={uploadedFiles}
                        onSuggestionsApplied={() => {
                          setDialogOpen(false);
                          resetForm();
                          fetchProjects();
                        }}
                        onProjectDetailsUpdate={(details) => {
                          setFormData(prev => ({
                            ...prev,
                            description: details.description || prev.description,
                            start_date: details.start_date || prev.start_date,
                            end_date: details.end_date || prev.end_date,
                            budget: details.budget?.toString() || prev.budget,
                          }));
                        }}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Αναζήτηση έργων..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/50 focus:border-primary/30"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card border-border/50">
            <SelectValue placeholder="Κατάσταση" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα</SelectItem>
            <SelectItem value="active">Ενεργά</SelectItem>
            <SelectItem value="tender">Διαγωνισμοί</SelectItem>
            <SelectItem value="completed">Ολοκληρωμένα</SelectItem>
            <SelectItem value="cancelled">Ακυρωμένα</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid/Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground mt-3">Φόρτωση...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card py-16 animate-fade-in shadow-soft">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Δεν βρέθηκαν έργα</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Δοκιμάστε διαφορετικά φίλτρα αναζήτησης'
                : 'Δημιουργήστε το πρώτο σας έργο για να ξεκινήσετε'}
            </p>
            {canManage && !searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setDialogOpen(true)} className="shadow-soft">
                <Plus className="h-4 w-4 mr-2" />
                Νέο Έργο
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'card' && renderCardView()}
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'kanban' && renderKanbanView()}
        </>
      )}
    </div>
  );
}
