import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDeliverablesTable } from '@/components/projects/ProjectDeliverablesTable';
import TasksPage from '@/pages/Tasks';
import { ProjectFinancialsHub } from '@/components/projects/ProjectFinancialsHub';
import { ProjectCreatives } from '@/components/projects/ProjectCreatives';
import { ProjectMediaPlan } from '@/components/projects/ProjectMediaPlan';
import { ProjectAISuggestions } from '@/components/projects/ProjectAISuggestions';
import { ProjectTeamManager } from '@/components/projects/ProjectTeamManager';
import { FileExplorer } from '@/components/files/FileExplorer';
import { ProjectCommentsAndHistory } from '@/components/projects/ProjectCommentsAndHistory';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  Upload,
  Megaphone,
  Palette,
  FolderInput,
  Timer,
  Plus,
  ChevronDown,
  ListChecks,
  FileText,
  MessageSquare,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  client?: { name: string } | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
}

interface Deliverable {
  id: string;
  name: string;
  completed: boolean;
  budget: number | null;
  cost: number | null;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company, isAdmin, isManager, isClient, hasPermission } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [editingFee, setEditingFee] = useState(false);
  const [feeDraft, setFeeDraft] = useState('');

  // Folders query
  const { data: folders = [] } = useQuery({
    queryKey: ['project-folders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('project_folders')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Total tracked time query
  const { data: totalTrackedMinutes = 0 } = useQuery({
    queryKey: ['project-total-time', id],
    queryFn: async () => {
      if (!id) return 0;
      const { data } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('project_id', id)
        .eq('is_running', false);
      return (data || []).reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    },
    enabled: !!id,
  });

  // AI Analysis state
  const [aiFiles, setAiFiles] = useState<Array<{ fileName: string; content: string }>>([]);
  const [aiRawFiles, setAiRawFiles] = useState<File[]>([]);
  const [aiOpen, setAiOpen] = useState(false);

  const { parsing: uploadingForAi, parseFiles } = useDocumentParser({
    saveToStorage: true,
    projectId: id,
    onSuccess: (parsedFiles) => {
      setAiFiles(prev => [...prev, ...parsedFiles.map(f => ({
        fileName: f.fileName,
        content: f.content
      }))]);
    }
  });

  const canViewFinancials = isAdmin || isManager;
  const canEdit = isAdmin || isManager || hasPermission('projects.edit');

  useEffect(() => {
    if (id) fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    if (!id) return;
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, client:clients(name)')
        .eq('id', id)
        .single();
      if (projectError) throw projectError;
      setProject(projectData);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, assigned_to')
        .eq('project_id', id)
        .order('due_date', { ascending: true, nullsFirst: false });
      setTasks(tasksData || []);

      const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select('id, name, completed, budget, cost')
        .eq('project_id', id);
      setDeliverables(deliverablesData || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Σφάλμα κατά τη φόρτωση του έργου');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAiRawFiles(prev => [...prev, ...Array.from(files)]);
    const parsed = await parseFiles(files);
    if (parsed.length > 0) toast.success(`${parsed.length} αρχείο(α) αναλύθηκαν`);
    e.target.value = '';
  };

  const saveAiFilesToStorage = async () => {
    if (!id || !user || aiRawFiles.length === 0) return;
    try {
      for (const file of aiRawFiles) {
        const fileName = createProjectFilesObjectKey({ userId: user.id, originalName: file.name, prefix: `projects/${id}` });
        const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);
        if (uploadError) { console.error('Error uploading file:', uploadError); continue; }
        await supabase.from('file_attachments').insert({
          file_name: file.name, file_path: fileName, file_size: file.size,
          content_type: file.type, uploaded_by: user.id, project_id: id,
        });
      }
    } catch (error) { console.error('Error saving files:', error); }
  };

  const handleSuggestionsApplied = useCallback(async () => {
    await saveAiFilesToStorage();
    setAiFiles([]);
    setAiRawFiles([]);
    fetchProjectData();
  }, [id, user, aiRawFiles]);

  const updateProjectField = async (field: string, value: any) => {
    if (!project) return;
    try {
      const { error } = await supabase.from('projects').update({ [field]: value }).eq('id', project.id);
      if (error) throw error;
      toast.success('Ενημερώθηκε!');
      fetchProjectData();
    } catch { toast.error('Σφάλμα κατά την ενημέρωση'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Το έργο δεν βρέθηκε</p>
        <Button variant="link" onClick={() => navigate('/projects')}>Επιστροφή στα έργα</Button>
      </div>
    );
  }

  // Stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const completedDeliverables = deliverables.filter(d => d.completed).length;
  const deliverableProgress = deliverables.length > 0 ? Math.round((completedDeliverables / deliverables.length) * 100) : 0;
  const overallProgress = Math.round((taskProgress + deliverableProgress) / 2);
  const totalTrackedHours = Math.round((totalTrackedMinutes / 60) * 10) / 10;

  const getStatusConfig = (status: ProjectStatus) => {
    const configs: Record<string, { className: string; label: string }> = {
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
    return configs[status] || configs.lead;
  };

  const statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'lead', label: 'Lead' },
    { value: 'proposal', label: 'Πρόταση' },
    { value: 'negotiation', label: 'Διαπραγμάτευση' },
    { value: 'won', label: 'Κερδήθηκε' },
    { value: 'active', label: 'Ενεργό' },
    { value: 'completed', label: 'Ολοκληρώθηκε' },
    { value: 'cancelled', label: 'Ακυρώθηκε' },
    { value: 'lost', label: 'Χάθηκε' },
  ];

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
      if (error) throw error;
      toast.success('Η κατάσταση ενημερώθηκε!');
      fetchProjectData();
    } catch { toast.error('Σφάλμα κατά την ενημέρωση κατάστασης'); }
  };

  const getDueDateInfo = () => {
    if (!project.end_date) return null;
    const today = new Date();
    const endDate = new Date(project.end_date);
    const days = differenceInDays(endDate, today);
    if (project.status === 'completed' || project.status === 'cancelled') return null;
    if (days < 0) return { label: `Εκπρόθεσμο κατά ${Math.abs(days)} ημέρες`, className: 'text-destructive' };
    if (days === 0) return { label: 'Λήγει σήμερα!', className: 'text-destructive' };
    if (days <= 7) return { label: `Σε ${days} ημέρες`, className: 'text-warning' };
    return { label: `Σε ${days} ημέρες`, className: 'text-muted-foreground' };
  };

  const dueDateInfo = getDueDateInfo();
  const statusConfig = getStatusConfig(project.status);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ── STICKY HEADER ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight truncate">{project.name}</h1>

              {/* Status dropdown */}
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80',
                      statusConfig.className
                    )}>
                      {statusConfig.label}
                      <span className="ml-0.5 opacity-60">▾</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {statusOptions.map(opt => (
                      <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value)}
                        className={opt.value === project.status ? 'font-semibold' : ''}>
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
              )}

              {/* Folder dropdown */}
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground hover:bg-secondary/50">
                      <FolderInput className="h-3 w-3" />
                      {folders.find(f => f.id === (project as any).folder_id)?.name || 'Φάκελος'}
                      <span className="ml-0.5 opacity-60">▾</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={async () => {
                      await supabase.from('projects').update({ folder_id: null }).eq('id', project.id);
                      toast.success('Αφαιρέθηκε από φάκελο'); fetchProjectData();
                    }} className={!(project as any).folder_id ? 'font-semibold' : ''}>
                      Χωρίς φάκελο
                    </DropdownMenuItem>
                    {folders.map(f => (
                      <DropdownMenuItem key={f.id} onClick={async () => {
                        await supabase.from('projects').update({ folder_id: f.id }).eq('id', project.id);
                        toast.success(`Μετακινήθηκε στο "${f.name}"`); fetchProjectData();
                      }} className={(project as any).folder_id === f.id ? 'font-semibold' : ''}>
                        {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Sub-info */}
            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
              {project.client && <span className="font-medium text-foreground">{project.client.name}</span>}
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(project.start_date), 'd MMM yyyy', { locale: el })}
                  {project.end_date && <> → {format(new Date(project.end_date), 'd MMM yyyy', { locale: el })}</>}
                </span>
              )}
              {dueDateInfo && <span className={cn('font-medium', dueDateInfo.className)}>· {dueDateInfo.label}</span>}
            </div>
          </div>

          {/* Right side: progress + timer + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {(tasks.length > 0 || deliverables.length > 0) && (
              <div className="hidden sm:flex items-center gap-2 min-w-[120px]">
                <Progress value={overallProgress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground">{overallProgress}%</span>
              </div>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              <Timer className="h-3 w-3" />{totalTrackedHours}h
            </span>
            <Button size="sm" onClick={() => {
              // Scroll to tasks and trigger dialog via embedded TasksPage
              const tasksSection = document.getElementById('project-tasks-engine');
              tasksSection?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <Plus className="h-4 w-4 mr-1" /> Task
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const delSection = document.getElementById('project-secondary-tabs');
              delSection?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <Plus className="h-4 w-4 mr-1" /> Παραδοτέο
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN LAYOUT ────────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">
        {/* ── LEFT: Main Task Engine (75%) ──────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4" id="project-tasks-engine">
          {/* Task Engine */}
          <TasksPage embedded projectId={project.id} />

          {/* ── SECONDARY TABS ──────────────────────────────────────────────── */}
          <div id="project-secondary-tabs">
            <Tabs defaultValue="deliverables" className="space-y-3">
              <TabsList className="h-auto gap-1 flex-wrap">
                <TabsTrigger value="deliverables" className="text-xs gap-1">
                  <ListChecks className="h-3.5 w-3.5" /> Παραδοτέα
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs gap-1">
                  <FileText className="h-3.5 w-3.5" /> Αρχεία
                </TabsTrigger>
                <TabsTrigger value="media-plan" className="text-xs gap-1">
                  <Megaphone className="h-3.5 w-3.5" /> Media Plan
                </TabsTrigger>
                <TabsTrigger value="creatives" className="text-xs gap-1">
                  <Palette className="h-3.5 w-3.5" /> Δημιουργικά
                </TabsTrigger>
                {(canViewFinancials || isClient) && (
                  <TabsTrigger value="financials" className="text-xs gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Οικονομικά
                  </TabsTrigger>
                )}
                <TabsTrigger value="comments" className="text-xs gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Σχόλια
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deliverables">
                <ProjectDeliverablesTable projectId={project.id} projectName={project.name} />
              </TabsContent>
              <TabsContent value="files">
                <FileExplorer projectId={project.id} />
              </TabsContent>
              <TabsContent value="media-plan">
                <ProjectMediaPlan
                  projectId={project.id}
                  projectName={project.name}
                  projectBudget={project.budget}
                  agencyFeePercentage={project.agency_fee_percentage || 0}
                  deliverables={deliverables.map(d => ({ id: d.id, name: d.name }))}
                />
              </TabsContent>
              <TabsContent value="creatives">
                <ProjectCreatives
                  projectId={project.id}
                  projectName={project.name}
                  deliverables={deliverables.map(d => ({ id: d.id, name: d.name }))}
                  tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
                  mediaPlanItems={[]}
                />
              </TabsContent>
              {(canViewFinancials || isClient) && (
                <TabsContent value="financials">
                  <ProjectFinancialsHub
                    projectId={project.id}
                    clientId={project.client_id}
                    projectBudget={project.budget}
                    agencyFeePercentage={project.agency_fee_percentage || 0}
                  />
                </TabsContent>
              )}
              <TabsContent value="comments">
                <Card>
                  <CardContent className="pt-6">
                    <ProjectCommentsAndHistory projectId={project.id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ── RIGHT: Project Meta Panel (25%) ──────────────────────────────── */}
        <div className="w-72 xl:w-80 shrink-0 space-y-4 hidden lg:block">
          {/* Card 1: Summary */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-semibold">Σύνοψη</p>

              {/* Overall progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Συνολική Πρόοδος</span>
                  <span className="font-medium text-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              {/* Tasks progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tasks</span>
                  <span className="font-medium text-foreground">{completedTasks}/{tasks.length}</span>
                </div>
                <Progress value={taskProgress} className="h-1.5" />
              </div>

              {/* Deliverables progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Παραδοτέα</span>
                  <span className="font-medium text-foreground">{completedDeliverables}/{deliverables.length}</span>
                </div>
                <Progress value={deliverableProgress} className="h-1.5" />
              </div>

              {/* Days remaining */}
              {dueDateInfo && (
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={cn('font-medium', dueDateInfo.className)}>{dueDateInfo.label}</span>
                </div>
              )}

              {/* Budget */}
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">€{project.budget.toLocaleString()}</span>
                {project.agency_fee_percentage > 0 && (
                  <span className="text-muted-foreground">(Fee: {project.agency_fee_percentage}%)</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Team */}
          <Card>
            <CardContent className="p-4">
              <ProjectTeamManager projectId={project.id} canEdit={canEdit} compact />
            </CardContent>
          </Card>

          {/* Card 3: Description & Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Λεπτομέρειες</p>

              {/* Description - inline edit */}
              <div className="group">
                <p className="text-xs text-muted-foreground mb-1">Περιγραφή</p>
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descriptionDraft}
                      onChange={e => setDescriptionDraft(e.target.value)}
                      rows={3}
                      className="text-sm"
                      autoFocus
                      onKeyDown={e => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          updateProjectField('description', descriptionDraft.trim() || null);
                          setEditingDescription(false);
                        }
                      }}
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingDescription(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="h-6 px-2 text-xs" onClick={() => {
                        updateProjectField('description', descriptionDraft.trim() || null);
                        setEditingDescription(false);
                      }}>
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "text-sm cursor-pointer rounded px-1 -mx-1 py-0.5 hover:bg-muted/50 transition-colors",
                      !project.description && "text-muted-foreground italic"
                    )}
                    onClick={() => {
                      if (!canEdit) return;
                      setDescriptionDraft(project.description || '');
                      setEditingDescription(true);
                    }}
                  >
                    {project.description || 'Προσθέστε περιγραφή...'}
                    {canEdit && <Pencil className="h-3 w-3 ml-1 inline opacity-0 group-hover:opacity-50" />}
                  </p>
                )}
              </div>

              {/* Budget - inline edit */}
              <div className="group flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Budget</span>
                {editingBudget ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={budgetDraft}
                      onChange={e => setBudgetDraft(e.target.value)}
                      className="h-6 w-24 text-xs"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          updateProjectField('budget', parseFloat(budgetDraft) || 0);
                          setEditingBudget(false);
                        }
                        if (e.key === 'Escape') setEditingBudget(false);
                      }}
                      onBlur={() => {
                        updateProjectField('budget', parseFloat(budgetDraft) || 0);
                        setEditingBudget(false);
                      }}
                    />
                  </div>
                ) : (
                  <span
                    className="text-sm font-medium cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                    onClick={() => { if (!canEdit) return; setBudgetDraft(project.budget.toString()); setEditingBudget(true); }}
                  >
                    €{project.budget.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Agency Fee - inline edit */}
              <div className="group flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Agency Fee</span>
                {editingFee ? (
                  <Input
                    type="number"
                    value={feeDraft}
                    onChange={e => setFeeDraft(e.target.value)}
                    className="h-6 w-16 text-xs"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        updateProjectField('agency_fee_percentage', parseFloat(feeDraft) || 0);
                        setEditingFee(false);
                      }
                      if (e.key === 'Escape') setEditingFee(false);
                    }}
                    onBlur={() => {
                      updateProjectField('agency_fee_percentage', parseFloat(feeDraft) || 0);
                      setEditingFee(false);
                    }}
                  />
                ) : (
                  <span
                    className="text-sm font-medium cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                    onClick={() => { if (!canEdit) return; setFeeDraft(project.agency_fee_percentage.toString()); setEditingFee(true); }}
                  >
                    {project.agency_fee_percentage}%
                  </span>
                )}
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Έναρξη</span>
                <input
                  type="date"
                  value={project.start_date || ''}
                  onChange={e => updateProjectField('start_date', e.target.value || null)}
                  disabled={!canEdit}
                  className="text-xs bg-transparent border-none outline-none text-foreground cursor-pointer disabled:cursor-default"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Λήξη</span>
                <input
                  type="date"
                  value={project.end_date || ''}
                  onChange={e => updateProjectField('end_date', e.target.value || null)}
                  disabled={!canEdit}
                  className="text-xs bg-transparent border-none outline-none text-foreground cursor-pointer disabled:cursor-default"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: AI Analysis (collapsible) */}
          <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
            <Card className="border-foreground/10">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 rounded-2xl transition-colors">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-semibold">AI Ανάλυση</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", aiOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4 space-y-3">
                  <Input
                    id="ai-file-upload"
                    type="file"
                    multiple
                    accept=".txt,.pdf,.doc,.docx,.rtf"
                    onChange={handleAiFileUpload}
                    disabled={uploadingForAi}
                    className="cursor-pointer text-xs h-8"
                  />
                  {uploadingForAi && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

                  {aiFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {aiFiles.map((file, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                          <Upload className="h-2.5 w-2.5" />
                          {file.fileName}
                          <button onClick={() => setAiFiles(prev => prev.filter((_, i) => i !== idx))} className="ml-0.5 hover:text-destructive">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {aiFiles.length > 0 && (
                    <ProjectAISuggestions
                      projectId={project.id}
                      projectName={project.name}
                      projectBudget={project.budget}
                      files={aiFiles}
                      onSuggestionsApplied={handleSuggestionsApplied}
                    />
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
