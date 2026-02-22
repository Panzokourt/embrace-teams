import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import type { Tables } from '@/integrations/supabase/types';

type TenderDeliverable = Tables<'tender_deliverables'>;

interface TenderDeliverablesProps {
  tenderId: string;
  tenderName: string;
}

export function TenderDeliverables({ tenderId, tenderName }: TenderDeliverablesProps) {
  const { isAdmin, isManager } = useAuth();
  const [deliverables, setDeliverables] = useState<TenderDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<TenderDeliverable | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    due_date: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchDeliverables();
  }, [tenderId]);

  const fetchDeliverables = async () => {
    try {
      const { data, error } = await supabase
        .from('tender_deliverables')
        .select('*')
        .eq('tender_id', tenderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDeliverables(data || []);
    } catch (error) {
      console.error('Error fetching tender deliverables:', error);
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
        tender_id: tenderId,
        budget: parseFloat(formData.budget) || 0,
        due_date: formData.due_date || null,
      };

      if (editingDeliverable) {
        const { data, error } = await supabase
          .from('tender_deliverables')
          .update(deliverableData)
          .eq('id', editingDeliverable.id)
          .select()
          .single();

        if (error) throw error;
        setDeliverables(prev => prev.map(d => d.id === editingDeliverable.id ? data : d));
        toast.success('Το παραδοτέο ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('tender_deliverables')
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

  const handleEdit = (deliverable: TenderDeliverable) => {
    setEditingDeliverable(deliverable);
    setFormData({
      name: deliverable.name,
      description: deliverable.description || '',
      budget: deliverable.budget?.toString() || '',
      due_date: deliverable.due_date || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (deliverableId: string) => {
    try {
      const { error } = await supabase
        .from('tender_deliverables')
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

  const toggleCompleted = async (deliverable: TenderDeliverable) => {
    try {
      const { error } = await supabase
        .from('tender_deliverables')
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
      due_date: '',
    });
  };

  const completedCount = deliverables.filter(d => d.completed).length;
  const progressPercentage = deliverables.length > 0 
    ? Math.round((completedCount / deliverables.length) * 100) 
    : 0;

  const totalBudget = deliverables.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
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
                    {editingDeliverable ? 'Ενημερώστε τα στοιχεία' : `Προσθήκη παραδοτέου στον διαγωνισμό "${tenderName}"`}
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
                      <Label htmlFor="due_date">Deadline</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>
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
              <span className="text-muted-foreground">Σύνολο Budget:</span>
              <span className="font-medium">€{totalBudget.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Deliverables list */}
        {deliverables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Δεν υπάρχουν παραδοτέα</p>
            <p className="text-xs mt-1">Προσθέστε τα παραδοτέα που απαιτεί ο διαγωνισμός</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliverables.map(deliverable => (
              <div key={deliverable.id} className={cn(
                "flex items-start gap-3 p-4 rounded-lg border bg-card transition-opacity",
                deliverable.completed && "opacity-60"
              )}>
                <button
                  onClick={() => toggleCompleted(deliverable)}
                  className="mt-0.5"
                  disabled={!canManage}
                >
                  {deliverable.completed 
                    ? <CheckCircle2 className="h-5 w-5 text-success" />
                    : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  }
                </button>
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
                    {(Number(deliverable.budget) || 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        €{Number(deliverable.budget).toLocaleString()}
                      </div>
                    )}
                    {deliverable.completed && (
                      <Badge variant="secondary" className="text-xs">Ολοκληρώθηκε</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
