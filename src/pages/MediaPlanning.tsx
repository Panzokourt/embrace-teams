import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { MonitorPlay, Plus, Copy, Archive, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PLAN_STATUS_LABELS, STATUS_COLORS, type MediaPlanStatus } from '@/components/media-plan/mediaConstants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MediaPlanRow {
  id: string;
  name: string;
  status: string;
  total_budget: number | null;
  period_start: string | null;
  period_end: string | null;
  objective: string | null;
  updated_at: string | null;
  created_at: string | null;
  client_id: string | null;
  project_id: string | null;
  owner_id: string | null;
  company_id: string | null;
  clients?: { name: string } | null;
  projects?: { name: string } | null;
  owner?: { full_name: string } | null;
  _items_count?: number;
  _channels_count?: number;
}

export default function MediaPlanning() {
  const navigate = useNavigate();
  const { profile, company } = useAuth();
  const companyId = company?.id;
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>('');

  const { data: plans = [], isLoading, refetch } = useQuery({
    queryKey: ['media-plans-index', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Fetch plans that belong to this company (via company_id or via project)
      const { data, error } = await supabase
        .from('media_plans')
        .select('id, name, status, total_budget, period_start, period_end, objective, updated_at, created_at, client_id, project_id, owner_id, company_id')
        .or(`company_id.eq.${companyId},project_id.not.is.null`)
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // Enrich with client/project/owner names and item counts
      const planIds = (data || []).map(p => p.id);
      const projectIds = [...new Set((data || []).map(p => p.project_id).filter(Boolean))];
      const clientIds = [...new Set((data || []).map(p => p.client_id).filter(Boolean))];
      const ownerIds = [...new Set((data || []).map(p => p.owner_id).filter(Boolean))];

      const [itemsRes, projectsRes, clientsRes, ownersRes] = await Promise.all([
        planIds.length > 0
          ? supabase.from('media_plan_items').select('media_plan_id, medium').in('media_plan_id', planIds)
          : { data: [] },
        projectIds.length > 0
          ? supabase.from('projects').select('id, name').in('id', projectIds as string[])
          : { data: [] },
        clientIds.length > 0
          ? supabase.from('clients').select('id, name').in('id', clientIds as string[])
          : { data: [] },
        ownerIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', ownerIds as string[])
          : { data: [] },
      ]);

      const itemsByPlan = new Map<string, { count: number; channels: Set<string> }>();
      (itemsRes.data || []).forEach((item: any) => {
        const entry = itemsByPlan.get(item.media_plan_id) || { count: 0, channels: new Set<string>() };
        entry.count++;
        if (item.medium) entry.channels.add(item.medium);
        itemsByPlan.set(item.media_plan_id, entry);
      });

      const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p.name]));
      const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c.name]));
      const ownerMap = new Map((ownersRes.data || []).map((o: any) => [o.id, o.full_name]));

      return (data || []).map(p => ({
        ...p,
        clients: p.client_id ? { name: clientMap.get(p.client_id) || '' } : null,
        projects: p.project_id ? { name: projectMap.get(p.project_id) || '' } : null,
        owner: p.owner_id ? { full_name: ownerMap.get(p.owner_id) || '' } : null,
        _items_count: itemsByPlan.get(p.id)?.count || 0,
        _channels_count: itemsByPlan.get(p.id)?.channels.size || 0,
      })) as MediaPlanRow[];
    },
    enabled: !!companyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-mp', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('projects').select('id, name').eq('company_id', companyId).order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  const filtered = useMemo(() => {
    let list = plans;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.clients?.name?.toLowerCase().includes(q) ||
        p.projects?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [plans, search]);

  const grouped = useMemo(() => {
    if (groupBy === 'all') return { 'All Plans': filtered };
    const map: Record<string, MediaPlanRow[]> = {};
    filtered.forEach(p => {
      let key = 'Ungrouped';
      if (groupBy === 'client') key = p.clients?.name || 'No Client';
      else if (groupBy === 'project') key = p.projects?.name || 'No Project';
      else if (groupBy === 'status') key = PLAN_STATUS_LABELS[p.status as MediaPlanStatus] || p.status;
      else if (groupBy === 'owner') key = p.owner?.full_name || 'No Owner';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filtered, groupBy]);

  const handleCreate = async () => {
    if (!newName.trim() || !companyId) return;
    const insertData: any = {
      name: newName.trim(),
      status: 'draft',
      company_id: companyId,
      created_by: profile?.id,
    };
    if (newProjectId) {
      insertData.project_id = newProjectId;
      const proj = projects.find(p => p.id === newProjectId);
      // Auto-fill from project if available
    }
    const { data, error } = await supabase.from('media_plans').insert(insertData).select('id').single();
    if (error) {
      toast.error('Σφάλμα δημιουργίας: ' + error.message);
      return;
    }
    toast.success('Το media plan δημιουργήθηκε');
    setCreateOpen(false);
    setNewName('');
    setNewProjectId('');
    navigate(`/media-planning/${data.id}`);
  };

  const getStatusBadge = (status: string) => {
    const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-muted text-muted-foreground';
    const label = PLAN_STATUS_LABELS[status as MediaPlanStatus] || status;
    return <Badge variant="outline" className={colors}>{label}</Badge>;
  };

  return (
    <div className="page-shell">
      <PageHeader
        icon={MonitorPlay}
        title="Media Planning"
        subtitle="Σχεδιασμός και διαχείριση media plans"
        breadcrumbs={[{ label: 'Work', href: '/work' }, { label: 'Media Planning' }]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Media Plan
          </Button>
        }
        tabs={
          <Tabs value={groupBy} onValueChange={setGroupBy}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="client">By Client</TabsTrigger>
              <TabsTrigger value="project">By Project</TabsTrigger>
              <TabsTrigger value="status">By Status</TabsTrigger>
              <TabsTrigger value="owner">By Owner</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search plans..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs h-9"
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No media plans found.</p>
          <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create your first media plan
          </Button>
        </div>
      ) : (
        Object.entries(grouped).map(([groupLabel, items]) => (
          <div key={groupLabel} className="space-y-2">
            {groupBy !== 'all' && (
              <h3 className="text-sm font-semibold text-muted-foreground mt-4">{groupLabel} ({items.length})</h3>
            )}
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    <TableHead className="text-right">Channels</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(plan => (
                    <TableRow
                      key={plan.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/media-planning/${plan.id}`)}
                    >
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-muted-foreground">{plan.clients?.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{plan.projects?.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{plan.owner?.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {plan.period_start && plan.period_end
                          ? `${format(new Date(plan.period_start), 'dd/MM/yy')} – ${format(new Date(plan.period_end), 'dd/MM/yy')}`
                          : '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(plan.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {plan.total_budget != null ? `€${plan.total_budget.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{plan._items_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{plan._channels_count}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {plan.updated_at ? format(new Date(plan.updated_at), 'dd/MM/yy') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Media Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Q2 2026 Campaign" />
            </div>
            <div>
              <Label>Link to Project (optional)</Label>
              <Select value={newProjectId} onValueChange={setNewProjectId}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
