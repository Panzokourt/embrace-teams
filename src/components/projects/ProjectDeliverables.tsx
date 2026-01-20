import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  Calendar,
  DollarSign,
  Loader2,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  project_id: string;
  budget: number | null;
  cost: number | null;
  due_date: string | null;
  completed: boolean;
  created_at: string;
}

interface ProjectDeliverablesProps {
  projectId: string;
  projectName: string;
}

export function ProjectDeliverables({ projectId, projectName }: ProjectDeliverablesProps) {
  const { isAdmin, isManager } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    cost: '',
    due_date: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchDeliverables();
  }, [projectId]);

  const fetchDeliverables = async () => {
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDeliverables(data || []);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      toast.error('Σφάλμα κατά τη φόρτωση παραδοτέων');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const deliverableData = {
        name: formData.name,
        description: formData.description || null,
        project_id: projectId,
        budget: parseFloat(formData.budget) || 0,
        cost: parseFloat(formData.cost) || 0,
        due_date: formData.due_date || null,
      };

      if (editingDeliverable) {
        const { data, error } = await supabase
          .from('deliverables')
          .update(deliverableData)
          .eq('id', editingDeliverable.id)
          .select()
          .single();

        if (error) throw error;
        setDeliverables(prev => prev.map(d => d.id === editingDeliverable.id ? data : d));
        toast.success('Το παραδοτέο ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('deliverables')
          .insert(deliverableData)
          .select()
          .single();

        if (error) throw error;
        setDeliverables(prev => [...prev, data]);
        toast.success('Το παραδοτέο δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving deliverable:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (deliverable: Deliverable) => {
    setEditingDeliverable(deliverable);
    setFormData({
      name: deliverable.name,
      description: deliverable.description || '',
      budget: deliverable.budget?.toString() || '',
      cost: deliverable.cost?.toString() || '',
      due_date: deliverable.due_date || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (deliverableId: string) => {
    try {
      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', deliverableId);

      if (error) throw error;
      setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
      toast.success('Το παραδοτέο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting deliverable:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const toggleCompleted = async (deliverable: Deliverable) => {
    try {
      const { error } = await supabase
        .from('deliverables')
        .update({ completed: !deliverable.completed })
        .eq('id', deliverable.id);

      if (error) throw error;
      setDeliverables(prev => prev.map(d => 
        d.id === deliverable.id ? { ...d, completed: !d.completed } : d
      ));
      toast.success(deliverable.completed ? 'Σημειώθηκε ως εκκρεμές' : 'Σημειώθηκε ως ολοκληρωμένο');
    } catch (error) {
      console.error('Error updating deliverable:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const resetForm = () => {
    setEditingDeliverable(null);
    setFormData({
      name: '',
      description: '',
      budget: '',
      cost: '',
      due_date: '',
    });
  };

  const completedCount = deliverables.filter(d => d.completed).length;
  const progressPercentage = deliverables.length > 0 
    ? Math.round((completedCount / deliverables.length) * 100) 
    : 0;

  const totalBudget = deliverables.reduce((sum, d) => sum + (d.budget || 0), 0);
  const totalCost = deliverables.reduce((sum, d) => sum + (d.cost || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Πρόοδος: {completedCount}/{deliverables.length} παραδοτέα
            </span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-4">
                <Plus className="h-4 w-4 mr-1" />
                Νέο Παραδοτέο
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDeliverable ? 'Επεξεργασία Παραδοτέου' : 'Νέο Παραδοτέο'}</DialogTitle>
                <DialogDescription>
                  {editingDeliverable ? 'Ενημερώστε τα στοιχεία' : `Προσθήκη παραδοτέου στο "${projectName}"`}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Όνομα *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="π.χ. Σχεδιασμός UI"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Περιγραφή</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="cost">Κόστος (€)</Label>
                    <Input
                      id="cost"
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Deadline</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingDeliverable ? 'Αποθήκευση' : 'Δημιουργία'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Budget summary */}
      {deliverables.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Budget:</span>
            <span className="font-medium">€{totalBudget.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Κόστος:</span>
            <span className={cn("font-medium", totalCost > totalBudget && "text-destructive")}>
              €{totalCost.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Deliverables list */}
      {deliverables.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Δεν υπάρχουν παραδοτέα</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deliverables.map(deliverable => (
            <Card key={deliverable.id} className={cn(
              "transition-opacity",
              deliverable.completed && "opacity-60"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {canManage ? (
                    <Checkbox
                      checked={deliverable.completed}
                      onCheckedChange={() => toggleCompleted(deliverable)}
                      className="mt-1"
                    />
                  ) : (
                    deliverable.completed 
                      ? <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                      : <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn(
                          "font-medium",
                          deliverable.completed && "line-through"
                        )}>
                          {deliverable.name}
                        </p>
                        {deliverable.description && (
                          <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
                        )}
                      </div>
                      {canManage && (
                        <EditDeleteActions
                          onEdit={() => handleEdit(deliverable)}
                          onDelete={() => handleDelete(deliverable.id)}
                          itemName={`το παραδοτέο "${deliverable.name}"`}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {deliverable.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(deliverable.due_date), 'd MMM yyyy', { locale: el })}
                        </div>
                      )}
                      {(deliverable.budget || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          €{deliverable.budget?.toLocaleString()}
                        </div>
                      )}
                      {deliverable.completed && (
                        <Badge variant="secondary" className="text-xs">Ολοκληρώθηκε</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
