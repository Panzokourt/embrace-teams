import { useMemo, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, GROUP_BY_OPTIONS, type MediaActionStatus } from './mediaConstants';
import { getChannelGroup } from './channelTaxonomy';
import { Plus, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface MediaActionRow {
  id: string;
  title: string | null;
  medium: string;
  placement: string | null;
  category: string | null;
  objective: string | null;
  funnel_stage: string | null;
  status: string | null;
  priority: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  daily_budget: number | null;
  kpi_target: string | null;
  owner_id: string | null;
  notes: string | null;
  phase: string | null;
  sort_order: number | null;
}

interface MediaPlanTableProps {
  items: MediaActionRow[];
  profiles: { id: string; full_name: string }[];
  groupBy: string;
  onGroupByChange: (value: string) => void;
  onSelectItem: (id: string) => void;
  selectedItemId: string | null;
  onInlineUpdate: (id: string, field: string, value: any) => void;
  onAddAction: () => void;
}

export function MediaPlanTable({
  items,
  profiles,
  groupBy,
  onGroupByChange,
  onSelectItem,
  selectedItemId,
  onInlineUpdate,
  onAddAction,
}: MediaPlanTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { 'All Actions': items };
    const map: Record<string, MediaActionRow[]> = {};
    items.forEach(item => {
      let key = 'Ungrouped';
      if (groupBy === 'medium') key = item.medium || 'No Channel';
      else if (groupBy === 'objective') key = item.objective || 'No Objective';
      else if (groupBy === 'funnel_stage') key = item.funnel_stage || 'No Stage';
      else if (groupBy === 'owner_id') {
        const p = profiles.find(p => p.id === item.owner_id);
        key = p?.full_name || 'Unassigned';
      }
      else if (groupBy === 'status') key = STATUS_LABELS[item.status as MediaActionStatus] || item.status || 'No Status';
      else if (groupBy === 'phase') key = item.phase || 'No Phase';
      else if (groupBy === 'category') key = item.category || 'No Category';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [items, groupBy, profiles]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return '—';
    return profiles.find(p => p.id === ownerId)?.full_name || '—';
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Group by:</span>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={onAddAction}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8" />
              <TableHead className="min-w-[200px] sticky left-0 bg-muted/30 z-10">Title</TableHead>
              <TableHead className="min-w-[140px]">Channel</TableHead>
              <TableHead className="min-w-[100px]">Placement</TableHead>
              <TableHead className="min-w-[120px]">Objective</TableHead>
              <TableHead className="min-w-[100px]">Funnel</TableHead>
              <TableHead className="min-w-[100px]">Owner</TableHead>
              <TableHead className="min-w-[90px]">Start</TableHead>
              <TableHead className="min-w-[90px]">End</TableHead>
              <TableHead className="min-w-[90px] text-right">Budget</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
              <TableHead className="min-w-[80px]">Priority</TableHead>
              <TableHead className="min-w-[100px]">KPI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(grouped).map(([groupLabel, groupItems]) => {
              const isCollapsed = collapsedGroups.has(groupLabel);
              const groupBudget = groupItems.reduce((sum, i) => sum + (i.budget || 0), 0);
              return (
                <GroupSection
                  key={groupLabel}
                  label={groupLabel}
                  count={groupItems.length}
                  budget={groupBudget}
                  isCollapsed={isCollapsed}
                  showGroupHeader={groupBy !== 'none'}
                  onToggle={() => toggleGroup(groupLabel)}
                >
                  {!isCollapsed && groupItems.map(item => (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer transition-colors ${
                        selectedItemId === item.id ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => onSelectItem(item.id)}
                    >
                      <TableCell className="w-8 text-muted-foreground/30">
                        <GripVertical className="h-3.5 w-3.5" />
                      </TableCell>
                      <TableCell className="font-medium sticky left-0 bg-card z-10">
                        {item.title || item.medium || 'Untitled'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{item.medium}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{item.placement || '—'}</TableCell>
                      <TableCell className="text-xs">{item.objective || '—'}</TableCell>
                      <TableCell className="text-xs">{item.funnel_stage || '—'}</TableCell>
                      <TableCell className="text-xs">{getOwnerName(item.owner_id)}</TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {item.start_date ? format(new Date(item.start_date), 'dd/MM') : '—'}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {item.end_date ? format(new Date(item.end_date), 'dd/MM') : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {item.budget != null ? `€${item.budget.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell>
                        {item.status && (
                          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[item.status as MediaActionStatus] || ''}`}>
                            {STATUS_LABELS[item.status as MediaActionStatus] || item.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.priority && (
                          <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[item.priority] || ''}`}>
                            {PRIORITY_LABELS[item.priority] || item.priority}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.kpi_target || '—'}</TableCell>
                    </TableRow>
                  ))}
                </GroupSection>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GroupSection({
  label,
  count,
  budget,
  isCollapsed,
  showGroupHeader,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  budget: number;
  isCollapsed: boolean;
  showGroupHeader: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  if (!showGroupHeader) return <>{children}</>;
  return (
    <>
      <TableRow className="bg-muted/50 cursor-pointer hover:bg-muted/70" onClick={onToggle}>
        <TableCell colSpan={13} className="py-2">
          <div className="flex items-center gap-2">
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span className="text-sm font-semibold">{label}</span>
            <Badge variant="secondary" className="text-[10px]">{count}</Badge>
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">€{budget.toLocaleString()}</span>
          </div>
        </TableCell>
      </TableRow>
      {children}
    </>
  );
}
