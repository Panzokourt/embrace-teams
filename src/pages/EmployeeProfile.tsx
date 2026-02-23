import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderKanban, Target, FileText, Timer, Calendar, Shield, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { EmployeeHeader } from '@/components/hr/EmployeeHeader';
import { LeaveBalanceCard } from '@/components/hr/LeaveBalanceCard';
import { LeaveRequestsList } from '@/components/hr/LeaveRequestsList';
import { HRDocuments } from '@/components/hr/HRDocuments';
import { useLeaveManagement } from '@/hooks/useLeaveManagement';
import { toast } from 'sonner';
import { LevelProgressBar } from '@/components/gamification/LevelProgressBar';
import { SkillRadar } from '@/components/gamification/SkillRadar';
import { XPActivityFeed } from '@/components/gamification/XPActivityFeed';

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
  const navigate = useNavigate();
  const { company, isCompanyAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [ucrStatus, setUcrStatus] = useState<string>('pending');
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  const { balances, requests, cancelRequest } = useLeaveManagement(id);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Parallel fetches
      const [profileRes, roleRes, projectAccessRes, teamMembersRes, tasksRes, timeRes, activityRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('user_company_roles').select('role, status').eq('user_id', id).single(),
        supabase.from('project_user_access').select('project_id').eq('user_id', id),
        supabase.from('team_members').select('team_id').eq('user_id', id),
        supabase.from('tasks').select('id, title, status, due_date, project:projects(name)').eq('assigned_to', id).order('due_date').limit(20),
        supabase.from('time_entries').select('*, project:projects(name), task:tasks(title)').eq('user_id', id).order('start_time', { ascending: false }).limit(20),
        supabase.from('activity_log').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      ]);

      if (profileRes.error) throw profileRes.error;
      setUser(profileRes.data);
      setRoleName(roleRes.data ? roleLabels[roleRes.data.role] || roleRes.data.role : null);
      if (roleRes.data?.status) setUcrStatus(roleRes.data.status);

      // Fetch department name
      if (profileRes.data?.department_id) {
        const { data: dept } = await supabase.from('departments').select('name').eq('id', profileRes.data.department_id).single();
        setDepartmentName(dept?.name || null);
      }

      // Projects
      if (projectAccessRes.data?.length) {
        const { data: proj } = await supabase
          .from('projects')
          .select('id, name, status, progress, client:clients(name)')
          .in('id', projectAccessRes.data.map(p => p.project_id));
        setProjects(proj || []);
      }

      // Teams
      if (teamMembersRes.data?.length) {
        const { data: t } = await supabase
          .from('teams')
          .select('id, name, color')
          .in('id', teamMembersRes.data.map(m => m.team_id));
        setTeams(t || []);
      }

      setTasks(tasksRes.data || []);
      setTimeEntries(timeRes.data || []);
      setActivityLog(activityRes.data || []);
    } catch (err) {
      toast.error('Σφάλμα φόρτωσης προφίλ');
    } finally {
      setLoading(false);
    }
  };

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
          <TabsTrigger value="gamification">🏆 Score</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Teams */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Ομάδες</CardTitle></CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Δεν ανήκει σε ομάδες</p>
                ) : (
                  <div className="space-y-2">
                    {teams.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || '#3B82F6' }} />
                        <span className="font-medium text-sm">{t.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leave Balances */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Υπόλοιπο Αδειών</h3>
              <LeaveBalanceCard balances={balances} />
            </div>
          </div>
        </TabsContent>

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
                        <Badge variant={t.status === 'completed' ? 'default' : 'outline'}>{t.status}</Badge>
                        {t.due_date && <span className="text-sm text-muted-foreground">{format(new Date(t.due_date), 'd MMM', { locale: el })}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="leaves">
          <div className="space-y-4">
            <LeaveBalanceCard balances={balances} />
            <LeaveRequestsList requests={requests} onCancel={cancelRequest} />
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <HRDocuments userId={id!} />
        </TabsContent>

        <TabsContent value="gamification">
          <div className="space-y-6">
            <LevelProgressBar userId={id} />
            <div className="grid gap-6 lg:grid-cols-2">
              <SkillRadar userId={id!} />
              <XPActivityFeed userId={id!} />
            </div>
          </div>
        </TabsContent>

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
