import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import type { IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';

const STAGE_TYPES = [
  { value: 'request', label: 'Αίτημα' },
  { value: 'review', label: 'Αξιολόγηση' },
  { value: 'approval', label: 'Έγκριση' },
  { value: 'kickoff', label: 'Εκκίνηση' },
  { value: 'internal', label: 'Εσωτερικό βήμα' },
];

const AVAILABLE_FIELDS = [
  { id: 'title', label: 'Τίτλος' },
  { id: 'description', label: 'Περιγραφή' },
  { id: 'client', label: 'Πελάτης' },
  { id: 'budget', label: 'Προϋπολογισμός' },
  { id: 'urgency', label: 'Επείγον' },
  { id: 'deadline', label: 'Προθεσμία' },
  { id: 'attachments', label: 'Αρχεία' },
  { id: 'category', label: 'Κατηγορία' },
];

interface WorkflowSidePanelProps {
  stage: IntakeWorkflowStage;
  onUpdate: (updates: Partial<IntakeWorkflowStage>) => void;
  onClose: () => void;
}

export function WorkflowSidePanel({ stage, onUpdate, onClose }: WorkflowSidePanelProps) {
  const [name, setName] = useState(stage.name);
  const [stageType, setStageType] = useState(stage.stage_type);
  const [slaHours, setSlaHours] = useState(stage.sla_hours?.toString() || '');
  const [notifyOnEnter, setNotifyOnEnter] = useState(stage.notify_on_enter);
  const [autoAdvance, setAutoAdvance] = useState(stage.auto_advance);
  const [requiredFields, setRequiredFields] = useState<string[]>((stage.required_fields as string[]) || []);

  useEffect(() => {
    setName(stage.name);
    setStageType(stage.stage_type);
    setSlaHours(stage.sla_hours?.toString() || '');
    setNotifyOnEnter(stage.notify_on_enter);
    setAutoAdvance(stage.auto_advance);
    setRequiredFields((stage.required_fields as string[]) || []);
  }, [stage.id]);

  const handleSave = () => {
    onUpdate({
      name: name.trim() || stage.name,
      stage_type: stageType,
      sla_hours: slaHours ? parseInt(slaHours) : null,
      notify_on_enter: notifyOnEnter,
      auto_advance: autoAdvance,
      required_fields: requiredFields,
    });
  };

  const toggleField = (id: string) => {
    setRequiredFields(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-card border-l border-border/50 z-20 flex flex-col shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <h3 className="text-sm font-semibold">Ρυθμίσεις Κόμβου</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Όνομα</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Τύπος</Label>
          <Select value={stageType} onValueChange={setStageType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>SLA (ώρες)</Label>
          <Input type="number" value={slaHours} onChange={e => setSlaHours(e.target.value)} placeholder="Προαιρετικό" />
        </div>
        <div className="space-y-2">
          <Label>Υποχρεωτικά πεδία</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {AVAILABLE_FIELDS.map(f => (
              <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={requiredFields.includes(f.id)} onCheckedChange={() => toggleField(f.id)} />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Ειδοποίηση εισόδου</Label>
          <Switch checked={notifyOnEnter} onCheckedChange={setNotifyOnEnter} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Αυτόματη προώθηση</Label>
          <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
        </div>
      </div>
      <div className="p-4 border-t border-border/40">
        <Button className="w-full" onClick={handleSave}>Αποθήκευση αλλαγών</Button>
      </div>
    </div>
  );
}
