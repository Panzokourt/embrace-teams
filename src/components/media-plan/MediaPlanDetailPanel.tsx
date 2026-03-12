import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { STATUS_LABELS, MEDIA_ACTION_STATUSES, FUNNEL_STAGES, PRIORITIES, PRIORITY_LABELS, COST_TYPES, OBJECTIVES } from './mediaConstants';
import { getAllChannels, getChannelGroup } from './channelTaxonomy';
import { MediaPlanAttachments } from './MediaPlanAttachments';
import { Lock, Unlock, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface MediaAction {
  id: string;
  title: string | null;
  medium: string;
  placement: string | null;
  category: string | null;
  subchannel: string | null;
  objective: string | null;
  funnel_stage: string | null;
  audience: string | null;
  geography: string | null;
  format: string | null;
  message_summary: string | null;
  start_date: string | null;
  end_date: string | null;
  duration: number | null;
  budget: number | null;
  daily_budget: number | null;
  kpi_target: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  tags: string[] | null;
  cost_type: string | null;
  approval_needed: boolean | null;
  owner_id: string | null;
  sort_order: number | null;
  is_locked?: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  media_plan_id?: string;
}

interface MediaPlanDetailPanelProps {
  item: MediaAction | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  profiles?: { id: string; full_name: string }[];
  planId?: string;
}

/** Hook: local state that syncs from prop, saves onBlur */
function useLocalField(value: string | number | null | undefined) {
  const [local, setLocal] = useState(String(value ?? ''));
  useEffect(() => { setLocal(String(value ?? '')); }, [value]);
  return [local, setLocal] as const;
}

export function MediaPlanDetailPanel({ item, open, onClose, onUpdate, profiles = [], planId }: MediaPlanDetailPanelProps) {
  if (!item) return null;

  const isLocked = item.is_locked === true;
  const save = (field: string, value: any) => {
    if (isLocked && field !== 'is_locked') return;
    onUpdate(item.id, field, value);
  };
  const effectivePlanId = planId || item.media_plan_id || '';

  // Local state for all text/number inputs
  const [title, setTitle] = useLocalField(item.title);
  const [placement, setPlacement] = useLocalField(item.placement);
  const [category, setCategory] = useLocalField(item.category);
  const [audience, setAudience] = useLocalField(item.audience);
  const [geography, setGeography] = useLocalField(item.geography);
  const [fmt, setFmt] = useLocalField(item.format);
  const [startDate, setStartDate] = useLocalField(item.start_date);
  const [endDate, setEndDate] = useLocalField(item.end_date);
  const [budget, setBudget] = useLocalField(item.budget);
  const [dailyBudget, setDailyBudget] = useLocalField(item.daily_budget);
  const [kpiTarget, setKpiTarget] = useLocalField(item.kpi_target);
  const [messageSummary, setMessageSummary] = useLocalField(item.message_summary);
  const [notes, setNotes] = useLocalField(item.notes);

  const approverName = item.approved_by
    ? profiles.find(p => p.id === item.approved_by)?.full_name || 'Unknown'
    : null;

  const blurSave = (field: string, val: string, type: 'text' | 'number' | 'date' = 'text') => {
    if (type === 'number') save(field, val ? Number(val) : null);
    else if (type === 'date') save(field, val || null);
    else save(field, val);
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0">
        <SheetHeader className="px-6 pt-6 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Action Details</SheetTitle>
            <div className="flex items-center gap-2">
              {isLocked && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">
                  <Lock className="h-3 w-3 mr-1" /> Locked
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] px-6 pb-6">
          <div className="space-y-5">
            {/* Lock & Approval Controls */}
            <Section title="Governance">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  Lock Row
                </Label>
                <Switch
                  checked={isLocked}
                  onCheckedChange={v => onUpdate(item.id, 'is_locked', v)}
                />
              </div>
              {item.approved_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border bg-muted/30 p-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                  <span>Approved by {approverName} on {format(new Date(item.approved_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
              {!item.approved_at && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onUpdate(item.id, 'approved_at', new Date().toISOString());
                    onUpdate(item.id, 'approved_by', profiles.find(p => true)?.id || null);
                  }}
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve Action
                </Button>
              )}
            </Section>

            <Separator />

            {/* Basic */}
            <Section title="Basic Info">
              <Field label="Title">
                <Input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => blurSave('title', title)} disabled={isLocked} />
              </Field>
              <Field label="Channel">
                <Select value={item.medium} onValueChange={v => save('medium', v)} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getAllChannels().map(ch => (
                      <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {item.medium && (
                <div className="text-xs text-muted-foreground">Group: {getChannelGroup(item.medium) || '—'}</div>
              )}
              <Field label="Placement">
                <Input value={placement} onChange={e => setPlacement(e.target.value)} onBlur={() => blurSave('placement', placement)} disabled={isLocked} />
              </Field>
              <Field label="Category">
                <Input value={category} onChange={e => setCategory(e.target.value)} onBlur={() => blurSave('category', category)} disabled={isLocked} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select value={item.status || 'draft'} onValueChange={v => save('status', v)} disabled={isLocked}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEDIA_ACTION_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={item.priority || 'medium'} onValueChange={v => save('priority', v)} disabled={isLocked}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Owner">
                <Select value={item.owner_id || '__none__'} onValueChange={v => save('owner_id', v === '__none__' ? null : v)} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="Select owner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Separator />

            {/* Planning */}
            <Section title="Planning">
              <Field label="Objective">
                <Select value={item.objective || '__none__'} onValueChange={v => save('objective', v === '__none__' ? null : v)} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {OBJECTIVES.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Funnel Stage">
                <Select value={item.funnel_stage || '__none__'} onValueChange={v => save('funnel_stage', v === '__none__' ? null : v)} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {FUNNEL_STAGES.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Audience">
                <Input value={audience} onChange={e => setAudience(e.target.value)} onBlur={() => blurSave('audience', audience)} disabled={isLocked} />
              </Field>
              <Field label="Geography">
                <Input value={geography} onChange={e => setGeography(e.target.value)} onBlur={() => blurSave('geography', geography)} disabled={isLocked} />
              </Field>
              <Field label="Format">
                <Input value={fmt} onChange={e => setFmt(e.target.value)} onBlur={() => blurSave('format', fmt)} disabled={isLocked} />
              </Field>
            </Section>

            <Separator />

            {/* Timing & Budget */}
            <Section title="Timing & Budget">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} onBlur={() => blurSave('start_date', startDate, 'date')} disabled={isLocked} />
                </Field>
                <Field label="End Date">
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onBlur={() => blurSave('end_date', endDate, 'date')} disabled={isLocked} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Budget">
                  <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} onBlur={() => blurSave('budget', budget, 'number')} disabled={isLocked} />
                </Field>
                <Field label="Daily Budget">
                  <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} onBlur={() => blurSave('daily_budget', dailyBudget, 'number')} disabled={isLocked} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost Type">
                  <Select value={item.cost_type || '__none__'} onValueChange={v => save('cost_type', v === '__none__' ? null : v)} disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {COST_TYPES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="KPI Target">
                  <Input value={kpiTarget} onChange={e => setKpiTarget(e.target.value)} onBlur={() => blurSave('kpi_target', kpiTarget)} disabled={isLocked} />
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Messaging */}
            <Section title="Messaging">
              <Field label="Message Summary">
                <Textarea value={messageSummary} onChange={e => setMessageSummary(e.target.value)} onBlur={() => blurSave('message_summary', messageSummary)} rows={3} disabled={isLocked} />
              </Field>
              <Field label="Notes">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => blurSave('notes', notes)} rows={3} disabled={isLocked} />
              </Field>
            </Section>

            <Separator />

            {/* Attachments */}
            {effectivePlanId && (
              <MediaPlanAttachments
                itemId={item.id}
                planId={effectivePlanId}
                disabled={isLocked}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
