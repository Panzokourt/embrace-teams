import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDeliverables } from '@/components/projects/ProjectDeliverables';
import { ProjectTasksManager } from '@/components/projects/ProjectTasksManager';
import { ProjectFinancialsManager } from '@/components/projects/ProjectFinancialsManager';
import { ProjectPLReport } from '@/components/projects/ProjectPLReport';
import { ProjectMediaPlan } from '@/components/projects/ProjectMediaPlan';
import { ProjectAISuggestions } from '@/components/projects/ProjectAISuggestions';
import { ProjectInfoEditor } from '@/components/projects/ProjectInfoEditor';
import { ProjectTeamManager } from '@/components/projects/ProjectTeamManager';
import { FileExplorer } from '@/components/files/FileExplorer';
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
  Package,
  CheckSquare,
  Paperclip,
  Sparkles,
  Upload,
  BarChart3,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ProjectStatus = 'tender' | 'active' | 'completed' | 'cancelled';
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

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
  const { user, isAdmin, isManager, isClient, hasPermission } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
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
        const fileName = `${user.id}/${Date.now()}_${file.name}`;

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const getTaskStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-primary" />;
      case 'review': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          {project.client && (
            <p className="text-muted-foreground mt-1">{project.client.name}</p>
          )}
          {project.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-xl font-bold">€{project.budget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Παραδοτέα</p>
                <p className="text-xl font-bold">{completedDeliverables}/{deliverables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <CheckSquare className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-xl font-bold">{completedTasks}/{tasks.length}</p>
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
                <p className="text-sm text-muted-foreground">Λήξη</p>
                <p className="text-xl font-bold">
                  {project.end_date 
                    ? format(new Date(project.end_date), 'd MMM', { locale: el })
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliverables">Παραδοτέα</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="media-plan">
            <Megaphone className="h-4 w-4 mr-1.5" />
            Media Plan
          </TabsTrigger>
          <TabsTrigger value="files">Αρχεία</TabsTrigger>
          {(canViewFinancials || isClient) && (
            <>
              <TabsTrigger value="pl-report">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                P&L
              </TabsTrigger>
              <TabsTrigger value="financials">Οικονομικά</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Project Info Editor */}
          <Card>
            <CardContent className="pt-6">
              <ProjectInfoEditor
                project={project}
                canEdit={canEdit}
                onUpdate={fetchProjectData}
              />
            </CardContent>
          </Card>

          {/* Project Team Manager */}
          <Card>
            <CardContent className="pt-6">
              <ProjectTeamManager
                projectId={project.id}
                canEdit={canEdit}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Πρόοδος Έργου</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Παραδοτέα</span>
                    <span className="font-medium">{deliverableProgress}%</span>
                  </div>
                  <Progress value={deliverableProgress} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tasks</span>
                    <span className="font-medium">{taskProgress}%</span>
                  </div>
                  <Progress value={taskProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card - now shows basic info since detailed is in editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Σύνοψη</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-semibold text-lg">€{project.budget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Agency Fee</p>
                    <p className="font-semibold text-lg">{project.agency_fee_percentage}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Εκτιμώμενη Αμοιβή</p>
                  <p className="font-medium text-primary">€{agencyFee.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Section */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Ανάλυση Αρχείων
              </CardTitle>
              <CardDescription>
                Ανεβάστε αρχεία (προκηρύξεις, συμβάσεις, RFPs) και το AI θα προτείνει παραδοτέα, tasks και τιμολόγια
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload for AI */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="ai-file-upload" className="sr-only">Ανέβασμα αρχείων για AI</Label>
                  <Input
                    id="ai-file-upload"
                    type="file"
                    multiple
                    accept=".txt,.pdf,.doc,.docx,.rtf"
                    onChange={handleAiFileUpload}
                    disabled={uploadingForAi}
                    className="cursor-pointer"
                  />
                </div>
                {uploadingForAi && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>

              {/* Show uploaded files */}
              {aiFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {aiFiles.map((file, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      {file.fileName}
                      <button
                        onClick={() => setAiFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* AI Suggestions Component */}
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

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Πρόσφατα Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Δεν υπάρχουν tasks</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      {getTaskStatusIcon(task.status)}
                      <span className={cn(
                        "flex-1",
                        task.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(task.due_date), 'd MMM', { locale: el })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables">
          <Card>
            <CardHeader>
              <CardTitle>Παραδοτέα</CardTitle>
              <CardDescription>Διαχείριση παραδοτέων του έργου</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectDeliverables projectId={project.id} projectName={project.name} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Διαχείριση tasks του έργου</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectTasksManager projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <FileExplorer projectId={project.id} />
        </TabsContent>

        {/* Media Plan Tab */}
        <TabsContent value="media-plan">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Media Plan
              </CardTitle>
              <CardDescription>Σχεδιασμός και παρακολούθηση media placements</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectMediaPlan 
                projectId={project.id} 
                projectName={project.name}
                projectBudget={project.budget}
                deliverables={deliverables.map(d => ({ id: d.id, name: d.name }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* P&L Report Tab */}
        {(canViewFinancials || isClient) && (
          <TabsContent value="pl-report">
            <ProjectPLReport 
              projectId={project.id} 
              projectBudget={project.budget}
              agencyFeePercentage={project.agency_fee_percentage}
            />
          </TabsContent>
        )}

        {/* Financials Tab */}
        {(canViewFinancials || isClient) && (
          <TabsContent value="financials">
            <Card>
              <CardHeader>
                <CardTitle>Οικονομικά</CardTitle>
                <CardDescription>Διαχείριση τιμολογίων και εξόδων</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectFinancialsManager projectId={project.id} clientId={project.client_id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
