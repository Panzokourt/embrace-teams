import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Edit, 
  Award,
  Target,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvaluationCriterion {
  id: string;
  tender_id: string;
  criterion: string;
  max_score: number;
  our_score: number | null;
  weight: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

interface TenderEvaluationCriteriaProps {
  tenderId: string;
}

export function TenderEvaluationCriteria({ tenderId }: TenderEvaluationCriteriaProps) {
  const { isAdmin, isManager } = useAuth();
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<EvaluationCriterion | null>(null);
  
  const [formData, setFormData] = useState({
    criterion: '',
    max_score: '10',
    our_score: '',
    weight: '1',
    notes: ''
  });

  const canManage = isAdmin || isManager;

  const fetchCriteria = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tender_evaluation_criteria')
        .select('*')
        .eq('tender_id', tenderId)
        .order('sort_order');

      if (error) throw error;
      setCriteria(data || []);
    } catch (error) {
      console.error('Error fetching criteria:', error);
      toast.error('Σφάλμα κατά τη φόρτωση κριτηρίων');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const criterionData = {
        tender_id: tenderId,
        criterion: formData.criterion,
        max_score: parseInt(formData.max_score) || 10,
        our_score: formData.our_score ? parseInt(formData.our_score) : null,
        weight: parseFloat(formData.weight) || 1,
        notes: formData.notes || null,
        sort_order: criteria.length
      };

      if (editingCriterion) {
        const { error } = await supabase
          .from('tender_evaluation_criteria')
          .update(criterionData)
          .eq('id', editingCriterion.id);

        if (error) throw error;
        toast.success('Το κριτήριο ενημερώθηκε!');
      } else {
        const { error } = await supabase
          .from('tender_evaluation_criteria')
          .insert(criterionData);

        if (error) throw error;
        toast.success('Το κριτήριο προστέθηκε!');
      }

      setDialogOpen(false);
      resetForm();
      fetchCriteria();
    } catch (error) {
      console.error('Error saving criterion:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (criterion: EvaluationCriterion) => {
    setEditingCriterion(criterion);
    setFormData({
      criterion: criterion.criterion,
      max_score: criterion.max_score.toString(),
      our_score: criterion.our_score?.toString() || '',
      weight: criterion.weight.toString(),
      notes: criterion.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (criterionId: string) => {
    try {
      const { error } = await supabase
        .from('tender_evaluation_criteria')
        .delete()
        .eq('id', criterionId);

      if (error) throw error;
      setCriteria(prev => prev.filter(c => c.id !== criterionId));
      toast.success('Το κριτήριο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting criterion:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleScoreUpdate = async (criterionId: string, score: number | null) => {
    try {
      const { error } = await supabase
        .from('tender_evaluation_criteria')
        .update({ our_score: score })
        .eq('id', criterionId);

      if (error) throw error;
      setCriteria(prev => prev.map(c => 
        c.id === criterionId ? { ...c, our_score: score } : c
      ));
    } catch (error) {
      console.error('Error updating score:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const resetForm = () => {
    setEditingCriterion(null);
    setFormData({
      criterion: '',
      max_score: '10',
      our_score: '',
      weight: '1',
      notes: ''
    });
  };

  // Calculate totals
  const totalMaxScore = criteria.reduce((sum, c) => sum + (c.max_score * c.weight), 0);
  const totalOurScore = criteria.reduce((sum, c) => sum + ((c.our_score || 0) * c.weight), 0);
  const scorePercentage = totalMaxScore > 0 ? (totalOurScore / totalMaxScore) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Μέγιστη Βαθμολογία</p>
                <p className="text-xl font-bold">{totalMaxScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Award className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Η Βαθμολογία Μας</p>
                <p className="text-xl font-bold">{totalOurScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ποσοστό</p>
                <p className="text-xl font-bold">{scorePercentage.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={scorePercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Criteria Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Κριτήρια Αξιολόγησης</CardTitle>
            <CardDescription>
              Καταγράψτε τα κριτήρια από την προκήρυξη και αξιολογήστε την πρόταση
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Νέο Κριτήριο
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCriterion ? 'Επεξεργασία Κριτηρίου' : 'Νέο Κριτήριο'}
                  </DialogTitle>
                  <DialogDescription>
                    Προσθέστε κριτήριο αξιολόγησης από την προκήρυξη
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="criterion">Κριτήριο *</Label>
                    <Input
                      id="criterion"
                      value={formData.criterion}
                      onChange={(e) => setFormData(prev => ({ ...prev, criterion: e.target.value }))}
                      placeholder="π.χ. Τεχνική Ικανότητα"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_score">Μέγιστο</Label>
                      <Input
                        id="max_score"
                        type="number"
                        value={formData.max_score}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_score: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="our_score">Εκτίμησή μας</Label>
                      <Input
                        id="our_score"
                        type="number"
                        value={formData.our_score}
                        onChange={(e) => setFormData(prev => ({ ...prev, our_score: e.target.value }))}
                        placeholder="-"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Βαρύτητα</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Σημειώσεις</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="Σχόλια για το κριτήριο..."
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                      Ακύρωση
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingCriterion ? 'Αποθήκευση' : 'Προσθήκη'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {criteria.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Δεν έχουν προστεθεί κριτήρια αξιολόγησης</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Προσθέστε τα κριτήρια από την προκήρυξη για να αξιολογήσετε την πρότασή σας
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Κριτήριο</TableHead>
                  <TableHead className="text-center w-[80px]">Μέγιστο</TableHead>
                  <TableHead className="text-center w-[100px]">Εκτίμηση</TableHead>
                  <TableHead className="text-center w-[80px]">Βαρύτητα</TableHead>
                  <TableHead className="w-[80px]">Σκορ</TableHead>
                  {canManage && <TableHead className="w-[80px]">Ενέργειες</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.map((criterion) => {
                  const weightedMax = criterion.max_score * criterion.weight;
                  const weightedOur = (criterion.our_score || 0) * criterion.weight;
                  const percentage = criterion.max_score > 0 
                    ? ((criterion.our_score || 0) / criterion.max_score) * 100 
                    : 0;

                  return (
                    <TableRow key={criterion.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{criterion.criterion}</p>
                          {criterion.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{criterion.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{criterion.max_score}</TableCell>
                      <TableCell className="text-center">
                        {canManage ? (
                          <Input
                            type="number"
                            className="w-16 h-8 text-center mx-auto"
                            value={criterion.our_score ?? ''}
                            onChange={(e) => {
                              const value = e.target.value ? parseInt(e.target.value) : null;
                              handleScoreUpdate(criterion.id, value);
                            }}
                            max={criterion.max_score}
                            min={0}
                          />
                        ) : (
                          criterion.our_score ?? '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">x{criterion.weight}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            percentage >= 80 && "bg-success/10 text-success border-success/20",
                            percentage >= 50 && percentage < 80 && "bg-warning/10 text-warning border-warning/20",
                            percentage < 50 && "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {weightedOur}/{weightedMax}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(criterion)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(criterion.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
