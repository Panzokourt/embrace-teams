import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { MediaPlanBaselineCompare } from '@/components/media-plan/MediaPlanBaselineCompare';
import { MediaPlanExportDialog } from '@/components/media-plan/MediaPlanExportDialog';
import { MediaPlanPastePreview, type ParsedRow } from '@/components/media-plan/MediaPlanPastePreview';
import { MediaPlanAIWizard } from '@/components/media-plan/MediaPlanAIWizard';
import { toast } from 'sonner';

export default function MediaPlanWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeView, setActiveView] = useState<'table' | 'gantt' | 'calendar' | 'board'>('table');
  const [groupBy, setGroupBy] = useState('none');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [importing, setImporting] = useState(false);

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

  // Fetch snapshot data
  const { data: snapshotData = [] } = useQuery({
    queryKey: ['media-plan-snapshot-data', selectedSnapshotId],
    queryFn: async () => {
      if (!selectedSnapshotId) return [];
      const { data, error } = await supabase
        .from('media_plan_snapshots' as any)
        .select('snapshot_data')
        .eq('id', selectedSnapshotId)
        .single();
      if (error) throw error;
      return ((data as any)?.snapshot_data || []) as any[];
    },
    enabled: !!selectedSnapshotId,
  });

  // Fetch sibling versions
  const { data: versions = [] } = useQuery({
    queryKey: ['media-plan-versions', plan?.project_id, plan?.name],
    queryFn: async () => {
      if (!plan?.project_id) return [];
      const { data } = await supabase
        .from('media_plans')
        .select('id, name, version')
        .eq('project_id', plan.project_id)
        .order('version', { ascending: true });
      return (data || []) as { id: string; name: string; version: number }[];
    },
    enabled: !!plan?.project_id,
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

  const handleUpdateName = async (name: string) => {
    if (!id || !name.trim()) return;
    await supabase.from('media_plans').update({ name: name.trim() }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['media-plan', id] });
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!id) return;
    await supabase.from('media_plans').update({ notes } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['media-plan', id] });
  };

  const handleAddAction = async () => {
    if (!id) return;
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order || 0));
    const insertData: any = {
      media_plan_id: id,
      medium: 'TBD',
      title: 'New Action',
      status: 'draft',
      sort_order: maxOrder + 1,
    };
    if (plan?.project_id) insertData.project_id = plan.project_id;
    const { error } = await supabase.from('media_plan_items').insert(insertData);
    if (error) {
      toast.error('Error: ' + error.message);
      return;
    }
    refetchItems();
  };

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

  // Paste handler
  const handlePaste = (text: string) => {
    setPasteText(text);
    setPasteOpen(true);
  };

  const handlePasteConfirm = async (rows: ParsedRow[]) => {
    if (!id) return;
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order || 0));
    const inserts = rows.map((row, i) => {
      const insertData: any = {
        media_plan_id: id,
        title: row.title,
        medium: row.medium || 'TBD',
        placement: row.placement || null,
        objective: row.objective || null,
        funnel_stage: row.funnel_stage || null,
        start_date: row.start_date || null,
        end_date: row.end_date || null,
        budget: row.budget,
        status: row.status || 'draft',
        priority: row.priority || 'medium',
        kpi_target: row.kpi_target || null,
        notes: row.notes || null,
        sort_order: maxOrder + i + 1,
      };
      if (plan?.project_id) insertData.project_id = plan.project_id;
      return insertData;
    });

    const { error } = await supabase.from('media_plan_items').insert(inserts);
    if (error) {
      toast.error('Import failed: ' + error.message);
    } else {
      toast.success(`${rows.length} rows imported`);
      refetchItems();
    }
  };

  // Excel import handler
  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setImporting(true);
    try {
      const fileContents: { name: string; content: string }[] = [];
      
      for (const file of Array.from(files)) {
        const text = await file.text();
        fileContents.push({ name: file.name, content: text });
      }

      const { data, error } = await supabase.functions.invoke('analyze-media-plan-excel', {
        body: {
          fileContents,
          planContext: `Plan: ${plan?.name}, Budget: €${plan?.total_budget || 0}`,
        },
      });

      if (error) throw error;
      if (!data?.items?.length) {
        toast.error('No items could be extracted from the files');
        return;
      }

      // Convert AI results to ParsedRow format for preview
      const tsvLines = data.items.map((item: any) =>
        [item.title, item.medium, item.placement, item.objective, item.funnel_stage,
         item.start_date, item.end_date, item.budget, item.status, item.priority,
         item.kpi_target, item.notes].join('\t')
      );
      const header = 'Title\tChannel\tPlacement\tObjective\tFunnel\tStart\tEnd\tBudget\tStatus\tPriority\tKPI\tNotes';
      setPasteText(header + '\n' + tsvLines.join('\n'));
      setPasteOpen(true);
      toast.success(`Extracted ${data.items.length} items from ${files.length} file(s)`);
    } catch (err: any) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSwitchVersion = (versionId: string) => {
    navigate(`/media-planning/${versionId}`);
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
    notes: (plan as any).notes || null,
    client_name: enrichment?.client_name,
    project_name: enrichment?.project_name,
    owner_name: enrichment?.owner_name,
  };

  return (
    <div className="page-shell">
      {/* Hidden file input for Excel import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        multiple
        className="hidden"
        onChange={handleFileSelected}
      />

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
        onUpdateNotes={handleUpdateNotes}
        onExport={() => setExportOpen(true)}
        onAIGenerate={() => setAiWizardOpen(true)}
        onImportExcel={handleImportExcel}
        version={plan.version}
        versions={versions.length > 1 ? versions : undefined}
        onSwitchVersion={handleSwitchVersion}
        baselineControls={
          <MediaPlanBaselineCompare
            planId={id!}
            items={items}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={setSelectedSnapshotId}
          />
        }
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

      {importing && (
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Analyzing uploaded files with AI...
        </div>
      )}

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
          compareMode={compareMode}
          snapshotData={snapshotData}
          onPaste={handlePaste}
        />
      )}

      {activeView === 'gantt' && (
        <MediaPlanGantt
          items={items as any}
          onSelectItem={handleSelectItem}
          selectedItemId={selectedItemId}
          onInlineUpdate={handleInlineUpdate}
          groupBy={groupBy}
        />
      )}

      {activeView === 'calendar' && (
        <MediaPlanCalendar
          items={items as any}
          onSelectItem={handleSelectItem}
        />
      )}

      {activeView === 'board' && (
        <MediaPlanBoard
          items={items as any}
          onSelectItem={handleSelectItem}
          selectedItemId={selectedItemId}
          onInlineUpdate={handleInlineUpdate}
          profiles={profiles}
        />
      )}

      {/* Detail panel */}
      <MediaPlanDetailPanel
        item={selectedItem as any}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdate={handleInlineUpdate}
        profiles={profiles}
        planId={id}
      />

      {/* Export dialog */}
      <MediaPlanExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        plan={planForHeader}
        items={items}
        summary={summary}
        profiles={profiles}
      />

      {/* Paste preview */}
      <MediaPlanPastePreview
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        pastedText={pasteText}
        onConfirm={handlePasteConfirm}
      />

      {/* AI Wizard */}
      <MediaPlanAIWizard
        open={aiWizardOpen}
        onClose={() => setAiWizardOpen(false)}
        planId={id!}
        projectId={plan.project_id}
        projectName={enrichment?.project_name || plan.name}
        totalBudget={plan.total_budget || 0}
        periodStart={plan.period_start}
        periodEnd={plan.period_end}
        onGenerated={() => refetchItems()}
      />
    </div>
  );
}
