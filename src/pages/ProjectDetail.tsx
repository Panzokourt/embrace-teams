import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ProjectOverview } from '@/components/projects/ProjectOverview';
import { ProjectWorkTab } from '@/components/projects/ProjectWorkTab';
import { ProjectPlanningTab } from '@/components/projects/ProjectPlanningTab';
import { ProjectFinancialsHub } from '@/components/projects/ProjectFinancialsHub';
import { ProjectAssetsTab } from '@/components/projects/ProjectAssetsTab';
import { ProjectCommentsAndHistory } from '@/components/projects/ProjectCommentsAndHistory';
import { ProjectTeamManager } from '@/components/projects/ProjectTeamManager';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  Loader2,
  Timer,
  Eye,
  Briefcase,
  BarChart3,
  Palette,
  MessageSquare,
  Pencil,
  Save,
  X,
  FolderInput,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  project_lead_id: string | null;
  account_manager_id: string | null;
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
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Inline editing state for sidebar
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

  // Budget utilization query
  const { data: totalInvoiced = 0 } = useQuery({
    queryKey: ['project-invoiced', id],
    queryFn: async () => {
      if (!id) return 0;
      const { data } = await supabase.from('invoices').select('amount').eq('project_id', id);
      return (data || []).reduce((s, i) => s + i.amount, 0);
    },
    enabled: !!id,
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
      setProject(projectData as any);

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

  const totalTrackedHours = Math.round((totalTrackedMinutes / 60) * 10) / 10;
  const budgetUsedPct = project.budget > 0 ? Math.min(100, Math.round((totalInvoiced / project.budget) * 100)) : 0;

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

  const getDaysRemaining = () => {
    if (!project.end_date) return null;
    const days = differenceInDays(new Date(project.end_date), new Date());
    if (project.status === 'completed' || project.status === 'cancelled') return null;
    return days;
  };

  const daysRemaining = getDaysRemaining();
  const statusConfig = getStatusConfig(project.status);

  const fmt = (n: number) => `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0 })}`;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* ── STICKY HEADER ──────────────────────────────────────────── */}
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

            {/* Metadata line */}
            <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-muted-foreground">
              {project.client && <span className="font-medium text-foreground">{project.client.name}</span>}
              {project.client && <span className="text-muted-foreground/40">•</span>}
              {project.start_date && (
                <span>
                  {format(new Date(project.start_date), 'd MMM', { locale: el })}
                  {project.end_date && <> – {format(new Date(project.end_date), 'd MMM yyyy', { locale: el })}</>}
                </span>
              )}
              {daysRemaining !== null && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className={cn('font-medium', daysRemaining < 0 ? 'text-destructive' : daysRemaining <= 7 ? 'text-warning' : '')}>
                    {daysRemaining < 0 ? `Εκπρόθεσμο ${Math.abs(daysRemaining)}d` : `${daysRemaining}d left`}
                  </span>
                </>
              )}
              <span className="text-muted-foreground/40">•</span>
              <span>{fmt(project.budget)}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{budgetUsedPct}% utilized</span>
            </div>
          </div>

          {/* Right: timer + sidebar toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              <Timer className="h-3 w-3" />{totalTrackedHours}h
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN LAYOUT ──────────────────────────────────────── */}
      <div className="flex gap-6 items-start">
        {/* ── LEFT: Tabs ──────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
            <TabsList className="h-auto gap-1 flex-wrap">
              <TabsTrigger value="overview" className="text-xs gap-1">
                <Eye className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="work" className="text-xs gap-1">
                <Briefcase className="h-3.5 w-3.5" /> Work
              </TabsTrigger>
              <TabsTrigger value="planning" className="text-xs gap-1">
                <BarChart3 className="h-3.5 w-3.5" /> Planning
              </TabsTrigger>
              {(canViewFinancials || isClient) && (
                <TabsTrigger value="finance" className="text-xs gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Finance
                </TabsTrigger>
              )}
              <TabsTrigger value="assets" className="text-xs gap-1">
                <Palette className="h-3.5 w-3.5" /> Assets
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ProjectOverview
                projectId={project.id}
                project={project}
                deliverables={deliverables}
                tasks={tasks}
                onTabChange={setActiveTab}
              />
            </TabsContent>

            <TabsContent value="work">
              <ProjectWorkTab projectId={project.id} projectName={project.name} />
            </TabsContent>

            <TabsContent value="planning">
              <ProjectPlanningTab
                projectId={project.id}
                projectName={project.name}
                projectBudget={project.budget}
                agencyFeePercentage={project.agency_fee_percentage || 0}
                deliverables={deliverables}
              />
            </TabsContent>

            {(canViewFinancials || isClient) && (
              <TabsContent value="finance">
                <ProjectFinancialsHub
                  projectId={project.id}
                  clientId={project.client_id}
                  projectBudget={project.budget}
                  agencyFeePercentage={project.agency_fee_percentage || 0}
                />
              </TabsContent>
            )}

            <TabsContent value="assets">
              <ProjectAssetsTab
                projectId={project.id}
                projectName={project.name}
                deliverables={deliverables.map(d => ({ id: d.id, name: d.name }))}
                tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
              />
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-6">
                  <ProjectCommentsAndHistory projectId={project.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT: Sidebar (Collapsible) ──────────────── */}
        {sidebarOpen && (
          <div className="w-72 xl:w-80 shrink-0 space-y-4 hidden lg:block">
            {/* Core Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">Πληροφορίες Έργου</p>

                {project.client && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Πελάτης</span>
                    <span className="text-sm font-medium">{project.client.name}</span>
                  </div>
                )}

                {/* Budget - inline edit */}
                <div className="group flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Budget</span>
                  {editingBudget ? (
                    <Input
                      type="number"
                      value={budgetDraft}
                      onChange={e => setBudgetDraft(e.target.value)}
                      className="h-6 w-24 text-xs"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') { updateProjectField('budget', parseFloat(budgetDraft) || 0); setEditingBudget(false); }
                        if (e.key === 'Escape') setEditingBudget(false);
                      }}
                      onBlur={() => { updateProjectField('budget', parseFloat(budgetDraft) || 0); setEditingBudget(false); }}
                    />
                  ) : (
                    <span
                      className="text-sm font-medium cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                      onClick={() => { if (!canEdit) return; setBudgetDraft(project.budget.toString()); setEditingBudget(true); }}
                    >
                      {fmt(project.budget)}
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
                        if (e.key === 'Enter') { updateProjectField('agency_fee_percentage', parseFloat(feeDraft) || 0); setEditingFee(false); }
                        if (e.key === 'Escape') setEditingFee(false);
                      }}
                      onBlur={() => { updateProjectField('agency_fee_percentage', parseFloat(feeDraft) || 0); setEditingFee(false); }}
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

            {/* Team Quick View */}
            <Card>
              <CardContent className="p-4">
                <ProjectTeamManager
                  projectId={project.id}
                  canEdit={canEdit}
                  compact
                  showFullNames
                  projectLeadId={project.project_lead_id}
                  accountManagerId={project.account_manager_id}
                  onUpdateProjectRole={(field, value) => updateProjectField(field, value)}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
