import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDeliverablesTable } from '@/components/projects/ProjectDeliverablesTable';
import TasksPage from '@/pages/Tasks';
import { ProjectFinancialsHub } from '@/components/projects/ProjectFinancialsHub';
import { ProjectCreatives } from '@/components/projects/ProjectCreatives';
import { ProjectMediaPlan } from '@/components/projects/ProjectMediaPlan';
import { ProjectAISuggestions } from '@/components/projects/ProjectAISuggestions';
import { ProjectInfoEditor } from '@/components/projects/ProjectInfoEditor';
import { ProjectTeamManager } from '@/components/projects/ProjectTeamManager';
import { FileExplorer } from '@/components/files/FileExplorer';
import { ProjectGanttView } from '@/components/projects/ProjectGanttView';
import { ProjectCommentsAndHistory } from '@/components/projects/ProjectCommentsAndHistory';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Loader2,
  Sparkles,
  Upload,
  BarChart3,
  Megaphone,
  TrendingUp,
  GanttChartSquare,
  MessageSquare,
  Palette,
  FolderInput,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ProjectStatus = 'lead' | 'proposal' | 'negotiation' | 'won' | 'active' | 'completed' | 'cancelled' | 'lost' | 'tender';
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'internal_review' | 'client_review';

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
  status: TaskStatus;
  due_date: string | null;
  assigned_to: string | null;
  assignee?: { full_name: string | null } | null;
}

