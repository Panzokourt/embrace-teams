import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDeliverablesTable } from '@/components/projects/ProjectDeliverablesTable';
import TasksPage from '@/pages/Tasks';
import { ProjectFinancialsHub } from '@/components/projects/ProjectFinancialsHub';
import { ProjectCreatives } from '@/components/projects/ProjectCreatives';
import { ProjectMediaPlan } from '@/components/projects/ProjectMediaPlan';
import { ProjectTeamManager } from '@/components/projects/ProjectTeamManager';
import { FileExplorer } from '@/components/files/FileExplorer';
import { ProjectContractsCard } from '@/components/projects/ProjectContractsCard';
import { ProjectCommentsAndHistory } from '@/components/projects/ProjectCommentsAndHistory';
import { ProjectWorkflowTracker } from '@/components/projects/ProjectWorkflowTracker';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, DollarSign, Clock, Loader2, Megaphone, GitBranch,
  Palette, FolderInput, Timer, ListChecks, FileText, MessageSquare,
  Pencil, Save, X, ClipboardList, Sparkles, FolderOpen, Layers,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
  is_internal?: boolean;
  parent_project_id?: string | null;
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

  // Tab & inline editing state
  const [activeTab, setActiveTab] = useState('overview');
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

  // Sub-projects query
  const { data: subProjects = [] } = useQuery({
    queryKey: ['sub-projects', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name, status, budget')
        .eq('parent_project_id', id)
        .order('created_at');
      return data || [];
    },
    enabled: !!id,
  });

  // Proposals files query
  const { data: proposalFiles = [] } = useQuery({
    queryKey: ['project-proposals', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('file_attachments')
        .select('id, file_name, created_at, file_path')
        .eq('project_id', id)
        .eq('document_type', 'proposal')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Briefs files query
  const { data: briefFiles = [] } = useQuery({
    queryKey: ['project-briefs', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('file_attachments')
        .select('id, file_name, created_at, file_path')
        .eq('project_id', id)
        .eq('document_type', 'brief')
        .order('created_at', { ascending: false });
      return data || [];
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

  // Stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completedDeliverables = deliverables.filter(d => d.completed).length;
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

  const getStatusBadgeForSub = (status: string) => {
    const s = getStatusConfig(status as ProjectStatus);
    return <Badge variant="outline" className={cn("text-[10px]", s.className)}>{s.label}</Badge>;
  };

  return (
    <div className="page-shell">
      {/* Breadcrumbs */}
      <nav className="text-xs text-muted-foreground/60 flex items-center gap-1.5 mb-1">
        <Link to="/" className="hover:text-foreground transition-colors">Dashboard</Link>
        <span className="text-muted-foreground/40">›</span>
        <Link to="/work?tab=projects" className="hover:text-foreground transition-colors">Εργασία</Link>
        <span className="text-muted-foreground/40">›</span>
        <Link to="/work?tab=projects" className="hover:text-foreground transition-colors">Έργα</Link>
        <span className="text-muted-foreground/40">›</span>
        <span className="text-muted-foreground/70">{project.name}</span>
      </nav>

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-6 px-6 py-3 border-b border-border/50">
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

              {(project as any).is_internal && (
                <Badge variant="outline" className="text-[10px] bg-muted/50">Internal</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
              {project.client && project.client_id && (
                <Link to={`/clients/${project.client_id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                  {project.client.name}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              <Timer className="h-3 w-3" />{totalTrackedHours}h
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="h-auto gap-1 flex-wrap">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <FolderInput className="h-3.5 w-3.5" /> Επισκόπηση
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="text-xs gap-1">
              <ListChecks className="h-3.5 w-3.5" /> Παραδοτέα
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Tasks
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
            <TabsTrigger value="workflow" className="text-xs gap-1">
              <GitBranch className="h-3.5 w-3.5" /> Ροή
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Σχόλια
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Project Info Card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-semibold">Πληροφορίες Έργου</p>

                  {/* Description */}
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

                  {/* Client */}
                  {project.client && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Πελάτης</span>
                      <span className="text-sm font-medium">{project.client.name}</span>
                    </div>
                  )}

                  {/* Budget */}
                  <div className="group flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Budget</span>
                    {editingBudget ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" value={budgetDraft}
                          onChange={e => setBudgetDraft(e.target.value)}
                          className="h-6 w-24 text-xs" autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { updateProjectField('budget', parseFloat(budgetDraft) || 0); setEditingBudget(false); }
                            if (e.key === 'Escape') setEditingBudget(false);
                          }}
                          onBlur={() => { updateProjectField('budget', parseFloat(budgetDraft) || 0); setEditingBudget(false); }}
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-medium cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                        onClick={() => { if (!canEdit) return; setBudgetDraft(project.budget.toString()); setEditingBudget(true); }}>
                        €{project.budget.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Agency Fee */}
                  {!(project as any).is_internal && (
                    <div className="group flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Agency Fee</span>
                      {editingFee ? (
                        <Input
                          type="number" value={feeDraft}
                          onChange={e => setFeeDraft(e.target.value)}
                          className="h-6 w-16 text-xs" autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { updateProjectField('agency_fee_percentage', parseFloat(feeDraft) || 0); setEditingFee(false); }
                            if (e.key === 'Escape') setEditingFee(false);
                          }}
                          onBlur={() => { updateProjectField('agency_fee_percentage', parseFloat(feeDraft) || 0); setEditingFee(false); }}
                        />
                      ) : (
                        <span className="text-sm font-medium cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                          onClick={() => { if (!canEdit) return; setFeeDraft(project.agency_fee_percentage.toString()); setEditingFee(true); }}>
                          {project.agency_fee_percentage}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Έναρξη</span>
                    <input type="date" value={project.start_date || ''} onChange={e => updateProjectField('start_date', e.target.value || null)} disabled={!canEdit}
                      className="text-xs bg-transparent border-none outline-none text-foreground cursor-pointer disabled:cursor-default" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Λήξη</span>
                    <input type="date" value={project.end_date || ''} onChange={e => updateProjectField('end_date', e.target.value || null)} disabled={!canEdit}
                      className="text-xs bg-transparent border-none outline-none text-foreground cursor-pointer disabled:cursor-default" />
                  </div>

                  {dueDateInfo && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn('font-medium', dueDateInfo.className)}>{dueDateInfo.label}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Καταγεγραμμένες Ώρες</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />{totalTrackedHours}h
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tasks</span>
                    <span className="text-sm font-medium">{completedTasks}/{tasks.length} ολοκληρωμένα</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Παραδοτέα</span>
                    <span className="text-sm font-medium">{completedDeliverables}/{deliverables.length} ολοκληρωμένα</span>
                  </div>
                </CardContent>
              </Card>

              {/* Team Card */}
              <Card>
                <CardContent className="p-5">
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

              {/* Contracts Card */}
              <ProjectContractsCard projectId={project.id} onUploadContract={() => setActiveTab('files')} />

              {/* Proposals Card */}
              {proposalFiles.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Προτάσεις / Προσφορές</p>
                      <Badge variant="secondary" className="text-[10px]">{proposalFiles.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {proposalFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate flex-1">{f.file_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(f.created_at), 'd/M/yy', { locale: el })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Briefs Card */}
              {briefFiles.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Briefs</p>
                      <Badge variant="secondary" className="text-[10px]">{briefFiles.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {briefFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate flex-1">{f.file_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(f.created_at), 'd/M/yy', { locale: el })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sub-projects Card */}
              {subProjects.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">Υπό-έργα</p>
                      <Badge variant="secondary" className="text-[10px]">{subProjects.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {subProjects.map(sp => (
                        <Link key={sp.id} to={`/projects/${sp.id}`}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <span className="text-sm font-medium">{sp.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">€{(sp.budget || 0).toLocaleString()}</span>
                            {getStatusBadgeForSub(sp.status)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deliverables">
            <ProjectDeliverablesTable projectId={project.id} projectName={project.name} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksPage embedded projectId={project.id} />
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
          <TabsContent value="workflow">
            <ProjectWorkflowTracker projectId={project.id} />
          </TabsContent>
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
  );
}
