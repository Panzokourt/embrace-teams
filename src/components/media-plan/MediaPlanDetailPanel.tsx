import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { STATUS_LABELS, MEDIA_ACTION_STATUSES, FUNNEL_STAGES, PRIORITIES, PRIORITY_LABELS, COST_TYPES, OBJECTIVES } from './mediaConstants';
import { getAllChannels, getChannelGroup } from './channelTaxonomy';
import { X, LinkIcon, Plus } from 'lucide-react';
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
}

interface MediaPlanDetailPanelProps {
  item: MediaAction | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  profiles?: { id: string; full_name: string }[];
}

export function MediaPlanDetailPanel({ item, open, onClose, onUpdate, profiles = [] }: MediaPlanDetailPanelProps) {
  if (!item) return null;

  const update = (field: string, value: any) => onUpdate(item.id, field, value);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0">
        <SheetHeader className="px-6 pt-6 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Action Details</SheetTitle>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] px-6 pb-6">
          <div className="space-y-5">
            {/* Basic */}
            <Section title="Basic Info">
              <Field label="Title">
                <Input value={item.title || ''} onChange={e => update('title', e.target.value)} />
              </Field>
              <Field label="Channel">
                <Select value={item.medium} onValueChange={v => update('medium', v)}>
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
                <Input value={item.placement || ''} onChange={e => update('placement', e.target.value)} />
              </Field>
              <Field label="Category">
                <Input value={item.category || ''} onChange={e => update('category', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select value={item.status || 'draft'} onValueChange={v => update('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEDIA_ACTION_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={item.priority || 'medium'} onValueChange={v => update('priority', v)}>
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
                <Select value={item.owner_id || ''} onValueChange={v => update('owner_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Select owner..." /></SelectTrigger>
                  <SelectContent>
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
                <Select value={item.objective || ''} onValueChange={v => update('objective', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Funnel Stage">
                <Select value={item.funnel_stage || ''} onValueChange={v => update('funnel_stage', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {FUNNEL_STAGES.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Audience">
                <Input value={item.audience || ''} onChange={e => update('audience', e.target.value)} />
              </Field>
              <Field label="Geography">
                <Input value={item.geography || ''} onChange={e => update('geography', e.target.value)} />
              </Field>
              <Field label="Format">
                <Input value={item.format || ''} onChange={e => update('format', e.target.value)} />
              </Field>
            </Section>

            <Separator />

            {/* Timing & Budget */}
            <Section title="Timing & Budget">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <Input type="date" value={item.start_date || ''} onChange={e => update('start_date', e.target.value || null)} />
                </Field>
                <Field label="End Date">
                  <Input type="date" value={item.end_date || ''} onChange={e => update('end_date', e.target.value || null)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Budget">
                  <Input type="number" value={item.budget ?? ''} onChange={e => update('budget', e.target.value ? Number(e.target.value) : null)} />
                </Field>
                <Field label="Daily Budget">
                  <Input type="number" value={item.daily_budget ?? ''} onChange={e => update('daily_budget', e.target.value ? Number(e.target.value) : null)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost Type">
                  <Select value={item.cost_type || ''} onValueChange={v => update('cost_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="KPI Target">
                  <Input value={item.kpi_target || ''} onChange={e => update('kpi_target', e.target.value)} />
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Messaging */}
            <Section title="Messaging">
              <Field label="Message Summary">
                <Textarea value={item.message_summary || ''} onChange={e => update('message_summary', e.target.value)} rows={3} />
              </Field>
              <Field label="Notes">
                <Textarea value={item.notes || ''} onChange={e => update('notes', e.target.value)} rows={3} />
              </Field>
            </Section>
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
