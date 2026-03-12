import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { MonitorPlay, ArrowLeft, Table2, CalendarDays, GanttChart, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaPlanHeader } from '@/components/media-plan/MediaPlanHeader';
import { MediaPlanTable } from '@/components/media-plan/MediaPlanTable';
import { MediaPlanDetailPanel } from '@/components/media-plan/MediaPlanDetailPanel';
import { MediaPlanGantt } from '@/components/media-plan/MediaPlanGantt';
import { MediaPlanCalendar } from '@/components/media-plan/MediaPlanCalendar';
import { MediaPlanBoard } from '@/components/media-plan/MediaPlanBoard';
import { toast } from 'sonner';

export default function MediaPlanWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  const [activeView, setActiveView] = useState<'table' | 'gantt' | 'calendar' | 'board'>('table');
  const [groupBy, setGroupBy] = useState('none');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch plan
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['media-plan', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_plans')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch enrichment data
  const { data: enrichment } = useQuery({
    queryKey: ['media-plan-enrichment', plan?.client_id, plan?.project_id, plan?.owner_id],
    queryFn: async () => {
      const [clientRes, projectRes, ownerRes] = await Promise.all([
        plan?.client_id ? supabase.from('clients').select('name').eq('id', plan.client_id).single() : { data: null },
        plan?.project_id ? supabase.from('projects').select('name').eq('id', plan.project_id).single() : { data: null },
        plan?.owner_id ? supabase.from('profiles').select('full_name').eq('id', plan.owner_id).single() : { data: null },
      ]);
      return {
        client_name: clientRes.data?.name || undefined,
        project_name: projectRes.data?.name || undefined,
        owner_name: ownerRes.data?.full_name || undefined,
      };
    },
    enabled: !!plan,
  });

  // Fetch items
  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['media-plan-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_plan_items')
        .select('*')
        .eq('media_plan_id', id!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch team profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['company-profiles', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('status', 'active');
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch linked tasks count
  const { data: linkedTasksCount = 0 } = useQuery({
    queryKey: ['media-plan-tasks-count', id],
    queryFn: async () => {
      const itemIds = items.map(i => i.id);
      if (itemIds.length === 0) return 0;
      const { count } = await supabase
        .from('media_plan_item_tasks')
        .select('id', { count: 'exact', head: true })
        .in('media_plan_item_id', itemIds);
      return count || 0;
    },
    enabled: items.length > 0,
  });

  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId) || null, [items, selectedItemId]);

  const summary = useMemo(() => {
    const allocatedBudget = items.reduce((sum, i) => sum + (i.budget || 0), 0);
    const channels = new Set(items.map(i => i.medium).filter(Boolean));
    return {
      totalBudget: plan?.total_budget || 0,
      allocatedBudget,
      actionsCount: items.length,
      activeChannels: channels.size,
      linkedTasks: linkedTasksCount,
    };
  }, [items, plan?.total_budget, linkedTasksCount]);

  // Update plan name
  const handleUpdateName = async (name: string) => {
    if (!id || !name.trim()) return;
    await supabase.from('media_plans').update({ name: name.trim() }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['media-plan', id] });
  };

  // Add action
  const handleAddAction = async () => {
    if (!id || !plan?.project_id) return;
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order || 0));
    const { error } = await supabase.from('media_plan_items').insert({
      media_plan_id: id,
      project_id: plan.project_id,
      medium: 'TBD',
      title: 'New Action',
      status: 'draft',
      sort_order: maxOrder + 1,
    });
    if (error) {
      toast.error('Error: ' + error.message);
      return;
    }
    refetchItems();
  };

  // Inline update
  const handleInlineUpdate = useCallback(async (itemId: string, field: string, value: any) => {
    const { error } = await supabase
      .from('media_plan_items')
      .update({ [field]: value })
      .eq('id', itemId);
    if (error) toast.error('Update failed');
    else refetchItems();
  }, [refetchItems]);

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setDetailOpen(true);
  };

  if (planLoading) {
    return <div className="page-shell"><div className="text-center py-12 text-muted-foreground">Loading...</div></div>;
  }

  if (!plan) {
    return <div className="page-shell"><div className="text-center py-12 text-muted-foreground">Plan not found.</div></div>;
  }

  const planForHeader = {
    id: plan.id,
    name: plan.name,
    status: plan.status,
    total_budget: plan.total_budget,
    period_start: plan.period_start,
    period_end: plan.period_end,
    objective: plan.objective,
    client_name: enrichment?.client_name,
    project_name: enrichment?.project_name,
    owner_name: enrichment?.owner_name,
  };

  return (
    <div className="page-shell">
      <PageHeader
        icon={MonitorPlay}
        title=""
        breadcrumbs={[
          { label: 'Work', href: '/work' },
          { label: 'Media Planning', href: '/media-planning' },
          { label: plan.name },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/media-planning')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        }
      />

      <MediaPlanHeader
        plan={planForHeader}
        summary={summary}
        onAddAction={handleAddAction}
        onUpdateName={handleUpdateName}
      />

      {/* View switcher */}
      <Tabs value={activeView} onValueChange={v => setActiveView(v as any)}>
        <TabsList>
          <TabsTrigger value="table" className="gap-1.5">
            <Table2 className="h-3.5 w-3.5" /> Table
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1.5">
            <GanttChart className="h-3.5 w-3.5" /> Gantt
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5">
            <Columns className="h-3.5 w-3.5" /> Board
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main content */}
      {activeView === 'table' && (
        <MediaPlanTable
          items={items as any}
          profiles={profiles}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          onSelectItem={handleSelectItem}
          selectedItemId={selectedItemId}
          onInlineUpdate={handleInlineUpdate}
          onAddAction={handleAddAction}
        />
      )}

      {activeView === 'gantt' && (
        <MediaPlanGantt
          items={items as any}
          onSelectItem={handleSelectItem}
          selectedItemId={selectedItemId}
        />
      )}

      {activeView === 'calendar' && (
        <MediaPlanCalendar
          items={items as any}
          onSelectItem={handleSelectItem}
        />
      )}

      {/* Detail panel */}
      <MediaPlanDetailPanel
        item={selectedItem as any}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdate={handleInlineUpdate}
        profiles={profiles}
      />
    </div>
  );
}
