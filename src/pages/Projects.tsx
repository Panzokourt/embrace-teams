import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useProjectsRealtime } from '@/hooks/useRealtimeSubscription';
import { ProjectAIAnalysisInline } from '@/components/projects/ProjectAIAnalysisInline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UnifiedViewToggle, usePersistedViewMode } from '@/components/ui/unified-view-toggle';
import { ClientSelector } from '@/components/shared/ClientSelector';
import { ProjectsTableView } from '@/components/projects/ProjectsTableView';
import { ProjectGanttView } from '@/components/projects/ProjectGanttView';
import { useProjectTemplates } from '@/hooks/useProjectTemplates';
import { PageHeader } from '@/components/shared/PageHeader';
import { TemplatePreview } from '@/components/projects/TemplatePreview';
import { DynamicProjectFields } from '@/components/projects/DynamicProjectFields';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import {
  FolderKanban, Plus, Search, Calendar, DollarSign, Loader2,
  Paperclip, Sparkles, Upload, Building2, Users2,
  Circle, Clock, AlertCircle, CheckCircle2, XCircle, Handshake,
} from 'lucide-react';
import { AIFillButton } from '@/components/shared/AIFillButton';
import { format } from 'date-fns';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent,
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
  client?: { name: string; sector?: string | null } | null;
  taskStats?: { total: number; completed: number };
  project_lead_id?: string | null;
  account_manager_id?: string | null;
  is_internal?: boolean;
  parent_project_id?: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

