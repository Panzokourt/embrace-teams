import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, GitBranch, Inbox, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIntakeWorkflows, useIntakeRequests, type IntakeWorkflow, type IntakeRequest } from '@/hooks/useIntakeWorkflows';
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';
import { IntakeRequestDialog } from '@/components/workflows/IntakeRequestDialog';
import { IntakeRequestsList } from '@/components/workflows/IntakeRequestsList';
import { IntakeRequestDetail } from '@/components/workflows/IntakeRequestDetail';
import { PageHeader } from '@/components/shared/PageHeader';

export default function Workflows() {
  const { workflows, loading, createWorkflow, updateWorkflow, deleteWorkflow } = useIntakeWorkflows();
  const { requests, loading: reqLoading, fetchRequests } = useIntakeRequests();
  const [activeTab, setActiveTab] = useState('workflows');
  const [editingWorkflow, setEditingWorkflow] = useState<IntakeWorkflow | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IntakeRequest | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const wf = await createWorkflow(newName.trim(), newDesc);
    if (wf) {
      setNewDialogOpen(false);
      setNewName('');
      setNewDesc('');
      setEditingWorkflow(wf);
    }
  };

  if (editingWorkflow) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <WorkflowBuilder
          workflow={editingWorkflow}
          onBack={() => setEditingWorkflow(null)}
          onUpdate={async (id, updates) => {
            const ok = await updateWorkflow(id, updates);
            if (ok) setEditingWorkflow(prev => prev ? { ...prev, ...updates } : prev);
            return ok;
          }}
        />
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <IntakeRequestDetail request={selectedRequest} onBack={() => { setSelectedRequest(null); fetchRequests(); }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader icon={GitBranch} title="Workflows" subtitle="Manage intake workflows and requests">
        <Button onClick={() => setRequestDialogOpen(true)} className="gap-1.5">
          <Inbox className="h-4 w-4" /> New Request
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Workflows</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setNewDialogOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Workflow
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : workflows.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No workflows yet. Create your first intake workflow.</p>
              <Button size="sm" onClick={() => setNewDialogOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create Workflow
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map(wf => (
                <Card
                  key={wf.id}
                  className="p-4 cursor-pointer hover:shadow-soft-lg transition-shadow"
                  onClick={() => setEditingWorkflow(wf)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{wf.name}</h3>
                      {wf.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{wf.description}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditingWorkflow(wf); }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteWorkflow(wf.id); }}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className={wf.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}>
                      {wf.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {wf.auto_create_project && (
                      <Badge variant="outline" className="bg-purple-500/15 text-purple-400 text-[10px]">Auto-project</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <IntakeRequestsList
            requests={requests}
            workflows={workflows}
            onSelect={setSelectedRequest}
          />
        </TabsContent>
      </Tabs>

      {/* New workflow dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Workflow</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Project Request Pipeline" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intake request dialog */}
      <IntakeRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        workflows={workflows}
        onCreated={fetchRequests}
      />
    </div>
  );
}
