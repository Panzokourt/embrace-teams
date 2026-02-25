import { useState } from 'react';
import { useGovernance } from '@/hooks/useGovernance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccessGrantForm } from '@/components/governance/AccessGrantForm';
import { AccessReviewQueue } from '@/components/governance/AccessReviewQueue';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export default function GovernanceAccess() {
  const { grants, grantsLoading, assets, roles, companyId, upsertGrant, reviewTasks, reviewTasksLoading } = useGovernance();
  const [showForm, setShowForm] = useState(false);

  const handleCompleteReview = async (taskId: string) => {
    await db.from('gov_review_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
  };

  const handleSkipReview = async (taskId: string) => {
    await db.from('gov_review_tasks').update({ status: 'skipped' }).eq('id', taskId);
  };

  if (grantsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Access Control</h1>
          <p className="text-muted-foreground">{grants.filter(g => g.status === 'active').length} ενεργές προσβάσεις</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Νέο Grant
        </Button>
      </div>

      <Tabs defaultValue="grants">
        <TabsList>
          <TabsTrigger value="grants">All Access Grants</TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews Due
            {reviewTasks.filter(t => t.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">{reviewTasks.filter(t => t.status === 'pending').length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grants">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Πρόσωπο</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Τύπος</TableHead>
                <TableHead>Ρόλος</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.person_name}</TableCell>
                  <TableCell>{g.person_email || '—'}</TableCell>
                  <TableCell>{g.asset?.asset_name || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{g.person_type}</Badge></TableCell>
                  <TableCell>{g.role_name_override || g.role?.role_name || '—'}</TableCell>
                  <TableCell><Badge variant={g.status === 'active' ? 'default' : 'secondary'}>{g.status}</Badge></TableCell>
                </TableRow>
              ))}
              {grants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Δεν υπάρχουν access grants.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="reviews">
          <AccessReviewQueue tasks={reviewTasks} onComplete={handleCompleteReview} onSkip={handleSkipReview} />
        </TabsContent>
      </Tabs>

      {showForm && companyId && (
        <AccessGrantForm
          open={showForm}
          onOpenChange={setShowForm}
          assets={assets}
          roles={roles}
          companyId={companyId}
          onSave={(data) => upsertGrant.mutate(data as any)}
        />
      )}
    </div>
  );
}
