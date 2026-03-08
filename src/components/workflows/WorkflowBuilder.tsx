import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, ArrowLeft, Save } from 'lucide-react';
import { useWorkflowStages, type IntakeWorkflow, type IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';
import { WorkflowStageCard } from './WorkflowStageCard';
import { WorkflowStageDialog } from './WorkflowStageDialog';
import { toast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface WorkflowBuilderProps {
  workflow: IntakeWorkflow;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<IntakeWorkflow>) => Promise<boolean>;
}

export function WorkflowBuilder({ workflow, onBack, onUpdate }: WorkflowBuilderProps) {
  const { stages, addStage, updateStage, deleteStage } = useWorkflowStages(workflow.id);
  const [editingStage, setEditingStage] = useState<IntakeWorkflowStage | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description || '');
  const [autoCreate, setAutoCreate] = useState(workflow.auto_create_project);
  const [isActive, setIsActive] = useState(workflow.is_active);

  const handleSaveWorkflow = async () => {
    const ok = await onUpdate(workflow.id, {
      name,
      description: description || null,
      auto_create_project: autoCreate,
      is_active: isActive,
    });
    if (ok) toast({ title: 'Workflow saved' });
  };

  const handleSaveStage = async (data: Partial<IntakeWorkflowStage>) => {
    if (data.id) {
      await updateStage(data.id, data);
    } else {
      await addStage(data);
    }
  };

  const handleDeleteStage = async (id: string) => {
    await deleteStage(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleSaveWorkflow} className="gap-2">
          <Save className="h-4 w-4" /> Save Workflow
        </Button>
      </div>

      {/* Workflow settings */}
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Workflow Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={1} />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-sm">Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoCreate} onCheckedChange={setAutoCreate} />
            <Label className="text-sm">Auto-create project on approval</Label>
          </div>
        </div>
      </Card>

      {/* Pipeline visual */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Pipeline Stages</h3>
          <Button size="sm" variant="outline" onClick={() => { setEditingStage(null); setStageDialogOpen(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Stage
          </Button>
        </div>

        {stages.length === 0 ? (
          <Card className="p-8 flex flex-col items-center justify-center text-center border-dashed">
            <p className="text-sm text-muted-foreground mb-3">No stages defined yet. Start by adding stages to your pipeline.</p>
            <Button size="sm" onClick={() => { setEditingStage(null); setStageDialogOpen(true); }} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add First Stage
            </Button>
          </Card>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex items-center gap-0 pb-4 px-1">
              {stages.map((stage, i) => (
                <WorkflowStageCard
                  key={stage.id}
                  stage={stage}
                  isLast={i === stages.length - 1}
                  onEdit={(s) => { setEditingStage(s); setStageDialogOpen(true); }}
                  onDelete={handleDeleteStage}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      <WorkflowStageDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        stage={editingStage}
        onSave={handleSaveStage}
        nextSortOrder={stages.length}
      />
    </div>
  );
}
