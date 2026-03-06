import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderKanban, Target, FileText, Timer, Calendar, Shield, Clock, ShieldCheck, Mail, Phone, CalendarDays, Briefcase, Building2, ListTodo, AlertTriangle, CalendarClock, CircleDot } from 'lucide-react';
import { format, isAfter, isBefore, startOfMonth, endOfWeek, startOfWeek } from 'date-fns';
import { el } from 'date-fns/locale';
import { EmployeeHeader } from '@/components/hr/EmployeeHeader';
import { EmployeeStatsCard } from '@/components/hr/EmployeeStatsCard';
import { LeaveBalanceCard } from '@/components/hr/LeaveBalanceCard';
import { LeaveRequestsList } from '@/components/hr/LeaveRequestsList';
import { HRDocuments } from '@/components/hr/HRDocuments';
import { useLeaveManagement } from '@/hooks/useLeaveManagement';
import { toast } from 'sonner';
import { LevelProgressBar } from '@/components/gamification/LevelProgressBar';
import { SkillRadar } from '@/components/gamification/SkillRadar';
import { XPActivityFeed } from '@/components/gamification/XPActivityFeed';
import { PermissionModuleSelector } from '@/components/users/PermissionModuleSelector';
import { useRBAC } from '@/hooks/useRBAC';
import { PermissionType } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  department_id: string | null;
  phone: string | null;
  hire_date: string | null;
  status: string;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
  billing: 'Billing',
};

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const { isCompanyAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [ucrStatus, setUcrStatus] = useState<string>('pending');
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  const { balances, requests, cancelRequest } = useLeaveManagement(id);
  const { users: companyUsers, updateUserPermissions } = useRBAC();
  const [userPermissions, setUserPermissions] = useState<PermissionType[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    if (id && companyUsers.length > 0) {
      const found = companyUsers.find(u => u.user_id === id);
      if (found) setUserPermissions([...found.permissions]);
    }
  }, [id, companyUsers]);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [profileRes, roleRes, projectAccessRes, tasksRes, timeRes, activityRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('user_company_roles').select('role, status').eq('user_id', id).single(),
        supabase.from('project_user_access').select('project_id').eq('user_id', id),
        supabase.from('tasks').select('id, title, status, due_date, project:projects(name)').eq('assigned_to', id).order('due_date').limit(20),
        supabase.from('time_entries').select('*, project:projects(name), task:tasks(title)').eq('user_id', id).order('start_time', { ascending: false }).limit(50),
        supabase.from('activity_log').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      ]);

      if (profileRes.error) throw profileRes.error;
      setUser(profileRes.data);
      setRoleName(roleRes.data ? roleLabels[roleRes.data.role] || roleRes.data.role : null);
      if (roleRes.data?.status) setUcrStatus(roleRes.data.status);

      if (profileRes.data?.department_id) {
        const { data: dept } = await supabase.from('departments').select('name').eq('id', profileRes.data.department_id).single();
        setDepartmentName(dept?.name || null);
      }

      if (projectAccessRes.data?.length) {
        const { data: proj } = await supabase
          .from('projects')
          .select('id, name, status, progress, client:clients(name)')
          .in('id', projectAccessRes.data.map(p => p.project_id));
        setProjects(proj || []);
      }

      setTasks(tasksRes.data || []);
      setTimeEntries(timeRes.data || []);
      setActivityLog(activityRes.data || []);
    } catch {
      toast.error('Σφάλμα φόρτωσης προφίλ');
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length;
    const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed').length;
    const overdueTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed' && t.due_date && isBefore(new Date(t.due_date), now)).length;
    const dueThisWeek = tasks.filter(t => {
      if (t.status === 'done' || t.status === 'completed' || !t.due_date) return false;
      const d = new Date(t.due_date);
      return isAfter(d, weekStart) && isBefore(d, weekEnd);
    }).length;

    const monthlyMinutes = timeEntries
      .filter(e => isAfter(new Date(e.start_time), monthStart))
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const monthlyHours = Math.round(monthlyMinutes / 60);

    const totalLeave = balances.reduce((sum, b) => {
      const total = b.entitled_days + b.carried_over;
      return sum + (total - b.used_days - b.pending_days);
    }, 0);

    return { activeProjects, openTasks, overdueTasks, dueThisWeek, monthlyHours, totalLeave };
  }, [projects, tasks, timeEntries, balances]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-foreground" /></div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Ο χρήστης δεν βρέθηκε</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EmployeeHeader
        user={{ ...user, status: ucrStatus }}
        departmentName={departmentName}
        roleName={roleName}
        canEdit={isCompanyAdmin || isManager}
        onUserUpdate={(updates) => setUser(prev => prev ? { ...prev, ...updates } : prev)}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="projects">Έργα ({projects.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="leaves">Άδειες</TabsTrigger>
          <TabsTrigger value="documents">Έγγραφα</TabsTrigger>
          {(isCompanyAdmin || isManager) && (
            <TabsTrigger value="permissions" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Δικαιώματα
            </TabsTrigger>
          )}
          <TabsTrigger value="gamification">🏆 Score</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EmployeeStatsCard icon={FolderKanban} value={stats.activeProjects} label="Ενεργά Έργα" variant="primary" />
              <EmployeeStatsCard icon={ListTodo} value={stats.openTasks} label="Ανοιχτές Εργασίες" variant={stats.overdueTasks > 0 ? 'warning' : 'default'} />
              <EmployeeStatsCard icon={Clock} value={`${stats.monthlyHours}ω`} label="Ώρες Μήνα" variant="success" />
              <EmployeeStatsCard icon={Calendar} value={stats.totalLeave} label="Υπόλοιπο Αδειών" variant="default" />
            </div>

            {/* 12-col grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left column */}
              <div className="lg:col-span-7 space-y-6">
                {/* Contact Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Στοιχεία Επικοινωνίας
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.phone || <span className="text-muted-foreground italic">—</span>}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {user.hire_date ? format(new Date(user.hire_date), 'd MMMM yyyy', { locale: el }) : <span className="text-muted-foreground italic">—</span>}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Position & Department */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Θέση & Τμήμα
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Θέση</span>
                        <span className="text-sm font-medium">{user.job_title || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Τμήμα</span>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{departmentName || '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ρόλος</span>
                        {roleName ? <Badge variant="outline">{roleName}</Badge> : <span className="text-sm">—</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" /> Πρόσφατη Δραστηριότητα
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activityLog.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχει ιστορικό</p>
                    ) : (
                      <div className="space-y-2">
                        {activityLog.slice(0, 5).map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-sm">
                            <div className="truncate">
                              <span className="font-medium">{a.action}</span>
                              <span className="text-muted-foreground ml-1.5">• {a.entity_type}: {a.entity_name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {format(new Date(a.created_at), 'd MMM HH:mm', { locale: el })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="lg:col-span-5 space-y-6">
                {/* Projects */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" /> Έργα
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {projects.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Δεν συμμετέχει σε έργα</p>
                    ) : (
                      <div className="space-y-2">
                        {projects.slice(0, 5).map((p: any) => (
                          <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                            <div className="truncate">
                              <span className="font-medium text-sm">{p.name}</span>
                              {p.client && <span className="text-xs text-muted-foreground ml-1.5">• {p.client.name}</span>}
                            </div>
                            <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">{p.status}</Badge>
                          </Link>
                        ))}
                        {projects.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">+{projects.length - 5} ακόμη</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tasks Snapshot */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListTodo className="h-4 w-4" /> Tasks Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-xl bg-destructive/5">
                        <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
                        <p className="text-xl font-bold">{stats.overdueTasks}</p>
                        <p className="text-xs text-muted-foreground">Overdue</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-warning/5">
                        <CalendarClock className="h-5 w-5 text-warning mx-auto mb-1" />
                        <p className="text-xl font-bold">{stats.dueThisWeek}</p>
                        <p className="text-xs text-muted-foreground">This Week</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-secondary">
                        <CircleDot className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xl font-bold">{stats.openTasks}</p>
                        <p className="text-xs text-muted-foreground">Open</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Balance */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Υπόλοιπο Αδειών
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {balances.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν δεδομένα</p>
                    ) : (
                      <div className="space-y-2">
                        {balances.map(b => {
                          const total = b.entitled_days + b.carried_over;
                          const remaining = total - b.used_days - b.pending_days;
                          return (
                            <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.leave_type?.color || '#6B7280' }} />
                                <span className="text-sm">{b.leave_type?.name || 'Άδεια'}</span>
                              </div>
                              <span className="text-sm font-bold">{remaining} <span className="font-normal text-muted-foreground">/ {total}</span></span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== PROJECTS TAB ===== */}
        <TabsContent value="projects">
          <Card>
            <CardContent className="pt-4">
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν συμμετέχει σε έργα</p>
              ) : (
                <div className="space-y-3">
                  {projects.map((p: any) => (
                    <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {p.client && <span className="text-sm text-muted-foreground ml-2">• {p.client.name}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{p.status}</Badge>
                        <span className="text-sm text-muted-foreground">{p.progress}%</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TASKS TAB ===== */}
        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-4">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν έχει tasks</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <span className="font-medium">{t.title}</span>
                        {t.project && <span className="text-sm text-muted-foreground ml-2">• {t.project.name}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={t.status === 'completed' || t.status === 'done' ? 'default' : 'outline'}>{t.status}</Badge>
                        {t.due_date && <span className="text-sm text-muted-foreground">{format(new Date(t.due_date), 'd MMM', { locale: el })}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TIMESHEETS TAB ===== */}
        <TabsContent value="timesheets">
          <Card>
            <CardContent className="pt-4">
              {timeEntries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν καταχωρήσεις</p>
              ) : (
                <div className="space-y-2">
                  {timeEntries.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 text-sm">
                      <div className="flex items-center gap-3">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(e.start_time), 'dd MMM yyyy', { locale: el })}</span>
                        <span className="text-muted-foreground">{(e as any).project?.name}</span>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {Math.floor(e.duration_minutes / 60)}ω {e.duration_minutes % 60}λ
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== LEAVES TAB ===== */}
        <TabsContent value="leaves">
          <div className="space-y-4">
            <LeaveBalanceCard balances={balances} />
            <LeaveRequestsList requests={requests} onCancel={cancelRequest} />
          </div>
        </TabsContent>

        {/* ===== DOCUMENTS TAB ===== */}
        <TabsContent value="documents">
          <HRDocuments userId={id!} />
        </TabsContent>

        {/* ===== PERMISSIONS TAB ===== */}
        {(isCompanyAdmin || isManager) && (
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Δικαιώματα Χρήστη
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PermissionModuleSelector
                  selectedPermissions={userPermissions}
                  onChange={setUserPermissions}
                />
                <div className="flex justify-end">
                  <Button
                    disabled={savingPermissions}
                    onClick={async () => {
                      if (!id) return;
                      setSavingPermissions(true);
                      try {
                        await updateUserPermissions(id, userPermissions);
                        toast.success('Τα δικαιώματα αποθηκεύτηκαν');
                      } catch (err: any) {
                        toast.error(err.message || 'Σφάλμα αποθήκευσης');
                      } finally {
                        setSavingPermissions(false);
                      }
                    }}
                  >
                    {savingPermissions && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Αποθήκευση Δικαιωμάτων
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ===== GAMIFICATION TAB ===== */}
        <TabsContent value="gamification">
          <div className="space-y-6">
            <LevelProgressBar userId={id} />
            <div className="grid gap-6 lg:grid-cols-2">
              <SkillRadar userId={id!} />
              <XPActivityFeed userId={id!} />
            </div>
          </div>
        </TabsContent>

        {/* ===== ACTIVITY TAB ===== */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-4">
              {activityLog.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχει ιστορικό</p>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 text-sm">
                      <div>
                        <span className="font-medium">{a.action}</span>
                        <span className="text-muted-foreground ml-2">• {a.entity_type}: {a.entity_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), 'd MMM HH:mm', { locale: el })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
