import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, GitCompare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MediaPlanBaselineCompareProps {
  planId: string;
  items: any[];
  compareMode: boolean;
  onCompareModeChange: (v: boolean) => void;
  selectedSnapshotId: string | null;
  onSelectSnapshot: (id: string | null) => void;
}

export function MediaPlanBaselineCompare({
  planId,
  items,
  compareMode,
  onCompareModeChange,
  selectedSnapshotId,
  onSelectSnapshot,
}: MediaPlanBaselineCompareProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [saveOpen, setSaveOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('Baseline');

  const { data: snapshots = [] } = useQuery({
    queryKey: ['media-plan-snapshots', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_plan_snapshots' as any)
        .select('*')
        .eq('media_plan_id', planId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const saveSnapshot = useMutation({
    mutationFn: async () => {
      const snapshotData = items.map(i => ({
        id: i.id,
        title: i.title,
        medium: i.medium,
        budget: i.budget,
        daily_budget: i.daily_budget,
        start_date: i.start_date,
        end_date: i.end_date,
        status: i.status,
        priority: i.priority,
        objective: i.objective,
        funnel_stage: i.funnel_stage,
        kpi_target: i.kpi_target,
      }));
      const { error } = await supabase.from('media_plan_snapshots' as any).insert({
        media_plan_id: planId,
        name: snapshotName.trim() || 'Baseline',
        snapshot_data: snapshotData,
        created_by: profile?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Snapshot saved');
      queryClient.invalidateQueries({ queryKey: ['media-plan-snapshots', planId] });
      setSaveOpen(false);
      setSnapshotName('Baseline');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSnapshot = async (snapId: string) => {
    await supabase.from('media_plan_snapshots' as any).delete().eq('id', snapId);
    queryClient.invalidateQueries({ queryKey: ['media-plan-snapshots', planId] });
    if (selectedSnapshotId === snapId) {
      onSelectSnapshot(null);
      onCompareModeChange(false);
    }
    toast.success('Snapshot deleted');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save baseline */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Camera className="h-3.5 w-3.5 mr-1" /> Save Snapshot
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Baseline Snapshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Snapshot name..."
              value={snapshotName}
              onChange={e => setSnapshotName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Saves the current state of {items.length} actions for comparison.
            </p>
            <Button onClick={() => saveSnapshot.mutate()} disabled={saveSnapshot.isPending} className="w-full">
              {saveSnapshot.isPending ? 'Saving...' : 'Save Snapshot'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare toggle */}
      {snapshots.length > 0 && (
        <>
          <Select
            value={selectedSnapshotId || ''}
            onValueChange={v => {
              onSelectSnapshot(v || null);
              onCompareModeChange(!!v);
            }}
          >
            <SelectTrigger className="h-8 w-48 text-xs">
              <GitCompare className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Compare with..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Comparison</SelectItem>
              {snapshots.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {format(new Date(s.created_at), 'dd/MM HH:mm')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {compareMode && (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px]">
              Comparing
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Helper: get baseline delta for an item
 */
export function getBaselineDelta(
  itemId: string,
  field: string,
  currentValue: any,
  snapshotData: any[]
): { changed: boolean; oldValue: any; direction?: 'up' | 'down' } | null {
  if (!snapshotData || snapshotData.length === 0) return null;
  const baselineItem = snapshotData.find((s: any) => s.id === itemId);
  if (!baselineItem) return { changed: true, oldValue: null };
  const oldValue = baselineItem[field];
  if (oldValue === currentValue) return { changed: false, oldValue };
  const isNumber = typeof currentValue === 'number' && typeof oldValue === 'number';
  return {
    changed: true,
    oldValue,
    direction: isNumber ? (currentValue > oldValue ? 'up' : 'down') : undefined,
  };
}
