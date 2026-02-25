import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProjectMediaPlan } from '@/components/projects/ProjectMediaPlan';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X, Target, Megaphone, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectPlanningTabProps {
  projectId: string;
  projectName: string;
  projectBudget: number;
  agencyFeePercentage: number;
  deliverables: { id: string; name: string; budget?: number | null }[];
}

export function ProjectPlanningTab({
  projectId,
  projectName,
  projectBudget,
  agencyFeePercentage,
  deliverables,
}: ProjectPlanningTabProps) {
  const [objectives, setObjectives] = useState('');
  const [editingObjectives, setEditingObjectives] = useState(false);
  const [objectivesDraft, setObjectivesDraft] = useState('');

  useEffect(() => {
    async function loadObjectives() {
      const { data } = await supabase
        .from('projects')
        .select('description')
        .eq('id', projectId)
        .single();
      if (data?.description) setObjectives(data.description);
    }
    loadObjectives();
  }, [projectId]);

  const totalAllocated = deliverables.reduce((s, d) => s + (d.budget || 0), 0);
  const netBudget = projectBudget - (projectBudget * agencyFeePercentage) / 100;

  return (
    <div className="space-y-6">
      {/* Section 1: Objectives */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Στόχοι Έργου
            </CardTitle>
            {!editingObjectives && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                setObjectivesDraft(objectives);
                setEditingObjectives(true);
              }}>
                <Pencil className="h-3 w-3 mr-1" /> Επεξεργασία
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingObjectives ? (
            <div className="space-y-2">
              <Textarea
                value={objectivesDraft}
                onChange={e => setObjectivesDraft(e.target.value)}
                rows={4}
                placeholder="Περιγράψτε τους στόχους του έργου..."
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingObjectives(false)}>
                  <X className="h-3 w-3 mr-1" /> Ακύρωση
                </Button>
                <Button size="sm" onClick={async () => {
                  await supabase.from('projects').update({ description: objectivesDraft }).eq('id', projectId);
                  setObjectives(objectivesDraft);
                  setEditingObjectives(false);
                  toast.success('Οι στόχοι ενημερώθηκαν');
                }}>
                  <Save className="h-3 w-3 mr-1" /> Αποθήκευση
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {objectives || 'Δεν έχουν οριστεί στόχοι ακόμα. Κάντε κλικ στο Επεξεργασία.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Media Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Media Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ProjectMediaPlan
            projectId={projectId}
            projectName={projectName}
            projectBudget={projectBudget}
            agencyFeePercentage={agencyFeePercentage}
            deliverables={deliverables.map(d => ({ id: d.id, name: d.name }))}
          />
        </CardContent>
      </Card>

      {/* Section 3: Budget Allocation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Κατανομή Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν παραδοτέα με budget.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Παραδοτέο</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">% Net Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverables.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{d.name}</TableCell>
                    <TableCell className="text-sm text-right">€{(d.budget || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {netBudget > 0 ? `${(((d.budget || 0) / netBudget) * 100).toFixed(1)}%` : '–'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Σύνολο</TableCell>
                  <TableCell className="text-right">€{totalAllocated.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {netBudget > 0 ? `${((totalAllocated / netBudget) * 100).toFixed(1)}%` : '–'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
