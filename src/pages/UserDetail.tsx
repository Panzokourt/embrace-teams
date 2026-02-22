import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  ArrowLeft, User, Mail, Phone, Briefcase, Building2, Calendar, 
  FolderKanban, Users, Clock, Shield, CheckCircle2, Loader2, 
  FileText, Target, MapPin, Edit2, Check, X
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  color: string;
}

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

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  client?: { name: string } | null;
}

interface Tender {
  id: string;
  name: string;
  stage: string;
  probability: number;
}

interface Team {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project?: { name: string } | null;
}

interface UserRole {
  role: string;
  access_scope: string;
}

const statusLabels: Record<string, string> = {
  invited: 'Προσκεκλημένος',
  pending: 'Αναμονή',
  active: 'Ενεργός',
  suspended: 'Ανεσταλμένος',
  deactivated: 'Απενεργοποιημένος'
};

const statusColors: Record<string, string> = {
  invited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  deactivated: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
};

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
  billing: 'Billing',
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin, isManager, company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editingDepartment, setEditingDepartment] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('none');
  const [savingDepartment, setSavingDepartment] = useState(false);

  const canEdit = isCompanyAdmin || isManager;

  useEffect(() => {
    if (id) fetchUserData();
  }, [id]);

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!company?.id) return;
      const { data } = await supabase
        .from('departments')
        .select('id, name, color')
        .eq('company_id', company.id)
        .order('name');
      setDepartments(data || []);
    };
    fetchDepartments();
  }, [company?.id]);

  const fetchUserData = async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (userError) throw userError;
      setUser(userData);
      setSelectedDepartment(userData.department_id || 'none');

      // Fetch user role
      const { data: roleData } = await supabase
        .from('user_company_roles')
        .select('role, access_scope')
        .eq('user_id', id)
        .single();
      
      setUserRole(roleData);

      // Fetch projects where user has access
      const { data: projectAccess } = await supabase
        .from('project_user_access')
        .select('project_id')
        .eq('user_id', id);

      if (projectAccess && projectAccess.length > 0) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name, status, progress, client:clients(name)')
          .in('id', projectAccess.map(p => p.project_id));
        
        setProjects(projectsData || []);
      }

      // Fetch tenders where user has access
      const { data: tenderAccess } = await supabase
        .from('tender_team_access')
        .select('tender_id')
        .eq('user_id', id);

      if (tenderAccess && tenderAccess.length > 0) {
        const { data: tendersData } = await supabase
          .from('tenders')
          .select('id, name, stage, probability')
          .in('id', tenderAccess.map(t => t.tender_id));
        
        setTenders(tendersData || []);
      }

      // Fetch teams
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', id);

      if (teamMembers && teamMembers.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, color, description')
          .in('id', teamMembers.map(t => t.team_id));
        
        setTeams(teamsData || []);
      }

      // Fetch assigned tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, project:projects(name)')
        .eq('assigned_to', id)
        .order('due_date', { ascending: true })
        .limit(10);
      
      setTasks(tasksData || []);

    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Σφάλμα κατά τη φόρτωση χρήστη');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null | undefined, email?: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const getUserDepartment = () => {
    if (!user?.department_id) return null;
    return departments.find(d => d.id === user.department_id);
  };

  const handleSaveDepartment = async () => {
    if (!user) return;
    setSavingDepartment(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department_id: selectedDepartment === 'none' ? null : selectedDepartment })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, department_id: selectedDepartment === 'none' ? null : selectedDepartment });
      setEditingDepartment(false);
      toast.success('Το τμήμα ενημερώθηκε');
    } catch (error: any) {
      console.error('Error updating department:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    } finally {
      setSavingDepartment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <User className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Ο χρήστης δεν βρέθηκε</h2>
        <Button variant="outline" onClick={() => navigate('/users')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Επιστροφή
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-16 w-16 ring-2 ring-foreground/20 ring-offset-2">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-xl bg-muted text-foreground">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{user.full_name || 'Χωρίς όνομα'}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted-foreground">{user.email}</span>
              <Badge className={statusColors[user.status]}>
                {statusLabels[user.status] || user.status}
              </Badge>
              {userRole && (
                <Badge variant="outline">{roleLabels[userRole.role] || userRole.role}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Πληροφορίες
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.job_title && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{user.job_title}</span>
                </div>
              )}
              
              {/* Department - Editable */}
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {editingDepartment ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder="Επιλέξτε τμήμα" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Κανένα τμήμα</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: dept.color }}
                              />
                              {dept.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={handleSaveDepartment}
                      disabled={savingDepartment}
                    >
                      {savingDepartment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingDepartment(false);
                        setSelectedDepartment(user.department_id || 'none');
                      }}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    {getUserDepartment() ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getUserDepartment()?.color }}
                        />
                        <span>{getUserDepartment()?.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Χωρίς τμήμα</span>
                    )}
                    {canEdit && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 ml-auto"
                        onClick={() => setEditingDepartment(true)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              {user.hire_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Πρόσληψη: {format(new Date(user.hire_date), 'd MMM yyyy', { locale: el })}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Εγγραφή: {format(new Date(user.created_at), 'd MMM yyyy', { locale: el })}</span>
              </div>
              {userRole && (
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Scope: {userRole.access_scope === 'company' ? 'Ολόκληρη εταιρεία' : 'Ανατεθειμένα'}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ομάδες ({teams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-muted-foreground text-sm">Δεν ανήκει σε ομάδες</p>
              ) : (
                <div className="space-y-2">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: team.color || '#3B82F6' }}
                      />
                      <span className="font-medium">{team.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Projects, Tenders, Tasks */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="projects">
            <TabsList>
              <TabsTrigger value="projects">
                <FolderKanban className="h-4 w-4 mr-2" />
                Έργα ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="tenders">
                <Target className="h-4 w-4 mr-2" />
                Διαγωνισμοί ({tenders.length})
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <FileText className="h-4 w-4 mr-2" />
                Tasks ({tasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {projects.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Δεν συμμετέχει σε έργα</p>
                  ) : (
                    <div className="space-y-3">
                      {projects.map(project => (
                        <Link 
                          key={project.id} 
                          to={`/projects/${project.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <div>
                            <span className="font-medium">{project.name}</span>
                            {project.client && (
                              <span className="text-sm text-muted-foreground ml-2">
                                • {project.client.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{project.status}</Badge>
                            <span className="text-sm text-muted-foreground">{project.progress}%</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tenders" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {tenders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Δεν συμμετέχει σε διαγωνισμούς</p>
                  ) : (
                    <div className="space-y-3">
                      {tenders.map(tender => (
                        <Link 
                          key={tender.id} 
                          to={`/tenders/${tender.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <span className="font-medium">{tender.name}</span>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{tender.stage}</Badge>
                            <span className="text-sm text-muted-foreground">{tender.probability}%</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {tasks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Δεν έχει ανατεθειμένα tasks</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map(task => (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <div>
                            <span className="font-medium">{task.title}</span>
                            {task.project && (
                              <span className="text-sm text-muted-foreground ml-2">
                                • {task.project.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                              {task.status}
                            </Badge>
                            {task.due_date && (
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(task.due_date), 'd MMM', { locale: el })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
