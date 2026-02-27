import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FolderPlus, ListPlus, Loader2 } from 'lucide-react';

interface CreateActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'project' | 'task';
  suggestedProject?: {
    name?: string;
    description?: string;
    client_id?: string;
    budget?: number;
  };
  suggestedTask?: {
    title?: string;
    description?: string;
    priority?: string;
    estimated_hours?: number;
  };
  insightId?: string;
}

export function BrainCreateActionDialog({
  open, onOpenChange, defaultTab = 'project',
  suggestedProject, suggestedTask, insightId,
}: CreateActionDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState(defaultTab);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  // Project fields
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');

  // Task fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskHours, setTaskHours] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Load clients for selector
  useEffect(() => {
    if (!open) return;
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      if (data) setClients(data);
    });
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, [open]);

  // Prefill from suggestions
  useEffect(() => {
    if (!open) return;
    setTab(defaultTab);
    if (suggestedProject) {
      setProjName(suggestedProject.name || '');
      setProjDesc(suggestedProject.description || '');
      setProjClient(suggestedProject.client_id || '');
      setProjBudget(suggestedProject.budget ? String(suggestedProject.budget) : '');
    }
    if (suggestedTask) {
      setTaskTitle(suggestedTask.title || '');
      setTaskDesc(suggestedTask.description || '');
      setTaskPriority(suggestedTask.priority || 'medium');
      setTaskHours(suggestedTask.estimated_hours ? String(suggestedTask.estimated_hours) : '');
    }
  }, [open, defaultTab, suggestedProject, suggestedTask]);

  const handleCreateProject = async () => {
    if (!projName.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get company_id
      const { data: role } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!role?.company_id) throw new Error('No company');

      const { data: project, error } = await supabase.from('projects').insert({
        name: projName.trim(),
        description: projDesc.trim(),
        client_id: projClient || null,
        budget: projBudget ? Number(projBudget) : null,
        status: 'lead',
        company_id: role.company_id,
      }).select('id').single();

      if (error) throw error;

      // Mark insight as actioned
      if (insightId) {
        await supabase.from('brain_insights' as any).update({ is_actioned: true } as any).eq('id', insightId);
      }

      toast({ title: '✓ Έργο δημιουργήθηκε', description: projName });
      onOpenChange(false);
      if (project?.id) navigate(`/projects/${project.id}`);
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!taskProject) {
        toast({ title: 'Σφάλμα', description: 'Επιλέξτε έργο για το task', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { data: task, error } = await supabase.from('tasks').insert({
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        status: 'todo' as any,
        assigned_to: user.id,
        estimated_hours: taskHours ? Number(taskHours) : null,
        project_id: taskProject,
      }).select('id').single();

      if (error) throw error;

      if (insightId) {
        await supabase.from('brain_insights' as any).update({ is_actioned: true } as any).eq('id', insightId);
      }

      toast({ title: '✓ Task δημιουργήθηκε', description: taskTitle });
      onOpenChange(false);
      if (task?.id) navigate(`/tasks/${task.id}`);
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Δημιουργία από Insight</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="project" className="gap-1.5 text-xs">
              <FolderPlus className="h-3.5 w-3.5" /> Έργο
            </TabsTrigger>
            <TabsTrigger value="task" className="gap-1.5 text-xs">
              <ListPlus className="h-3.5 w-3.5" /> Task
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Όνομα Έργου *</Label>
              <Input value={projName} onChange={e => setProjName(e.target.value)} placeholder="π.χ. SEO Campaign - Client X" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Περιγραφή</Label>
              <Textarea value={projDesc} onChange={e => setProjDesc(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Πελάτης</Label>
                <Select value={projClient} onValueChange={setProjClient}>
                  <SelectTrigger><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Budget (€)</Label>
                <Input type="number" value={projBudget} onChange={e => setProjBudget(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="task" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Τίτλος Task *</Label>
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Περιγραφή</Label>
              <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Έργο *</Label>
              <Select value={taskProject} onValueChange={setTaskProject}>
                <SelectTrigger><SelectValue placeholder="Επιλογή έργου..." /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Χαμηλή</SelectItem>
                    <SelectItem value="medium">Μεσαία</SelectItem>
                    <SelectItem value="high">Υψηλή</SelectItem>
                    <SelectItem value="urgent">Επείγον</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Εκτ. Ώρες</Label>
                <Input type="number" value={taskHours} onChange={e => setTaskHours(e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button
            size="sm"
            onClick={tab === 'project' ? handleCreateProject : handleCreateTask}
            disabled={saving || (tab === 'project' ? !projName.trim() : (!taskTitle.trim() || !taskProject))}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Δημιουργία {tab === 'project' ? 'Έργου' : 'Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
