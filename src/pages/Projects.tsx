import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { UnifiedViewToggle, type UnifiedViewMode } from '@/components/ui/unified-view-toggle';
import { InlineEditCell } from '@/components/shared/InlineEditCell';
import { FileAttachments } from '@/components/files/FileAttachments';
import { ProjectAISuggestions } from '@/components/projects/ProjectAISuggestions';
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

type ProjectStatus = 'tender' | 'active' | 'completed' | 'cancelled';

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
  created_at: string;
  client?: { name: string } | null;
}

interface FileContent {
  fileName: string;
  content: string;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<UnifiedViewMode>('card');
  const [dialogTab, setDialogTab] = useState('details');
  const [uploadedFiles, setUploadedFiles] = useState<FileContent[]>([]);
  const [tempProjectId, setTempProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const statuses: ProjectStatus[] = ['tender', 'active', 'completed', 'cancelled'];

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
      setProjects(data || []);
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

  // Subscribe to realtime updates
  useProjectsRealtime(fetchProjects);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [fetchProjects]);

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
        status: formData.status,
        budget: parseFloat(formData.budget) || 0,
        agency_fee_percentage: parseFloat(formData.agency_fee_percentage) || 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
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
        toast.success('Το έργο δημιουργήθηκε!');
        
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

      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Το έργο διαγράφηκε!');
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
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const styles = {
      tender: { className: 'bg-warning/10 text-warning border-warning/20', label: 'Διαγωνισμός' },
      active: { className: 'bg-success/10 text-success border-success/20', label: 'Ενεργό' },
      completed: { className: 'bg-primary/10 text-primary border-primary/20', label: 'Ολοκληρώθηκε' },
      cancelled: { className: 'bg-muted text-muted-foreground', label: 'Ακυρώθηκε' },
    };
    const style = styles[status];
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
      } catch (error) {
        console.error('Error updating project:', error);
        fetchProjects();
        toast.error('Σφάλμα κατά την ενημέρωση');
      }
    }
  };

  const ProjectCard = ({ project, isDragOverlay = false }: { project: Project; isDragOverlay?: boolean }) => (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        isDragOverlay && "shadow-xl rotate-2"
      )}
      onClick={() => !isDragOverlay && navigate(`/projects/${project.id}`)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0 cursor-grab" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h4 className="font-medium text-sm mb-1 line-clamp-2 flex-1">
                {project.name}
              </h4>
              {canManage && !isDragOverlay && (
                <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEdit(project)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDelete(project.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {project.client && (
              <p className="text-xs text-muted-foreground mb-2">
                {project.client.name}
              </p>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary font-medium">
                €{project.budget?.toLocaleString() || 0}
              </span>
              {project.end_date && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(project.end_date), 'd/M', { locale: el })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredProjects.map(project => (
        <Card 
          key={project.id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                {project.client && (
                  <CardDescription>{project.client.name}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(project.status)}
                {canManage && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <EditDeleteActions
                      onEdit={() => handleEdit(project)}
                      onDelete={() => handleDelete(project.id)}
                      itemName={`το έργο "${project.name}"`}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>€{project.budget?.toLocaleString() || 0}</span>
              </div>
              {project.end_date && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(project.end_date), 'd MMM', { locale: el })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Όνομα</TableHead>
            <TableHead>Πελάτης</TableHead>
            <TableHead>Κατάσταση</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Fee %</TableHead>
            <TableHead>Λήξη</TableHead>
            {canManage && <TableHead className="w-[100px]">Ενέργειες</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProjects.map(project => (
            <TableRow 
              key={project.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <InlineEditCell
                  value={project.name}
                  onSave={(val) => handleInlineUpdate(project.id, 'name', val)}
                />
              </TableCell>
              <TableCell>{project.client?.name || '-'}</TableCell>
              <TableCell>{getStatusBadge(project.status)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <InlineEditCell
                  value={project.budget}
                  type="number"
                  displayValue={`€${project.budget?.toLocaleString() || 0}`}
                  onSave={(val) => handleInlineUpdate(project.id, 'budget', val)}
                />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <InlineEditCell
                  value={project.agency_fee_percentage}
                  type="number"
                  displayValue={`${project.agency_fee_percentage || 0}%`}
                  onSave={(val) => handleInlineUpdate(project.id, 'agency_fee_percentage', val)}
                />
              </TableCell>
              <TableCell>
                {project.end_date 
                  ? format(new Date(project.end_date), 'd MMM yyyy', { locale: el })
                  : '-'
                }
              </TableCell>
              {canManage && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <EditDeleteActions
                    onEdit={() => handleEdit(project)}
                    onDelete={() => handleDelete(project.id)}
                    itemName={`το έργο "${project.name}"`}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const statusLabels: Record<ProjectStatus, string> = {
    tender: 'Διαγωνισμοί',
    active: 'Ενεργά',
    completed: 'Ολοκληρωμένα',
    cancelled: 'Ακυρωμένα'
  };

  const renderKanbanView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map(status => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              {getStatusBadge(status)}
              <Badge variant="secondary">{projectsByStatus[status].length}</Badge>
            </div>
            <DroppableColumn
              id={status}
              items={projectsByStatus[status].map(p => p.id)}
            >
              <div className="space-y-3">
                {projectsByStatus[status].map(project => (
                  <DraggableCard key={project.id} id={project.id}>
                    <ProjectCard project={project} />
                  </DraggableCard>
                ))}
                {projectsByStatus[status].length === 0 && (
                  <div className="border border-dashed rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FolderKanban className="h-8 w-8" />
            Έργα
          </h1>
          <p className="text-muted-foreground mt-1">
            Διαχείριση και παρακολούθηση έργων
          </p>
        </div>

        <div className="flex items-center gap-3">
          <UnifiedViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode}
          />

          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Νέο Έργο
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProject ? 'Επεξεργασία Έργου' : 'Δημιουργία Νέου Έργου'}</DialogTitle>
                  <DialogDescription>
                    {editingProject ? 'Ενημερώστε τα στοιχεία του έργου' : 'Συμπληρώστε τα στοιχεία και ανεβάστε αρχεία για AI ανάλυση'}
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={dialogTab} onValueChange={setDialogTab}>
                  <TabsList className="w-full">
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
                          <Select
                            value={formData.client_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Επιλέξτε πελάτη" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                              <SelectItem value="active">Ενεργό</SelectItem>
                              <SelectItem value="tender">Διαγωνισμός</SelectItem>
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση έργων..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν βρέθηκαν έργα</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Δοκιμάστε διαφορετικά φίλτρα αναζήτησης'
                : 'Δημιουργήστε το πρώτο σας έργο για να ξεκινήσετε'}
            </p>
            {canManage && !searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Νέο Έργο
              </Button>
            )}
          </CardContent>
        </Card>
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
