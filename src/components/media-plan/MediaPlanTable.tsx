import { useMemo, useState, useEffect, useRef } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, GROUP_BY_OPTIONS, MEDIA_ACTION_STATUSES, PRIORITIES, type MediaActionStatus } from './mediaConstants';
import { getAllChannels } from './channelTaxonomy';
import { Plus, GripVertical, ChevronDown, ChevronRight, Lock, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { getBaselineDelta } from './MediaPlanBaselineCompare';
import { cn } from '@/lib/utils';

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
  is_locked?: boolean;
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
  compareMode?: boolean;
  snapshotData?: any[];
  onPaste?: (text: string) => void;
}

// ── Inline Editable Cell ─────────────────────────────────────────────────────
function EditableCell({ value, type = 'text', onSave, className, placeholder, disabled }: {
  value: string | number | null | undefined;
  type?: 'text' | 'number' | 'date';
  onSave: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocal(String(value ?? '')); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => { setEditing(false); onSave(local); };
  const cancel = () => { setEditing(false); setLocal(String(value ?? '')); };

  if (disabled) {
    return <span className={className}>{value || '—'}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        onClick={e => e.stopPropagation()}
        className={cn(
          'w-full bg-background border border-primary/40 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40',
          className
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      className={cn('cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5 min-h-[24px] flex items-center group text-xs', className)}
    >
      <span className="flex-1 truncate">
        {type === 'number' && value != null ? `€${Number(value).toLocaleString()}` :
         type === 'date' && value ? format(new Date(String(value)), 'dd/MM') :
         value || <span className="text-muted-foreground/40">{placeholder || '—'}</span>}
      </span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-muted-foreground ml-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ── Inline Select Cell ───────────────────────────────────────────────────────
function InlineSelectCell({ value, options, onSave, disabled, renderValue }: {
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
  disabled?: boolean;
  renderValue?: React.ReactNode;
}) {
  if (disabled) return <>{renderValue || value || '—'}</>;
  return (
    <div onClick={e => e.stopPropagation()}>
      <Select value={value || '__none__'} onValueChange={v => onSave(v === '__none__' ? '' : v)}>
        <SelectTrigger className="h-6 text-[10px] border-transparent hover:border-primary/30 bg-transparent focus:ring-0 focus:ring-offset-0 px-1 min-w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
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
  compareMode = false,
  snapshotData = [],
  onPaste,
}: MediaPlanTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && text.includes('\t') && text.includes('\n') && onPaste) {
      e.preventDefault();
      onPaste(text);
    }
  };

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

  const channelOptions = getAllChannels().map(ch => ({ value: ch, label: ch }));
  const statusOptions = MEDIA_ACTION_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }));
  const priorityOptions = PRIORITIES.map(p => ({ value: p, label: PRIORITY_LABELS[p] }));
  const ownerOptions = [
    { value: '__none__', label: '— None —' },
    ...profiles.map(p => ({ value: p.id, label: p.full_name })),
  ];

  return (
    <div className="space-y-2" onPaste={handlePaste}>
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
              <TableHead className="min-w-[100px]">Start</TableHead>
              <TableHead className="min-w-[100px]">End</TableHead>
              <TableHead className="min-w-[100px] text-right">Budget</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
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
                  {!isCollapsed && groupItems.map(item => {
                    const locked = item.is_locked === true;
                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedItemId === item.id ? 'bg-accent' : 'hover:bg-accent/50',
                          locked ? 'opacity-80' : ''
                        )}
                        onClick={() => onSelectItem(item.id)}
                      >
                        <TableCell className="w-8 text-muted-foreground/30">
                          {locked ? (
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <GripVertical className="h-3.5 w-3.5" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium sticky left-0 bg-card z-10">
                          <EditableCell
                            value={item.title || item.medium || 'Untitled'}
                            onSave={v => onInlineUpdate(item.id, 'title', v)}
                            disabled={locked}
                            placeholder="Untitled"
                          />
                          {locked && (
                            <Badge variant="outline" className="ml-2 text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400">Locked</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <InlineSelectCell
                            value={item.medium}
                            options={channelOptions}
                            onSave={v => onInlineUpdate(item.id, 'medium', v)}
                            disabled={locked}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.placement}
                            onSave={v => onInlineUpdate(item.id, 'placement', v || null)}
                            disabled={locked}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell className="text-xs">{item.objective || '—'}</TableCell>
                        <TableCell className="text-xs">{item.funnel_stage || '—'}</TableCell>
                        <TableCell>
                          <InlineSelectCell
                            value={item.owner_id || '__none__'}
                            options={ownerOptions}
                            onSave={v => onInlineUpdate(item.id, 'owner_id', v === '__none__' ? null : v)}
                            disabled={locked}
                            renderValue={<span className="text-xs">{getOwnerName(item.owner_id)}</span>}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.start_date}
                            type="date"
                            onSave={v => onInlineUpdate(item.id, 'start_date', v || null)}
                            disabled={locked}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.end_date}
                            type="date"
                            onSave={v => onInlineUpdate(item.id, 'end_date', v || null)}
                            disabled={locked}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {compareMode && snapshotData.length ? (
                            <BudgetCell
                              itemId={item.id}
                              budget={item.budget}
                              compareMode={compareMode}
                              snapshotData={snapshotData}
                            />
                          ) : (
                            <EditableCell
                              value={item.budget}
                              type="number"
                              onSave={v => onInlineUpdate(item.id, 'budget', v ? Number(v) : null)}
                              disabled={locked}
                              placeholder="—"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <InlineSelectCell
                            value={item.status || 'draft'}
                            options={statusOptions}
                            onSave={v => onInlineUpdate(item.id, 'status', v)}
                            disabled={locked}
                            renderValue={
                              item.status ? (
                                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[item.status as MediaActionStatus] || ''}`}>
                                  {STATUS_LABELS[item.status as MediaActionStatus] || item.status}
                                </Badge>
                              ) : undefined
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <InlineSelectCell
                            value={item.priority || 'medium'}
                            options={priorityOptions}
                            onSave={v => onInlineUpdate(item.id, 'priority', v)}
                            disabled={locked}
                            renderValue={
                              item.priority ? (
                                <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[item.priority] || ''}`}>
                                  {PRIORITY_LABELS[item.priority] || item.priority}
                                </Badge>
                              ) : undefined
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.kpi_target}
                            onSave={v => onInlineUpdate(item.id, 'kpi_target', v || null)}
                            disabled={locked}
                            placeholder="—"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </GroupSection>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BudgetCell({ itemId, budget, compareMode, snapshotData }: {
  itemId: string;
  budget: number | null;
  compareMode: boolean;
  snapshotData: any[];
}) {
  if (budget == null) return <span className="text-xs">—</span>;
  const display = `€${budget.toLocaleString()}`;

  if (!compareMode || !snapshotData.length) return <span className="text-xs">{display}</span>;

  const delta = getBaselineDelta(itemId, 'budget', budget, snapshotData);
  if (!delta || !delta.changed) return <span className="text-xs">{display}</span>;

  return (
    <span className="inline-flex items-center gap-0.5 text-xs">
      {display}
      {delta.direction === 'up' && <ArrowUp className="h-3 w-3 text-red-500" />}
      {delta.direction === 'down' && <ArrowDown className="h-3 w-3 text-green-500" />}
    </span>
  );
}

function GroupSection({
  label, count, budget, isCollapsed, showGroupHeader, onToggle, children,
}: {
  label: string; count: number; budget: number; isCollapsed: boolean;
  showGroupHeader: boolean; onToggle: () => void; children: React.ReactNode;
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
