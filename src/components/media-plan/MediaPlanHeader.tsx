import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PLAN_STATUS_LABELS, STATUS_COLORS, type MediaPlanStatus } from './mediaConstants';
import { Plus, ChevronDown, StickyNote, FileDown, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface MediaPlan {
  id: string;
  name: string;
  status: string;
  total_budget: number | null;
  period_start: string | null;
  period_end: string | null;
  objective: string | null;
  client_name?: string;
  project_name?: string;
  owner_name?: string;
  notes?: string | null;
}

interface SummaryData {
  totalBudget: number;
  allocatedBudget: number;
  actionsCount: number;
  activeChannels: number;
  linkedTasks: number;
}

interface MediaPlanHeaderProps {
  plan: MediaPlan;
  summary: SummaryData;
  onAddAction: () => void;
  onUpdateName: (name: string) => void;
  onUpdateNotes?: (notes: string) => void;
  baselineControls?: React.ReactNode;
  onExport?: () => void;
  version?: number | null;
  versions?: { id: string; name: string; version: number }[];
  onSwitchVersion?: (id: string) => void;
}

export function MediaPlanHeader({ plan, summary, onAddAction, onUpdateName, onUpdateNotes, baselineControls, onExport, version, versions, onSwitchVersion }: MediaPlanHeaderProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(plan.name);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesValue, setNotesValue] = useState(plan.notes || '');

  const remaining = summary.totalBudget - summary.allocatedBudget;
  const allocationPct = summary.totalBudget > 0 ? Math.round((summary.allocatedBudget / summary.totalBudget) * 100) : 0;
  const isOverBudget = remaining < 0;

  const statusColors = STATUS_COLORS[plan.status as keyof typeof STATUS_COLORS] || 'bg-muted text-muted-foreground';
  const statusLabel = PLAN_STATUS_LABELS[plan.status as MediaPlanStatus] || plan.status;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {editingName ? (
              <Input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={() => { setEditingName(false); onUpdateName(nameValue); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setEditingName(false); onUpdateName(nameValue); }
                  if (e.key === 'Escape') { setEditingName(false); setNameValue(plan.name); }
                }}
                className="text-xl font-semibold h-auto py-1 px-2 -ml-2"
                autoFocus
              />
            ) : (
              <h1
                className="text-xl font-semibold tracking-tight cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditingName(true)}
              >
                {plan.name}
              </h1>
            )}
            <Badge variant="outline" className={statusColors}>{statusLabel}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            {plan.client_name && <span>Client: <span className="text-foreground">{plan.client_name}</span></span>}
            {plan.project_name && <span>Project: <span className="text-foreground">{plan.project_name}</span></span>}
            {plan.owner_name && <span>Owner: <span className="text-foreground">{plan.owner_name}</span></span>}
            {plan.period_start && plan.period_end && (
              <span>{format(new Date(plan.period_start), 'dd/MM/yy')} – {format(new Date(plan.period_end), 'dd/MM/yy')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {baselineControls}
          <Button size="sm" onClick={onAddAction}>
            <Plus className="h-4 w-4 mr-1" /> Add Action
          </Button>
        </div>
      </div>

      {/* Notes / Assumptions */}
      {onUpdateNotes && (
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <StickyNote className="h-3 w-3 mr-1" />
              Notes & Assumptions
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${notesOpen ? 'rotate-180' : ''}`} />
              {plan.notes && !notesOpen && (
                <Badge variant="secondary" className="ml-1.5 text-[9px]">Has notes</Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              onBlur={() => onUpdateNotes(notesValue)}
              placeholder="Add plan-level notes, assumptions, or context..."
              rows={3}
              className="mt-1 text-sm"
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryCard label="Total Budget" value={`€${summary.totalBudget.toLocaleString()}`} />
        <SummaryCard label="Allocated" value={`€${summary.allocatedBudget.toLocaleString()}`} subtitle={`${allocationPct}%`} />
        <SummaryCard
          label="Remaining"
          value={`€${Math.abs(remaining).toLocaleString()}`}
          className={isOverBudget ? 'text-destructive' : 'text-green-600 dark:text-green-400'}
          subtitle={isOverBudget ? 'Over budget' : undefined}
        />
        <SummaryCard label="Actions" value={String(summary.actionsCount)} />
        <SummaryCard label="Channels" value={String(summary.activeChannels)} />
        <SummaryCard label="Linked Tasks" value={String(summary.linkedTasks)} />
        {plan.objective && <SummaryCard label="Objective" value={plan.objective} />}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subtitle, className }: { label: string; value: string; subtitle?: string; className?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${className || ''}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
