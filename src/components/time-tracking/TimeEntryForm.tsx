import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
}

interface TimeEntryFormProps {
  projects: Project[];
  tasks: Task[];
  onSubmit: (entry: {
    task_id: string | null;
    project_id: string;
    start_time: string;
    end_time: string;
    description?: string;
  }) => Promise<void>;
}

export function TimeEntryForm({ projects, tasks, onSubmit }: TimeEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredTasks = tasks.filter(t => !projectId || t.project_id === projectId);

  const handleSubmit = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await onSubmit({
        task_id: taskId || null,
        project_id: projectId,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`,
        description: description || undefined,
      });
      setOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setProjectId('');
    setTaskId('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('10:00');
    setDescription('');
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Καταχώρηση Χρόνου
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Χειροκίνητη Καταχώρηση Χρόνου</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Έργο *</Label>
              <Select value={projectId} onValueChange={(v) => { setProjectId(v); setTaskId(''); }}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε έργο" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Task (προαιρετικό)</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε task" /></SelectTrigger>
                <SelectContent>
                  {filteredTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ημερομηνία</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ώρα Έναρξης</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>Ώρα Λήξης</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Σημειώσεις</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleSubmit} disabled={!projectId || saving}>
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
