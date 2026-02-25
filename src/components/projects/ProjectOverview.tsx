import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, TrendingUp, Package, AlertTriangle,
  Receipt, BarChart3, Briefcase, CalendarDays,
  Crown, Users, ArrowRight,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProjectOverviewProps {
  projectId: string;
  project: {
    id: string;
    name: string;
    description: string | null;
    budget: number;
    agency_fee_percentage: number;
    start_date: string | null;
    end_date: string | null;
    project_lead_id: string | null;
    account_manager_id: string | null;
  };
  deliverables: { id: string; name: string; completed: boolean; budget: number | null; cost: number | null }[];
  tasks: { id: string; title: string; status: string; due_date: string | null }[];
  onTabChange: (tab: string) => void;
}

interface KPIData {
  totalInvoiced: number;
  totalPaid: number;
  pendingInvoices: number;
  totalExpenses: number;
}

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--warning))',
];

function StatKPI({ label, value, sub, icon: Icon, variant = 'default' }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${iconStyles[variant]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectOverview({ projectId, project, deliverables, tasks, onTabChange }: ProjectOverviewProps) {
  const [kpi, setKpi] = useState<KPIData>({ totalInvoiced: 0, totalPaid: 0, pendingInvoices: 0, totalExpenses: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [briefs, setBriefs] = useState<{ id: string; title: string; brief_type: string }[]>([]);

  useEffect(() => {
    async function load() {
      const [invoicesRes, expensesRes, teamRes, briefsRes] = await Promise.all([
        supabase.from('invoices').select('amount, paid').eq('project_id', projectId),
        supabase.from('expenses').select('amount').eq('project_id', projectId),
        supabase.from('project_user_access').select('user_id').eq('project_id', projectId),
        supabase.from('briefs').select('id, title, brief_type').eq('project_id', projectId),
      ]);

      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      setKpi({
        totalInvoiced: invoices.reduce((s, i) => s + i.amount, 0),
        totalPaid: invoices.filter(i => i.paid).reduce((s, i) => s + i.amount, 0),
        pendingInvoices: invoices.filter(i => !i.paid).reduce((s, i) => s + i.amount, 0),
        totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      });

      setBriefs(briefsRes.data || []);

      // Fetch team profiles
      const accessData = teamRes.data || [];
      if (accessData.length > 0) {
        const userIds = accessData.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
        const { data: roles } = await supabase
          .from('user_company_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
        setTeamMembers((profiles || []).map(p => ({
          user_id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          role: rolesMap.get(p.id),
        })));
      }
    }
    load();
  }, [projectId]);

  const fmt = (n: number) => `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0 })}`;
  const completedDeliverables = deliverables.filter(d => d.completed).length;
  const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;
  const budgetUsedPct = project.budget > 0 ? Math.min(100, Math.round((kpi.totalInvoiced / project.budget) * 100)) : 0;
  const profitMargin = kpi.totalPaid > 0 ? ((kpi.totalPaid - kpi.totalExpenses) / kpi.totalPaid) * 100 : 0;

  const daysRemaining = project.end_date ? Math.max(0, differenceInDays(new Date(project.end_date), new Date())) : null;

  // Chart data
  const deliverableBudgetData = deliverables
    .filter(d => d.budget && d.budget > 0)
    .map(d => ({ name: d.name.length > 20 ? d.name.slice(0, 20) + '…' : d.name, budget: d.budget || 0 }));

  const leadMember = teamMembers.find(m => m.user_id === project.project_lead_id);
  const accountMgr = teamMembers.find(m => m.user_id === project.account_manager_id);

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  // Upcoming milestones (tasks with due dates, sorted)
  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ZONE A – Executive Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatKPI label="Συνολικό Budget" value={fmt(project.budget)} icon={DollarSign} />
        <StatKPI label="Budget Αξιοποίηση" value={`${budgetUsedPct}%`} sub={`${fmt(kpi.totalInvoiced)} / ${fmt(project.budget)}`} icon={BarChart3} variant={budgetUsedPct > 90 ? 'warning' : 'default'} />
        <StatKPI label="Παραδοτέα" value={`${completedDeliverables}/${deliverables.length}`} sub="ολοκληρωμένα" icon={Package} variant="success" />
        <StatKPI label="Εκπρόθεσμα Tasks" value={String(overdueTasks)} icon={AlertTriangle} variant={overdueTasks > 0 ? 'destructive' : 'default'} />
        <StatKPI label="Τιμολόγηση" value={fmt(kpi.totalInvoiced)} sub={`Εκκρεμεί: ${fmt(kpi.pendingInvoices)}`} icon={Receipt} variant="warning" />
        <StatKPI label="Κέρδος" value={`${profitMargin.toFixed(1)}%`} sub={fmt(kpi.totalPaid - kpi.totalExpenses)} icon={TrendingUp} variant={profitMargin > 0 ? 'success' : 'destructive'} />
      </div>

      {/* ZONE B – Project Scope */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {project.description || 'Δεν υπάρχει περιγραφή έργου.'}
          </p>
          {deliverables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Παραδοτέα</p>
              <ul className="space-y-1">
                {deliverables.slice(0, 6).map(d => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${d.completed ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                    <span className={d.completed ? 'line-through text-muted-foreground' : ''}>{d.name}</span>
                  </li>
                ))}
                {deliverables.length > 6 && (
                  <li className="text-xs text-muted-foreground">+{deliverables.length - 6} ακόμα</li>
                )}
              </ul>
            </div>
          )}
          {briefs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Briefs</p>
              <div className="flex flex-wrap gap-1.5">
                {briefs.map(b => (
                  <Badge key={b.id} variant="secondary" className="text-xs">{b.title}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ZONE C – 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Deliverables */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Παραδοτέα</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deliverables.length === 0 ? (
              <p className="text-xs text-muted-foreground">Δεν υπάρχουν παραδοτέα</p>
            ) : (
              deliverables.slice(0, 5).map(d => {
                const tasksDone = tasks.filter(t => t.status === 'completed').length;
                const totalTasks = tasks.length;
                const pct = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{d.name}</span>
                      {d.budget ? <span className="text-xs text-muted-foreground">{fmt(d.budget)}</span> : null}
                    </div>
                    <Progress value={d.completed ? 100 : pct} className="h-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Column 2: Team */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ομάδα</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadMember && (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={leadMember.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">{getInitials(leadMember.full_name, leadMember.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{leadMember.full_name || leadMember.email.split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Crown className="h-2.5 w-2.5" /> Project Lead</p>
                </div>
              </div>
            )}
            {accountMgr && (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={accountMgr.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">{getInitials(accountMgr.full_name, accountMgr.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{accountMgr.full_name || accountMgr.email.split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Briefcase className="h-2.5 w-2.5" /> Account Manager</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              {teamMembers
                .filter(m => m.user_id !== project.project_lead_id && m.user_id !== project.account_manager_id)
                .slice(0, 5)
                .map(m => (
                  <Avatar key={m.user_id} className="h-6 w-6">
                    <AvatarImage src={m.avatar_url || ''} />
                    <AvatarFallback className="text-[9px]">{getInitials(m.full_name, m.email)}</AvatarFallback>
                  </Avatar>
                ))}
              {teamMembers.length > 7 && (
                <span className="text-xs text-muted-foreground">+{teamMembers.length - 7}</span>
              )}
              {teamMembers.length === 0 && <p className="text-xs text-muted-foreground">Δεν υπάρχουν μέλη</p>}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Χρονοδιάγραμμα</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Έναρξη</span>
                <span className="font-medium">{project.start_date ? format(new Date(project.start_date), 'd MMM yyyy', { locale: el }) : '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Λήξη</span>
                <span className="font-medium">{project.end_date ? format(new Date(project.end_date), 'd MMM yyyy', { locale: el }) : '–'}</span>
              </div>
              {daysRemaining !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Υπολοιπόμενες</span>
                  <span className={`font-medium ${daysRemaining <= 7 ? 'text-destructive' : daysRemaining <= 30 ? 'text-warning' : ''}`}>
                    {daysRemaining} ημέρες
                  </span>
                </div>
              )}
            </div>
            {upcomingTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Επερχόμενα</p>
                <div className="space-y-1">
                  {upcomingTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{t.title}</span>
                      <span className="text-muted-foreground shrink-0">{format(new Date(t.due_date!), 'd/M')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ZONE D – Budget Breakdown */}
      {deliverableBudgetData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Budget ανά Παραδοτέο</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliverableBudgetData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} />
                    <Bar dataKey="budget" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Κατανομή Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deliverableBudgetData}
                      dataKey="budget"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {deliverableBudgetData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ZONE E – Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onTabChange('work')} className="gap-1.5">
              <Package className="h-3.5 w-3.5" /> View Work <ArrowRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onTabChange('planning')} className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> View Planning <ArrowRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onTabChange('finance')} className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> View Finance <ArrowRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onTabChange('assets')} className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> View Assets <ArrowRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onTabChange('activity')} className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Open Activity <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
