import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';

const STAGE_TYPES = [
  { value: 'request', label: 'Request' },
  { value: 'review', label: 'Review' },
  { value: 'approval', label: 'Approval' },
  { value: 'kickoff', label: 'Kickoff' },
];

const AVAILABLE_FIELDS = [
  { id: 'title', label: 'Title' },
  { id: 'description', label: 'Description' },
  { id: 'client', label: 'Client' },
  { id: 'budget', label: 'Budget' },
  { id: 'urgency', label: 'Urgency' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'category', label: 'Category' },
];

interface WorkflowStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: IntakeWorkflowStage | null;
  onSave: (data: Partial<IntakeWorkflowStage>) => void;
  nextSortOrder: number;
}

export function WorkflowStageDialog({ open, onOpenChange, stage, onSave, nextSortOrder }: WorkflowStageDialogProps) {
  const [name, setName] = useState('');
  const [stageType, setStageType] = useState('review');
  const [slaHours, setSlaHours] = useState('');
  const [notifyOnEnter, setNotifyOnEnter] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setStageType(stage.stage_type);
      setSlaHours(stage.sla_hours?.toString() || '');
      setNotifyOnEnter(stage.notify_on_enter);
      setAutoAdvance(stage.auto_advance);
      setRequiredFields((stage.required_fields as string[]) || []);
    } else {
      setName('');
      setStageType('review');
      setSlaHours('');
      setNotifyOnEnter(true);
      setAutoAdvance(false);
      setRequiredFields([]);
    }
  }, [stage, open]);

  const toggleField = (fieldId: string) => {
    setRequiredFields(prev =>
      prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...(stage ? { id: stage.id } : {}),
      name: name.trim(),
      stage_type: stageType,
      sla_hours: slaHours ? parseInt(slaHours) : null,
      notify_on_enter: notifyOnEnter,
      auto_advance: autoAdvance,
      required_fields: requiredFields,
      sort_order: stage?.sort_order ?? nextSortOrder,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{stage ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Stage Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Manager Review" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={stageType} onValueChange={setStageType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SLA (hours)</Label>
            <Input type="number" value={slaHours} onChange={e => setSlaHours(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Required Fields</Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FIELDS.map(f => (
                <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={requiredFields.includes(f.id)} onCheckedChange={() => toggleField(f.id)} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Notify on enter</Label>
            <Switch checked={notifyOnEnter} onCheckedChange={setNotifyOnEnter} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Auto-advance</Label>
            <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
