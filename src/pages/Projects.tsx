import { useState, useEffect, useCallback } from 'react';
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
import { Progress } from '@/components/ui/progress';
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
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Calendar,
  DollarSign,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
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
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select(`*, client:clients(name)`)
          .single();

        if (error) throw error;

        setProjects(prev => [data, ...prev]);
        toast.success('Το έργο δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
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

  const canManage = isAdmin || isManager;

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

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Νέο Έργο
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Επεξεργασία Έργου' : 'Δημιουργία Νέου Έργου'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Ενημερώστε τα στοιχεία του έργου' : 'Συμπληρώστε τα στοιχεία του νέου έργου'}
                </DialogDescription>
              </DialogHeader>
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
            </DialogContent>
          </Dialog>
        )}
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

      {/* Projects Grid */}
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
                      <EditDeleteActions
                        onEdit={() => handleEdit(project)}
                        onDelete={() => handleDelete(project.id)}
                        itemName={`το έργο "${project.name}"`}
                      />
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

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">€{project.budget?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {project.end_date 
                        ? format(new Date(project.end_date), 'd MMM yy', { locale: el })
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* Progress bar placeholder */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Πρόοδος</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
