import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import { format } from 'date-fns';

type ProjectStatus = 'lead' | 'proposal' | 'negotiation' | 'won' | 'active' | 'completed' | 'cancelled' | 'lost' | 'tender';

interface ProjectInfoEditorProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    budget: number;
    agency_fee_percentage: number;
    start_date: string | null;
    end_date: string | null;
    client_id: string | null;
  };
  canEdit: boolean;
  onUpdate: () => void;
}

export function ProjectInfoEditor({ project, canEdit, onUpdate }: ProjectInfoEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status,
    budget: project.budget.toString(),
    agency_fee_percentage: project.agency_fee_percentage.toString(),
    start_date: project.start_date || '',
    end_date: project.end_date || '',
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Το όνομα είναι υποχρεωτικό');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          budget: parseFloat(formData.budget) || 0,
          agency_fee_percentage: parseFloat(formData.agency_fee_percentage) || 0,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Οι πληροφορίες ενημερώθηκαν!');
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      budget: project.budget.toString(),
      agency_fee_percentage: project.agency_fee_percentage.toString(),
      start_date: project.start_date || '',
      end_date: project.end_date || '',
    });
    setEditing(false);
  };

  const statusOptions = [
    { value: 'lead', label: 'Lead' },
    { value: 'proposal', label: 'Πρόταση' },
    { value: 'negotiation', label: 'Διαπραγμάτευση' },
    { value: 'active', label: 'Ενεργό' },
    { value: 'completed', label: 'Ολοκληρώθηκε' },
    { value: 'cancelled', label: 'Ακυρώθηκε' },
    { value: 'lost', label: 'Χάθηκε' },
  ];

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Πληροφορίες Έργου</h3>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Επεξεργασία
            </Button>
          )}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Όνομα</p>
            <p className="font-medium">{project.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Κατάσταση</p>
            <p className="font-medium">
              {statusOptions.find(s => s.value === project.status)?.label}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Περιγραφή</p>
            <p className="font-medium">{project.description || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="font-medium">€{project.budget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Agency Fee</p>
            <p className="font-medium">{project.agency_fee_percentage}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Έναρξη</p>
            <p className="font-medium">
              {project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Λήξη</p>
            <p className="font-medium">
              {project.end_date ? format(new Date(project.end_date), 'dd/MM/yyyy') : '-'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Επεξεργασία Πληροφοριών</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Ακύρωση
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Αποθήκευση
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Όνομα</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="status">Κατάσταση</Label>
          <Select
            value={formData.status}
            onValueChange={(value: ProjectStatus) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Περιγραφή</Label>
          <Textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Budget (€)</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="100"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency_fee">Agency Fee (%)</Label>
          <Input
            id="agency_fee"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={formData.agency_fee_percentage}
            onChange={(e) => setFormData({ ...formData, agency_fee_percentage: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Ημερομηνία Έναρξης</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">Ημερομηνία Λήξης</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
