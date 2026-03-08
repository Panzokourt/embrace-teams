import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface ConnectionCondition {
  field?: string;
  op?: string;
  value?: string;
}

interface WorkflowConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string | null;
  label: string;
  condition: ConnectionCondition;
  onSave: (id: string, label: string, condition: ConnectionCondition) => void;
  onDelete: (id: string) => void;
}

const FIELDS = [
  { value: 'status', label: 'Κατάσταση' },
  { value: 'budget', label: 'Προϋπολογισμός' },
  { value: 'urgency', label: 'Επείγον' },
  { value: 'outcome', label: 'Αποτέλεσμα' },
];

const OPS = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
];

export function WorkflowConnectionDialog({ open, onOpenChange, connectionId, label: initLabel, condition: initCondition, onSave, onDelete }: WorkflowConnectionDialogProps) {
  const [label, setLabel] = useState(initLabel);
  const [field, setField] = useState(initCondition.field || '');
  const [op, setOp] = useState(initCondition.op || '=');
  const [value, setValue] = useState(initCondition.value || '');

  useEffect(() => {
    setLabel(initLabel);
    setField(initCondition.field || '');
    setOp(initCondition.op || '=');
    setValue(initCondition.value || '');
  }, [initLabel, initCondition, open]);

  if (!connectionId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Ρυθμίσεις Σύνδεσης</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ετικέτα</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="π.χ. Εγκρίθηκε" />
          </div>
          <div className="space-y-1.5">
            <Label>Συνθήκη (προαιρετική)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={field} onValueChange={setField}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Πεδίο" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Κανένα</SelectItem>
                  {FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={op} onValueChange={setOp}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Τιμή" className="text-xs" />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => { onDelete(connectionId); onOpenChange(false); }}>
            <Trash2 className="h-3.5 w-3.5" /> Διαγραφή
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button onClick={() => {
              const cond: ConnectionCondition = field ? { field, op, value } : {};
              onSave(connectionId, label, cond);
              onOpenChange(false);
            }}>Αποθήκευση</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