interface Deliverable {
  id: string;
  name: string;
  completed: boolean;
  budget: number | null;
  cost: number | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  paid: boolean;
  issued_date: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, company, isAdmin, isManager, isClient, hasPermission } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

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
  
  // AI Analysis state
  const [aiFiles, setAiFiles] = useState<Array<{ fileName: string; content: string }>>([]);
  const [aiRawFiles, setAiRawFiles] = useState<File[]>([]); // Keep raw files for storage
  
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
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    if (!id) return;
    
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, client:clients(name)')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, assigned_to')
        .eq('project_id', id)
        .order('due_date', { ascending: true, nullsFirst: false });
      setTasks(tasksData || []);

      // Fetch deliverables
      const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select('id, name, completed, budget, cost')
        .eq('project_id', id);
      setDeliverables(deliverablesData || []);

      // Fetch invoices (if can view financials)
      if (canViewFinancials || isClient) {
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('id, invoice_number, amount, paid, issued_date')
          .eq('project_id', id)
          .order('issued_date', { ascending: false });
        setInvoices(invoicesData || []);
      }

      // Fetch expenses (only for admin/manager)
      if (canViewFinancials) {
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('id, description, amount, category, expense_date')
          .eq('project_id', id)
          .order('expense_date', { ascending: false });
        setExpenses(expensesData || []);
      }

    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Σφάλμα κατά τη φόρτωση του έργου');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  // Handle AI file uploads with document parsing
  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Store raw files for later storage
    setAiRawFiles(prev => [...prev, ...Array.from(files)]);
    
    // Parse the files using the hook
    const parsed = await parseFiles(files);
    
    if (parsed.length > 0) {
      toast.success(`${parsed.length} αρχείο(α) αναλύθηκαν και είναι έτοιμα`);
    }
    
    e.target.value = '';
  };

  // Save AI files to storage when suggestions are applied
  const saveAiFilesToStorage = async () => {
    if (!id || !user || aiRawFiles.length === 0) return;

    try {
      for (const file of aiRawFiles) {
        const fileName = createProjectFilesObjectKey({
          userId: user.id,
          originalName: file.name,
          prefix: `projects/${id}`,
        });

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading file to storage:', uploadError);
          continue;
        }

        // Save file metadata
        await supabase.from('file_attachments').insert({
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id,
          project_id: id,
        });
      }
      toast.success('Τα αρχεία αποθηκεύτηκαν!');
    } catch (error) {
      console.error('Error saving files to storage:', error);
    }
  };

  // Handle suggestions applied - refresh data and save files
  const handleSuggestionsApplied = useCallback(async () => {
    await saveAiFilesToStorage();
    setAiFiles([]);
    setAiRawFiles([]);
    fetchProjectData();
  }, [id, user, aiRawFiles]);

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
        <Button variant="link" onClick={() => navigate('/projects')}>
          Επιστροφή στα έργα
        </Button>
      </div>
    );
  }

  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const completedDeliverables = deliverables.filter(d => d.completed).length;
  const deliverableProgress = deliverables.length > 0 ? Math.round((completedDeliverables / deliverables.length) * 100) : 0;
  
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const agencyFee = (project.budget * project.agency_fee_percentage) / 100;
  const netProfit = totalPaid - totalExpenses;

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
    } catch {
      toast.error('Σφάλμα κατά την ενημέρωση κατάστασης');
    }
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
  const overallProgress = Math.round((taskProgress + deliverableProgress) / 2);
  const statusConfig = getStatusConfig(project.status);

  const getTaskStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-foreground" />;
      case 'review': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>

            {/* Inline clickable status badge */}
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80',
                    statusConfig.className
                  )}>
                    {statusConfig.label}
                    <span className="ml-0.5 opacity-60">▾</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {statusOptions.map(opt => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      className={opt.value === project.status ? 'font-semibold' : ''}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
            )}

            {/* Move to Folder */}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors cursor-pointer hover:text-foreground hover:bg-secondary/50">
                    <FolderInput className="h-3 w-3" />
                    {folders.find(f => f.id === (project as any).folder_id)?.name || 'Φάκελος'}
                    <span className="ml-0.5 opacity-60">▾</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.from('projects').update({ folder_id: null }).eq('id', project.id);
                      toast.success('Αφαιρέθηκε από φάκελο');
                      fetchProjectData();
                    }}
                    className={!(project as any).folder_id ? 'font-semibold' : ''}
                  >
                    Χωρίς φάκελο
                  </DropdownMenuItem>
                  {folders.map(f => (
                    <DropdownMenuItem
                      key={f.id}
                      onClick={async () => {
                        await supabase.from('projects').update({ folder_id: f.id }).eq('id', project.id);
                        toast.success(`Μετακινήθηκε στο "${f.name}"`);
                        fetchProjectData();
                      }}
                      className={(project as any).folder_id === f.id ? 'font-semibold' : ''}
                    >
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Sub-info row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm text-muted-foreground">
            {project.client && (
              <span className="font-medium text-foreground">{project.client.name}</span>
            )}
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(project.start_date), 'd MMM yyyy', { locale: el })}
                {project.end_date && (
                  <> → {format(new Date(project.end_date), 'd MMM yyyy', { locale: el })}</>
                )}
              </span>
            )}
            {dueDateInfo && (
              <span className={cn('font-medium', dueDateInfo.className)}>
                · {dueDateInfo.label}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {(tasks.length > 0 || deliverables.length > 0) && (
            <div className="flex items-center gap-2 mt-2 max-w-sm">
              <Progress value={overallProgress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">{overallProgress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK STATS (3 KPIs) ──────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <DollarSign className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-bold">€{project.budget.toLocaleString()}</p>
                {project.agency_fee_percentage > 0 && (
                  <p className="text-xs text-muted-foreground">Fee: {project.agency_fee_percentage}%</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Πρόοδος</p>
                <p className="text-lg font-bold">{overallProgress}%</p>
                <p className="text-xs text-muted-foreground">
                  {completedTasks}/{tasks.length} tasks · {completedDeliverables}/{deliverables.length} παραδοτέα
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Λήξη</p>
                <p className="text-lg font-bold">
                  {project.end_date 
                    ? format(new Date(project.end_date), 'd MMM', { locale: el })
                    : '-'}
                </p>
                {dueDateInfo && (
                  <p className={cn('text-xs', dueDateInfo.className)}>{dueDateInfo.label}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-1 -mx-6 px-6 pt-2 border-b">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deliverables">Παραδοτέα</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="timeline">
              <GanttChartSquare className="h-4 w-4 mr-1.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="media-plan">
              <Megaphone className="h-4 w-4 mr-1.5" />
              Media Plan
            </TabsTrigger>
            <TabsTrigger value="files">Αρχεία</TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Σχόλια
            </TabsTrigger>
            <TabsTrigger value="creatives">
              <Palette className="h-4 w-4 mr-1.5" />
              Δημιουργικά
            </TabsTrigger>
            {(canViewFinancials || isClient) && (
              <TabsTrigger value="financials">
                <DollarSign className="h-4 w-4 mr-1.5" />
                Οικονομικά
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* ROW 1: Info + Team/Progress */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Project Info */}
            <Card className="lg:col-span-2">
              <CardContent className="pt-6">
                <ProjectInfoEditor
                  project={project}
                  canEdit={canEdit}
                  onUpdate={fetchProjectData}
                />
              </CardContent>
            </Card>

            {/* Right: Team + Progress */}
            <div className="space-y-4">
              {/* Compact Team */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <ProjectTeamManager
                    projectId={project.id}
                    canEdit={canEdit}
                    compact
                  />
                </CardContent>
              </Card>

              {/* Progress bars */}
              <Card>
                <CardContent className="pt-4 pb-4 space-y-4">
                  <p className="text-sm font-medium">Πρόοδος</p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Παραδοτέα</span>
                        <span className="font-medium text-foreground">{deliverableProgress}%</span>
                      </div>
                      <Progress value={deliverableProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{completedDeliverables} / {deliverables.length} ολοκληρώθηκαν</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tasks</span>
                        <span className="font-medium text-foreground">{taskProgress}%</span>
                      </div>
                      <Progress value={taskProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{completedTasks} / {tasks.length} ολοκληρώθηκαν</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ROW 2: Recent Tasks + AI */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Recent Tasks */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Πρόσφατα Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">Δεν υπάρχουν tasks</p>
                ) : (
                  <div className="space-y-1">
                    {tasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        {getTaskStatusIcon(task.status)}
                        <span className={cn(
                          "flex-1 text-sm",
                          task.status === 'completed' && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(task.due_date), 'd MMM', { locale: el })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis — compact */}
            <Card className="border-foreground/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-foreground" />
                  AI Ανάλυση
                </CardTitle>
                <CardDescription className="text-xs">
                  Ανεβάστε αρχεία για AI προτάσεις
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="ai-file-upload"
                    type="file"
                    multiple
                    accept=".txt,.pdf,.doc,.docx,.rtf"
                    onChange={handleAiFileUpload}
                    disabled={uploadingForAi}
                    className="cursor-pointer text-xs h-8"
                  />
                  {uploadingForAi && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                </div>

                {aiFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {aiFiles.map((file, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                        <Upload className="h-2.5 w-2.5" />
                        {file.fileName}
                        <button
                          onClick={() => setAiFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-0.5 hover:text-destructive"
                        >
                          ×
                        </button>
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
            </Card>
          </div>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables">
          <ProjectDeliverablesTable projectId={project.id} projectName={project.name} />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <TasksPage embedded projectId={project.id} />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-4">
          <ProjectGanttView
            projectId={project.id}
            projectStartDate={project.start_date}
            projectEndDate={project.end_date}
          />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <FileExplorer projectId={project.id} />
        </TabsContent>

        {/* Comments & History Tab */}
        <TabsContent value="comments" className="mt-4">
          <ProjectCommentsAndHistory projectId={project.id} />
        </TabsContent>

        {/* Media Plan Tab */}
        <TabsContent value="media-plan" className="mt-0">
          <ProjectMediaPlan 
            projectId={project.id} 
            projectName={project.name}
            projectBudget={project.budget}
            agencyFeePercentage={project.agency_fee_percentage || 0}
            deliverables={deliverables.map(d => ({ id: d.id, name: d.name }))}
          />
        </TabsContent>

        {/* Creatives Tab */}
        <TabsContent value="creatives" className="mt-4">
          <ProjectCreatives
            projectId={project.id}
            projectName={project.name}
            deliverables={deliverables.map(d => ({ id: d.id, name: d.name }))}
            tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
            mediaPlanItems={[]}
          />
        </TabsContent>

        {/* Unified Financials Tab */}
        {(canViewFinancials || isClient) && (
          <TabsContent value="financials" className="mt-4">
            <ProjectFinancialsHub
              projectId={project.id}
              clientId={project.client_id}
              projectBudget={project.budget}
              agencyFeePercentage={project.agency_fee_percentage || 0}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
