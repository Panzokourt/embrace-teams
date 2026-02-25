import { useGovernance } from '@/hooks/useGovernance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditTimeline } from '@/components/governance/AuditTimeline';
import { ChecklistManager } from '@/components/governance/ChecklistManager';
import { Loader2 } from 'lucide-react';

export default function GovernanceCompliance() {
  const { auditEvents, auditLoading, checklists, checklistsLoading } = useGovernance();

  if (auditLoading || checklistsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance & Audit</h1>
        <p className="text-muted-foreground">Audit log, checklists και review workflows</p>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <AuditTimeline events={auditEvents} />
        </TabsContent>

        <TabsContent value="checklists">
          <ChecklistManager checklists={checklists} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
