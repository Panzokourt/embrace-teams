import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIntakeWorkflows, useIntakeRequests, useWorkflowStages, type IntakeWorkflow } from '@/hooks/useIntakeWorkflows';
import { toast } from '@/hooks/use-toast';

interface IntakeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflows: IntakeWorkflow[];
  onCreated?: () => void;
}

export function IntakeRequestDialog({ open, onOpenChange, workflows, onCreated }: IntakeRequestDialogProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const { stages } = useWorkflowStages(selectedWorkflowId || null);
  const { createRequest, addHistory } = useIntakeRequests();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});

  const activeWorkflows = workflows.filter(w => w.is_active);
  const firstStage = stages[0] || null;
  const requiredFields = (firstStage?.required_fields as string[]) || [];

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setFormData({});
      setSelectedWorkflowId(activeWorkflows[0]?.id || '');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedWorkflowId || !title.trim()) return;
    const req = await createRequest({
      workflow_id: selectedWorkflowId,
      title: title.trim(),
      description: description || null,
      form_data: formData,
      current_stage_id: firstStage?.id || null,
      status: 'in_progress',
    });
    if (req) {
      await addHistory({
        request_id: req.id,
        stage_id: firstStage?.id || null,
        action: 'entered',
        comment: 'Request submitted',
      });
      toast({ title: 'Request submitted!' });
      onOpenChange(false);
      onCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Intake Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Workflow</Label>
            <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
              <SelectTrigger><SelectValue placeholder="Select workflow" /></SelectTrigger>
              <SelectContent>
                {activeWorkflows.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Request title" />
          </div>
          {requiredFields.includes('description') && (
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          )}
          {requiredFields.filter(f => !['title', 'description'].includes(f)).map(field => (
            <div key={field} className="space-y-1.5">
              <Label className="capitalize">{field}</Label>
              <Input
                value={formData[field] || ''}
                onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder={field}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedWorkflowId || !title.trim()}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