export default function ProjectsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { isAdmin, isManager, company, user } = useAuth();
  const { logCreate, logUpdate, logDelete, logStatusChange } = useActivityLogger();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; sector?: string | null }[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = usePersistedViewMode('projects', 'table');
  const [wizardStep, setWizardStep] = useState<'setup' | 'ai'>('setup');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [uploadedFileObjects, setUploadedFileObjects] = useState<File[]>([]);
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const statuses: ProjectStatus[] = ['lead', 'proposal', 'negotiation', 'active', 'completed'];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    status: 'active' as ProjectStatus,
    budget: '',
    start_date: '',
    end_date: '',
    is_internal: false,
    parent_project_id: '',
  });

  const fetchProjects = useCallback(async () => {
    try {
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      pagination.setTotalCount(count || 0);

      const { data, error } = await supabase
        .from('projects')
        .select(`*, client:clients(name, sector)`)
        .order('created_at', { ascending: false })
        .range(pagination.from, pagination.to);

      if (error) throw error;

      const projectIds = (data || []).map(p => p.id);
      if (projectIds.length > 0) {
        const { data: tasks } = await supabase.from('tasks').select('project_id, status').in('project_id', projectIds);
        const taskStatsMap: Record<string, { total: number; completed: number }> = {};
        (tasks || []).forEach(task => {
          if (!task.project_id) return;
          if (!taskStatsMap[task.project_id]) taskStatsMap[task.project_id] = { total: 0, completed: 0 };
          taskStatsMap[task.project_id].total++;
          if (task.status === 'completed') taskStatsMap[task.project_id].completed++;
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
  }, [pagination.from, pagination.to]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('id, name, sector').order('name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, avatar_url').order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  useProjectsRealtime(fetchProjects);

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchUsers();
    fetchTemplates();
  }, [fetchProjects, fetchTemplates]);

  // Parent project options: same client's projects
  const parentProjectOptions = useMemo(() => {
    if (formData.is_internal) {
      return projects.filter(p => (p as any).is_internal && (!editingProject || p.id !== editingProject.id));
    }
    if (!formData.client_id) return [];
    return projects.filter(p => p.client_id === formData.client_id && (!editingProject || p.id !== editingProject.id));
  }, [formData.client_id, formData.is_internal, projects, editingProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const projectData: any = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.is_internal ? null : (formData.client_id || null),
        status: formData.status as 'active' | 'tender' | 'completed' | 'cancelled',
        budget: parseFloat(formData.budget) || 0,
        agency_fee_percentage: 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        metadata: (Object.keys(projectMetadata).length > 0 ? projectMetadata : {}) as Json,
        is_internal: formData.is_internal,
        parent_project_id: formData.parent_project_id || null,
      };
      if (!editingProject && company) {
        projectData.company_id = company.id;
        projectData.created_by = user?.id || null;
      }

      if (editingProject) {
        const { data, error } = await supabase.from('projects').update(projectData).eq('id', editingProject.id).select(`*, client:clients(name, sector)`).single();
        if (error) throw error;
        setProjects(prev => prev.map(p => p.id === editingProject.id ? data : p));
        toast.success('Το έργο ενημερώθηκε!');
        logUpdate('project', editingProject.id, formData.name);
        setDialogOpen(false);
        resetForm();
      } else {
        const { data, error } = await supabase.from('projects').insert(projectData).select(`*, client:clients(name, sector)`).single();
        if (error) throw error;
        setProjects(prev => [data, ...prev]);
        if (selectedTemplateId && selectedTemplateId !== 'none') {
          await applyTemplate({
            projectId: data.id, templateId: selectedTemplateId,
            startDate: formData.start_date || undefined,
            selectedDeliverableIds: selectedDeliverableIds.size > 0 ? selectedDeliverableIds : undefined,
            selectedTaskIds: selectedTaskIds.size > 0 ? selectedTaskIds : undefined,
          });
        }
        toast.success('Το έργο δημιουργήθηκε!');
        logCreate('project', data.id, formData.name);

        // Upload files to storage if any
        if (uploadedFileObjects.length > 0) {
          setCreatedProjectId(data.id);
          for (const file of uploadedFileObjects) {
            const filePath = `${data.id}/${Date.now()}_${file.name}`;
            await supabase.storage.from('project-files').upload(filePath, file);
            await supabase.from('file_attachments').insert({
              project_id: data.id,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
            });
          }
          // Go to step 2 for AI analysis
          setWizardStep('ai');
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
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      is_internal: (project as any).is_internal || false,
      parent_project_id: (project as any).parent_project_id || '',
    });
    setDialogOpen(true);
    setWizardStep('setup');
  };

  const handleDelete = async (projectId: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
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

  const handleInlineUpdate = async (projectId: string, field: string, value: string | number | null) => {
    try {
      let updateData: Record<string, unknown> = {};
      if (field === 'budget' || field === 'agency_fee_percentage') {
        updateData[field] = parseFloat(String(value)) || 0;
      } else {
        updateData[field] = value || null;
      }
      const { error } = await supabase.from('projects').update(updateData).eq('id', projectId);
      if (error) throw error;
      if (field === 'client_id') {
        fetchProjects();
      } else {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updateData } : p));
      }
      toast.success('Ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const resetForm = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', client_id: '', status: 'active', budget: '', start_date: '', end_date: '', is_internal: false, parent_project_id: '' });
    setUploadedFileObjects([]); setCreatedProjectId(null); setWizardStep('setup');
    setSelectedTemplateId('none'); setTemplateDeliverables([]); setTemplateTasks([]);
    setSelectedDeliverableIds(new Set()); setSelectedTaskIds(new Set()); setProjectMetadata({});
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const styles: Record<string, { className: string; label: string }> = {
      lead: { className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Lead' },
      proposal: { className: 'bg-warning/10 text-warning border-warning/20', label: 'Πρόταση' },
      negotiation: { className: 'bg-orange-500/10 text-orange-500 border-orange-500/20', label: 'Διαπραγμάτευση' },
      won: { className: 'bg-success/10 text-success border-success/20', label: 'Κερδήθηκε' },
      active: { className: 'bg-success/10 text-success border-success/20', label: 'Ενεργό' },
      completed: { className: 'bg-foreground/10 text-foreground border-foreground/20', label: 'Ολοκληρώθηκε' },
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
        setProjects(prev => prev.map(p => p.id === activeId ? { ...p, status: overId as ProjectStatus } : p));
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
    if (statuses.includes(overId as ProjectStatus)) { targetStatus = overId as ProjectStatus; }
    else {
      const overProject = projects.find(p => p.id === overId);
      if (overProject) targetStatus = overProject.status;
    }
    if (targetStatus && draggedProject.status !== targetStatus) {
      try {
        const { error } = await supabase.from('projects').update({ status: targetStatus }).eq('id', activeId);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadedFileObjects(prev => [...prev, ...Array.from(files)]);
    toast.success(`${files.length} αρχείο(α) προστέθηκαν`);
  };

  const ProjectCard = ({ project, isDragOverlay = false }: { project: Project; isDragOverlay?: boolean }) => (
    <div 
      className={cn(
        "group/card bg-card rounded-lg border border-border/50 transition-all duration-200 cursor-pointer overflow-hidden",
        isDragOverlay && "shadow-lg rotate-1 scale-105"
      )}
      onClick={() => !isDragOverlay && navigate(`/projects/${project.id}`)}
    >
      {/* Compact default view */}
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0 cursor-grab" />
        <p className="text-xs font-medium truncate flex-1">{project.name}</p>
      </div>
      {/* Expanded on hover */}
      <div className="max-h-0 group-hover/card:max-h-40 overflow-hidden transition-all duration-200 ease-in-out opacity-0 group-hover/card:opacity-100">
        <div className="px-2.5 pb-2 pt-0.5 space-y-1.5 border-t border-border/30">
          {project.client && (
            <p className="text-[10px] text-muted-foreground truncate">{project.client.name}</p>
          )}
          {(project as any).is_internal && (
            <Badge variant="outline" className="text-[9px] bg-muted/50">Internal</Badge>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-foreground">€{project.budget?.toLocaleString() || 0}</span>
            {project.end_date && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {format(new Date(project.end_date), 'd/M', { locale: el })}
              </span>
            )}
          </div>
          {canManage && !isDragOverlay && (
            <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEdit(project)}><Pencil className="h-2.5 w-2.5" /></Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/70" onClick={() => handleDelete(project.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredProjects.map((project, index) => (
        <div key={project.id} className="group bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 ease-apple cursor-pointer hover:shadow-soft hover:border-border hover:-translate-y-0.5 animate-fade-in" style={{ animationDelay: `${index * 30}ms` }} onClick={() => navigate(`/projects/${project.id}`)}>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors line-clamp-1">{project.name}</h3>
                {project.client && <p className="text-sm text-muted-foreground/70">{project.client.name}</p>}
                {(project as any).is_internal && (
                  <Badge variant="outline" className="text-[10px] bg-muted/50">Internal</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(project.status)}
                {canManage && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <EditDeleteActions onEdit={() => handleEdit(project)} onDelete={() => handleDelete(project.id)} itemName={`το έργο "${project.name}"`} />
                  </div>
                )}
              </div>
            </div>
            {project.description && <p className="text-sm text-muted-foreground/60 line-clamp-2 mb-4">{project.description}</p>}
          </div>
          <div className="px-5 py-3 bg-secondary/30 border-t border-border/30 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
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
      users={users}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onInlineUpdate={handleInlineUpdate}
      canManage={canManage}
    />
  );

  const renderGanttView = () => (
    <ProjectGanttView
      projects={filteredProjects}
      onProjectUpdated={fetchProjects}
    />
  );

  const projectKanbanColumns = [
    { id: 'lead' as ProjectStatus, label: 'Lead', icon: <Circle className="h-5 w-5" />, color: 'hsl(210, 80%, 55%)' },
    { id: 'proposal' as ProjectStatus, label: 'Πρόταση', icon: <AlertCircle className="h-5 w-5" />, color: 'hsl(38, 92%, 50%)' },
    { id: 'negotiation' as ProjectStatus, label: 'Διαπραγμάτευση', icon: <Handshake className="h-5 w-5" />, color: 'hsl(25, 95%, 53%)' },
    { id: 'active' as ProjectStatus, label: 'Ενεργό', icon: <Clock className="h-5 w-5" />, color: 'hsl(142, 71%, 45%)' },
    { id: 'completed' as ProjectStatus, label: 'Ολοκληρώθηκε', icon: <CheckCircle2 className="h-5 w-5" />, color: 'hsl(var(--foreground))' },
  ];

  const renderKanbanView = () => (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {projectKanbanColumns.map(column => (
          <div key={column.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span style={{ color: column.color }}>{column.icon}</span>
              <h3 className="font-semibold text-sm" style={{ color: column.color }}>
                {column.label}
              </h3>
              <Badge variant="secondary" className="text-xs min-w-[22px] justify-center">
                {projectsByStatus[column.id]?.length || 0}
              </Badge>
            </div>
            <DroppableColumn id={column.id} items={(projectsByStatus[column.id] || []).map(p => p.id)}>
              <div className="space-y-2.5">
                {(projectsByStatus[column.id] || []).map(project => (
                  <DraggableCard key={project.id} id={project.id}><ProjectCard project={project} /></DraggableCard>
                ))}
                {(projectsByStatus[column.id] || []).length === 0 && (
                  <div className="border border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm">
                    Σύρετε εδώ
                  </div>
                )}
              </div>
            </DroppableColumn>
          </div>
        ))}
      </div>
      <DragOverlay>{activeProject ? <ProjectCard project={activeProject} isDragOverlay /> : null}</DragOverlay>
    </DndContext>
  );

  // AI Analysis step uses inline component
  const renderAIStep = (projectId: string) => (
    <ProjectAIAnalysisInline
      projectId={projectId}
      projectName={formData.name}
      projectBudget={parseFloat(formData.budget) || undefined}
      initialFiles={uploadedFileObjects}
      allowUpload={true}
      onDone={() => {
        setDialogOpen(false);
        resetForm();
        navigate(`/projects/${projectId}`);
      }}
      onProjectDetailsUpdate={(details) => {
        // Update project in DB directly
        supabase.from('projects').update(details).eq('id', projectId).then(() => {
          toast.info('Τα στοιχεία έργου ενημερώθηκαν');
        });
      }}
    />
  );

  return (
    <div className={embedded ? 'space-y-6' : 'page-shell'}>
      {/* Header */}
      <PageHeader
        icon={FolderKanban}
        title="Έργα"
        subtitle="Διαχείριση και παρακολούθηση έργων"
        breadcrumbs={[{ label: 'Εργασία', href: '/work' }, { label: 'Έργα' }]}
        actions={
          <div className="flex items-center gap-3">
            <UnifiedViewToggle viewMode={viewMode} onViewModeChange={setViewMode} showCards showGantt />
            {canManage && (
              <Button className="shadow-soft" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Νέο Έργο
              </Button>
            )}
          </div>
        }
      />

      {/* Project Create/Edit Dialog - 2-step wizard */}
      {canManage && (
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingProject ? 'Επεξεργασία Έργου' :
                  wizardStep === 'ai' ? 'AI Ανάλυση Αρχείων' : 'Δημιουργία Νέου Έργου'}
              </DialogTitle>
              {wizardStep === 'setup' && (
                <DialogDescription className="text-sm">
                  {editingProject ? 'Ενημερώστε τα στοιχεία του έργου' : 'Συμπληρώστε τα στοιχεία, επιλέξτε αρχεία και δημιουργήστε'}
                </DialogDescription>
              )}
            </DialogHeader>

            {wizardStep === 'setup' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Internal vs Client toggle */}
                {!editingProject && (
                  <div className="p-3 rounded-xl border border-border/50 bg-secondary/20">
                    <Label className="text-xs text-muted-foreground mb-2 block">Τύπος Έργου</Label>
                    <RadioGroup
                      value={formData.is_internal ? 'internal' : 'client'}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, is_internal: v === 'internal', client_id: v === 'internal' ? '' : prev.client_id }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="client" id="type-client" />
                        <Label htmlFor="type-client" className="text-sm cursor-pointer flex items-center gap-1.5">
                          <Users2 className="h-3.5 w-3.5" /> Έργο Πελάτη
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="internal" id="type-internal" />
                        <Label htmlFor="type-internal" className="text-sm cursor-pointer flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" /> Εσωτερικό Έργο
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Template */}
                {!editingProject && templates.length > 0 && (
                  <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <Label>Template Έργου</Label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={async (value) => {
                        setSelectedTemplateId(value);
                        if (value !== 'none') {
                          const tmpl = templates.find(t => t.id === value);
                          if (tmpl) {
                            setFormData(prev => ({
                              ...prev,
                              budget: tmpl.default_budget?.toString() || prev.budget,
                            }));
                          }
                          const { data: delData } = await supabase.from('project_template_deliverables').select('*').eq('template_id', value).order('sort_order');
                          setTemplateDeliverables(delData || []);
                          setSelectedDeliverableIds(new Set((delData || []).map((d: any) => d.id)));
                          const { data: taskData } = await supabase.from('project_template_tasks').select('*').eq('template_id', value).order('sort_order');
                          setTemplateTasks(taskData || []);
                          setSelectedTaskIds(new Set((taskData || []).map((t: any) => t.id)));
                        } else {
                          setTemplateDeliverables([]); setTemplateTasks([]);
                          setSelectedDeliverableIds(new Set()); setSelectedTaskIds(new Set());
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Χωρίς template" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Χωρίς template</SelectItem>
                        {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedTemplateId !== 'none' && (
                      <TemplatePreview
                        deliverables={templateDeliverables} tasks={templateTasks}
                        selectedDeliverableIds={selectedDeliverableIds} selectedTaskIds={selectedTaskIds}
                        onToggleDeliverable={(id) => { setSelectedDeliverableIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }}
                        onToggleTask={(id) => { setSelectedTaskIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }}
                      />
                    )}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {/* AI Fill */}
                  {!editingProject && (
                    <div className="md:col-span-2">
                      <AIFillButton
                        formType="project"
                        onFill={(data) => {
                          setFormData(prev => ({
                            ...prev,
                            name: data.name || prev.name,
                            description: data.description || prev.description,
                            budget: data.budget?.toString() || prev.budget,
                            status: data.status || prev.status,
                          }));
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Όνομα Έργου *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="π.χ. Website Redesign" required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Περιγραφή</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Σύντομη περιγραφή του έργου..." rows={3} />
                  </div>
                  
                  {/* Client selector - only for client projects */}
                  {!formData.is_internal && (
                    <div className="space-y-2">
                      <Label>Πελάτης {!formData.is_internal && '*'}</Label>
                      <ClientSelector clients={clients} value={formData.client_id} onValueChange={(val) => setFormData(prev => ({ ...prev, client_id: val }))} onClientCreated={(c) => setClients(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name, 'el', { numeric: true, sensitivity: 'base' })))} />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Κατάσταση</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({ ...prev, status: val as ProjectStatus }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="proposal">Πρόταση</SelectItem>
                        <SelectItem value="negotiation">Διαπραγμάτευση</SelectItem>
                        <SelectItem value="active">Ενεργό</SelectItem>
                        <SelectItem value="completed">Ολοκληρωμένο</SelectItem>
                        <SelectItem value="cancelled">Ακυρωμένο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (€)</Label>
                    <Input id="budget" type="number" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))} placeholder="0" />
                  </div>

                  {/* Parent project selector */}
                  <div className="space-y-2">
                    <Label>Γονικό Έργο (υπό-έργο)</Label>
                    <Select value={formData.parent_project_id || 'none'} onValueChange={(val) => setFormData(prev => ({ ...prev, parent_project_id: val === 'none' ? '' : val }))}>
                      <SelectTrigger><SelectValue placeholder="Κανένα" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Κανένα</SelectItem>
                        {parentProjectOptions.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Ημ. Έναρξης</Label>
                    <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Ημ. Λήξης</Label>
                    <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} />
                  </div>
                </div>

                <DynamicProjectFields projectType={formData.status} metadata={projectMetadata} onChange={setProjectMetadata} />

                {/* File upload zone */}
                {!editingProject && (
                  <div className="space-y-2">
                    <Label>Αρχεία (προαιρετικό)</Label>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept=".txt,.md,.csv,.pdf,.doc,.docx,.xls,.xlsx,.pptx" />
                    <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadedFileObjects.length > 0 ? `${uploadedFileObjects.length} αρχείο(α) επιλεγμένα` : 'Επιλογή Αρχείων'}
                    </Button>
                    {uploadedFileObjects.length > 0 && (
                      <div className="space-y-1">
                        {uploadedFileObjects.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 text-sm">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate flex-1 text-xs">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)}KB</span>
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => setUploadedFileObjects(prev => prev.filter((_, i) => i !== index))}>×</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button type="submit" disabled={saving || !formData.name || (!formData.is_internal && !editingProject && !formData.client_id)}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingProject ? 'Ενημέρωση' : 'Δημιουργία'}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              /* Step 2: AI Analysis - inline */
              createdProjectId && renderAIStep(createdProjectId)
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input placeholder="Αναζήτηση έργων..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-card border-border/50 focus:border-primary/30" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card border-border/50"><SelectValue placeholder="Κατάσταση" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα</SelectItem>
            <SelectItem value="active">Ενεργά</SelectItem>
            <SelectItem value="tender">Διαγωνισμοί</SelectItem>
            <SelectItem value="completed">Ολοκληρωμένα</SelectItem>
            <SelectItem value="cancelled">Ακυρωμένα</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid/Table/Gantt */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-foreground/60" />
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
              {searchQuery || statusFilter !== 'all' ? 'Δοκιμάστε διαφορετικά φίλτρα αναζήτησης' : 'Δημιουργήστε το πρώτο σας έργο για να ξεκινήσετε'}
            </p>
            {canManage && !searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setDialogOpen(true)} className="shadow-soft">
                <Plus className="h-4 w-4 mr-2" />Νέο Έργο
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'card' && renderCardView()}
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'gantt' && renderGanttView()}
          {viewMode === 'kanban' && renderKanbanView()}
        </>
      )}
      <PaginationControls pagination={pagination} />
    </div>
  );
}
