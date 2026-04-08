import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Plus, Sparkles, Download, ChevronDown, ChevronRight, Loader2, ArrowLeft,
  DollarSign, Target, Trash2, Pencil, CheckCircle2, X, BarChart2,
  Calendar, Layout, AlertTriangle, FileText, Megaphone,
  TrendingUp, Info, ChevronUp, Search, SlidersHorizontal,
  RefreshCw, ClipboardList,
} from 'lucide-react';
import { format, parseISO, differenceInDays, addDays, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// ─── Types ──────────────────────────────────────────────────────────────────
interface MediaPlan {
  id: string;
  project_id: string;
  name: string;
  status: string;
  total_budget: number;
  agency_fee_percentage: number;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MediaPlanItem {
  id: string;
  project_id: string;
  media_plan_id: string | null;
  medium: string;
  placement: string | null;
  campaign_name: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  actual_cost: number;
  net_budget: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  objective: string;
  phase: string | null;
  format: string | null;
  frequency: number;
  commission_rate: number;
  target_audience: string | null;
  notes: string | null;
  status: string;
  deliverable_id: string | null;
  sort_order: number;
}

interface Deliverable { id: string; name: string; }

interface ProjectMediaPlanProps {
  projectId: string;
  projectName: string;
  projectBudget: number;
  agencyFeePercentage?: number;
  deliverables: Deliverable[];
}

type ViewMode = 'spreadsheet' | 'gantt' | 'calendar';

// ─── Constants ───────────────────────────────────────────────────────────────
const MEDIA_CATEGORIES: Record<string, string[]> = {
  'TV & Radio': ['TV', 'Radio', 'Streaming Audio', 'Podcast'],
  'Digital Paid': ['Google Ads (Search)', 'Google Ads (Display)', 'YouTube', 'Programmatic'],
  'Social Media': ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'Twitter/X', 'Pinterest'],
  'Outdoor': ['OOH (Billboards)', 'DOOH (Digital OOH)', 'Transit Ads'],
  'Print': ['Εφημερίδες', 'Περιοδικά', 'Advertorial', 'Native Content'],
  'Influencers/PR': ['Influencer', 'Ambassador', 'PR', 'Sponsored Content'],
  'Email/CRM': ['Email Marketing', 'SMS Marketing', 'Push Notifications'],
  'Events': ['Sponsorship', 'Events', 'Άλλο'],
};

const ALL_MEDIA = Object.values(MEDIA_CATEGORIES).flat();

const MEDIA_EMOJI: Record<string, string> = {
  'TV': '📺', 'Radio': '📻', 'Streaming Audio': '🎵', 'Podcast': '🎙️',
  'Google Ads (Search)': '🔍', 'Google Ads (Display)': '🖥️', 'YouTube': '▶️', 'Programmatic': '🤖',
  'Facebook': '📘', 'Instagram': '📸', 'TikTok': '🎶', 'LinkedIn': '💼', 'Twitter/X': '🐦', 'Pinterest': '📌',
  'OOH (Billboards)': '🏙️', 'DOOH (Digital OOH)': '💡', 'Transit Ads': '🚌',
  'Εφημερίδες': '📰', 'Περιοδικά': '📖', 'Advertorial': '📝', 'Native Content': '🗞️',
  'Influencer': '⭐', 'Ambassador': '🤝', 'PR': '📣', 'Sponsored Content': '💡',
  'Email Marketing': '📧', 'SMS Marketing': '💬', 'Push Notifications': '🔔',
  'Sponsorship': '🏅', 'Events': '🎪', 'Άλλο': '📌',
};

const OBJECTIVES = [
  { value: 'awareness', label: 'Brand Awareness', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'consideration', label: 'Consideration', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'conversion', label: 'Conversion', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'retention', label: 'Retention', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { value: 'launch', label: 'Product Launch', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  { value: 'engagement', label: 'Engagement', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { value: 'leads', label: 'Lead Generation', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
];

const ITEM_STATUS_OPTIONS = [
  { value: 'planned', label: 'Προγραμματισμένο' },
  { value: 'active', label: 'Ενεργό' },
  { value: 'completed', label: 'Ολοκληρώθηκε' },
  { value: 'cancelled', label: 'Ακυρώθηκε' },
];

const PLAN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground border-border' },
  { value: 'active', label: 'Ενεργό', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'approved', label: 'Εγκεκριμένο', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'cancelled', label: 'Ακυρώθηκε', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { value: 'archived', label: 'Αρχειοθετήθηκε', color: 'bg-muted/50 text-muted-foreground border-border' },
];

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const OBJECTIVE_COLORS: Record<string, string> = {
  awareness: '#6366f1', consideration: '#8b5cf6', conversion: '#10b981',
  retention: '#f97316', launch: '#ef4444', engagement: '#f59e0b', leads: '#06b6d4',
};

const CAMPAIGN_OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Brand Awareness', icon: '📢' },
  { value: 'launch', label: 'Product Launch', icon: '🚀' },
  { value: 'conversion', label: 'Sales / Conversion', icon: '💰' },
  { value: 'retention', label: 'Retention / Loyalty', icon: '🔄' },
  { value: 'engagement', label: 'Engagement', icon: '❤️' },
  { value: 'leads', label: 'Lead Generation', icon: '🎯' },
  { value: 'consideration', label: 'Consideration', icon: '🤔' },
];

const WIZARD_CHANNELS = [
  { key: 'TV & Radio', label: 'TV & Radio', icon: '📺' },
  { key: 'Digital Paid', label: 'Digital Paid', icon: '🔍' },
  { key: 'Social Media', label: 'Social Media', icon: '📱' },
  { key: 'Outdoor', label: 'Outdoor / OOH', icon: '🏙️' },
  { key: 'Print', label: 'Print & Native', icon: '📰' },
  { key: 'Influencers/PR', label: 'Influencers / PR', icon: '⭐' },
  { key: 'Email/CRM', label: 'Email / CRM', icon: '📧' },
  { key: 'Events', label: 'Events / Sponsorship', icon: '🎪' },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmt = (v: number) => `€${v.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtK = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`;

// ─── EditableCell ────────────────────────────────────────────────────────────
function EditableCell({ value, type = 'text', onSave, className, placeholder }: {
  value: string | number; type?: 'text' | 'number' | 'date';
  onSave: (v: string) => void; className?: string; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setLocal(String(value ?? '')); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); onSave(local); };
  const cancel = () => { setEditing(false); setLocal(String(value ?? '')); };
  if (editing) return (
    <input ref={inputRef} type={type} value={local}
      onChange={e => setLocal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
      className={cn('w-full bg-background border border-primary/40 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40', className)}
      placeholder={placeholder}
    />
  );
  return (
    <div onClick={() => setEditing(true)}
      className={cn('cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5 min-h-[28px] flex items-center group', className)}>
      <span className="flex-1 truncate">{!value || value === 0 ? <span className="text-muted-foreground/40">{placeholder || '—'}</span> : value}</span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-muted-foreground ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function SelectCell({ value, options, onSave }: {
  value: string; options: { value: string; label: string }[]; onSave: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onSave}>
      <SelectTrigger className="h-7 text-xs border-transparent hover:border-primary/30 bg-transparent focus:ring-0 focus:ring-offset-0 px-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── Plan Status Badge ────────────────────────────────────────────────────────
function PlanStatusBadge({ status, onSave }: { status: string; onSave: (v: string) => void }) {
  const opt = PLAN_STATUS_OPTIONS.find(o => o.value === status);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80', opt?.color)}>
          {opt?.label || status}
          <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PLAN_STATUS_OPTIONS.map(o => (
          <DropdownMenuItem key={o.value} onClick={() => onSave(o.value)}
            className={o.value === status ? 'font-semibold' : ''}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Wizard Types ─────────────────────────────────────────────────────────────
interface Phase { name: string; start: string; end: string; }
interface WizardState {
  step: 1 | 2 | 3;
  campaignObjectives: string[];
  targetAudience: string;
  phases: Phase[];
  selectedChannels: string[];
  budgetAllocation: Record<string, number>;
}

// ─── AI Wizard Modal ──────────────────────────────────────────────────────────
function AIWizardModal({ open, onClose, onGenerate, projectName, projectBudget, agencyFeePercentage, deliverables, generating }: {
  open: boolean; onClose: () => void;
  onGenerate: (w: WizardState) => void;
  projectName: string; projectBudget: number; agencyFeePercentage: number;
  deliverables: Deliverable[]; generating: boolean;
}) {
  const netBudget = projectBudget * (1 - agencyFeePercentage / 100);
  const [w, setW] = useState<WizardState>({
    step: 1,
    campaignObjectives: ['awareness'],
    targetAudience: '',
    phases: [{ name: 'Φάση 1 - Launching', start: '', end: '' }],
    selectedChannels: ['TV & Radio', 'Social Media', 'Digital Paid'],
    budgetAllocation: {},
  });

  const toggleObjective = (val: string) => {
    setW(prev => ({
      ...prev,
      campaignObjectives: prev.campaignObjectives.includes(val)
        ? prev.campaignObjectives.filter(o => o !== val)
        : [...prev.campaignObjectives, val],
    }));
  };

  const toggleChannel = (ch: string) => {
    setW(prev => ({
      ...prev,
      selectedChannels: prev.selectedChannels.includes(ch)
        ? prev.selectedChannels.filter(c => c !== ch)
        : [...prev.selectedChannels, ch],
    }));
  };

  const addPhase = () => {
    setW(prev => ({
      ...prev,
      phases: [...prev.phases, { name: `Φάση ${prev.phases.length + 1} - Sustaining`, start: '', end: '' }],
    }));
  };

  const removePhase = (idx: number) => {
    setW(prev => ({ ...prev, phases: prev.phases.filter((_, i) => i !== idx) }));
  };

  const updatePhase = (idx: number, field: keyof Phase, val: string) => {
    setW(prev => ({
      ...prev,
      phases: prev.phases.map((p, i) => i === idx ? { ...p, [field]: val } : p),
    }));
  };

  const canNext1 = w.campaignObjectives.length > 0;
  const canNext2 = w.selectedChannels.length > 0;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Media Plan Wizard
          </DialogTitle>
          <DialogDescription>Βήμα {w.step} από 3 · {projectName}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn('flex-1 h-1.5 rounded-full transition-colors', s <= w.step ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        {/* Step 1: Briefing */}
        {w.step === 1 && (
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Στόχοι καμπάνιας <span className="text-muted-foreground font-normal">(επιλέξτε όσους θέλετε)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CAMPAIGN_OBJECTIVE_OPTIONS.map(opt => {
                  const isSelected = w.campaignObjectives.includes(opt.value);
                  return (
                    <button key={opt.value} onClick={() => toggleObjective(opt.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all',
                        isSelected ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      )}>
                      <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Κοινό-στόχος</Label>
              <Textarea value={w.targetAudience} onChange={e => setW(p => ({ ...p, targetAudience: e.target.value }))}
                placeholder="π.χ. Γυναίκες 25-44, αστικές περιοχές, mobile-first, ενδιαφέρον για lifestyle..." rows={2} className="text-sm" />
            </div>

            {/* Campaign Phases */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Φάσεις καμπάνιας</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPhase} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Προσθήκη φάσης
                </Button>
              </div>
              <div className="space-y-2">
                {w.phases.map((phase, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_130px_130px_32px] gap-2 items-center p-2 rounded-lg bg-muted/30 border">
                    <Input value={phase.name} onChange={e => updatePhase(idx, 'name', e.target.value)}
                      placeholder="π.χ. Φάση 1 - Launching" className="h-8 text-sm" />
                    <Input type="date" value={phase.start} onChange={e => updatePhase(idx, 'start', e.target.value)} className="h-8 text-sm" />
                    <Input type="date" value={phase.end} onChange={e => updatePhase(idx, 'end', e.target.value)} className="h-8 text-sm" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removePhase(idx)} disabled={w.phases.length === 1}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Media Mix */}
        {w.step === 2 && (
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">Κανάλια καμπάνιας</Label>
              <div className="grid grid-cols-2 gap-2">
                {WIZARD_CHANNELS.map(ch => {
                  const isSelected = w.selectedChannels.includes(ch.key);
                  return (
                    <button key={ch.key} onClick={() => toggleChannel(ch.key)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                        isSelected ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                      )}>
                      <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50')}>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span>{ch.icon}</span> {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {w.selectedChannels.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block text-muted-foreground">
                  Κατανομή Budget <span className="text-xs">(προαιρετικό)</span> · Σύνολο: {Object.values(w.budgetAllocation).reduce((a, b) => a + b, 0)}%
                </Label>
                <div className="space-y-3">
                  {w.selectedChannels.map(ch => {
                    const val = w.budgetAllocation[ch] ?? 0;
                    return (
                      <div key={ch} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{WIZARD_CHANNELS.find(c => c.key === ch)?.icon} {ch}</span>
                          <span className="font-medium text-foreground">{val}%</span>
                        </div>
                        <Slider value={[val]} onValueChange={([v]) => setW(prev => ({ ...prev, budgetAllocation: { ...prev.budgetAllocation, [ch]: v } }))}
                          min={0} max={100} step={5} className="h-4" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {w.step === 3 && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Megaphone className="h-4 w-4 text-primary" />
                {projectName}
              </div>

              {/* Budget breakdown */}
              <div className="rounded-lg border bg-background p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Συνολικό Budget Έργου</span>
                  <span className="font-medium">{fmt(projectBudget)}</span>
                </div>
                {agencyFeePercentage > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agency Fee ({agencyFeePercentage}%)</span>
                    <span className="text-destructive">-{fmt(projectBudget * agencyFeePercentage / 100)}</span>
                  </div>
                )}
                <div className="border-t pt-1.5 flex justify-between text-sm">
                  <span className="font-semibold">Διαθέσιμο Net Budget</span>
                  <span className="font-bold text-primary">{fmt(netBudget)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs mb-0.5">Στόχοι</span>
                  <div className="flex flex-wrap gap-1">
                    {w.campaignObjectives.map(obj => {
                      const o = CAMPAIGN_OBJECTIVE_OPTIONS.find(x => x.value === obj);
                      return <Badge key={obj} variant="secondary" className="text-xs">{o?.icon} {o?.label}</Badge>;
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs mb-0.5">Κανάλια ({w.selectedChannels.length})</span>
                  <p className="text-xs">{w.selectedChannels.join(', ')}</p>
                </div>
              </div>

              {w.phases.length > 0 && (
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">Φάσεις</span>
                  <div className="space-y-0.5">
                    {w.phases.map((p, i) => (
                      <div key={i} className="text-xs flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">{p.start && p.end ? `${p.start} → ${p.end}` : 'Χωρίς ημερομηνίες'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {w.targetAudience && (
                <div>
                  <span className="text-muted-foreground block text-xs mb-0.5">Κοινό</span>
                  <p className="text-xs">{w.targetAudience}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {w.step > 1 && (
              <Button variant="outline" onClick={() => setW(p => ({ ...p, step: (p.step - 1) as 1 | 2 | 3 }))}>
                ← Πίσω
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Ακύρωση</Button>
            {w.step < 3 ? (
              <Button onClick={() => setW(p => ({ ...p, step: (p.step + 1) as 1 | 2 | 3 }))}
                disabled={(w.step === 1 && !canNext1) || (w.step === 2 && !canNext2)}>
                Επόμενο →
              </Button>
            ) : (
              <Button onClick={() => onGenerate(w)} disabled={generating}>
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Δημιουργία...</> : <><Sparkles className="h-4 w-4 mr-2" />Δημιουργία με AI</>}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gantt View ───────────────────────────────────────────────────────────────
function GanttView({ items, onItemUpdate }: { items: MediaPlanItem[]; onItemUpdate?: (id: string, updates: Partial<MediaPlanItem>) => void }) {
  const withDates = items.filter(i => i.start_date && i.end_date);

  const { getOverriddenDates, handleMouseDown: onDragStart, isDragging } = useGanttDrag({
    getDayWidth: () => {
      if (withDates.length === 0) return 5;
      const allS = withDates.map(i => parseISO(i.start_date!));
      const allE = withDates.map(i => parseISO(i.end_date!));
      const ts = allS.reduce((a, b) => a < b ? a : b);
      const te = allE.reduce((a, b) => a > b ? a : b);
      const td = differenceInDays(te, ts) + 1;
      return Math.max(800, 1200) / td;
    },
    onDragEnd: async (itemId, startDate, endDate) => {
      if (onItemUpdate) {
        onItemUpdate(itemId, { start_date: startDate, end_date: endDate });
      }
    },
  });

  if (withDates.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>Δεν υπάρχουν αντικείμενα με ημερομηνίες για εμφάνιση Gantt.</p>
        <p className="text-sm mt-1">Προσθέστε ημερομηνίες έναρξης/λήξης στα media items.</p>
      </div>
    );
  }

  const allStarts = withDates.map(i => parseISO(i.start_date!));
  const allEnds = withDates.map(i => parseISO(i.end_date!));
  const timelineStart = allStarts.reduce((a, b) => a < b ? a : b);
  const timelineEnd = allEnds.reduce((a, b) => a > b ? a : b);
  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;

  const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd });

  const byMedium: Record<string, MediaPlanItem[]> = {};
  withDates.forEach(i => {
    if (!byMedium[i.medium]) byMedium[i.medium] = [];
    byMedium[i.medium].push(i);
  });

  const getBarStyle = (item: MediaPlanItem) => {
    const dates = getOverriddenDates(item.id, item.start_date!, item.end_date!);
    const start = parseISO(dates.start);
    const end = parseISO(dates.end);
    const left = (differenceInDays(start, timelineStart) / totalDays) * 100;
    const width = Math.max((differenceInDays(end, start) + 1) / totalDays * 100, 1);
    return { left: `${left}%`, width: `${width}%` };
  };

  const color = (item: MediaPlanItem) => OBJECTIVE_COLORS[item.objective] || '#6366f1';

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: '800px' }}>
        {/* Header months */}
        <div className="flex border-b mb-2 sticky top-0 bg-background z-10">
          <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground py-2 px-3 border-r">Κανάλι / Placement</div>
          <div className="flex-1 relative overflow-hidden">
            <div className="flex">
              {months.map((month, idx) => {
                const monthDays = differenceInDays(
                  idx < months.length - 1 ? months[idx + 1] : addDays(timelineEnd, 1),
                  idx === 0 ? timelineStart : month
                );
                const width = (monthDays / totalDays) * 100;
                return (
                  <div key={month.toISOString()} style={{ width: `${width}%` }}
                    className="text-xs font-medium py-2 px-1 text-center text-muted-foreground border-r border-border/30">
                    {format(month, 'MMM yyyy', { locale: el })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rows */}
        {Object.entries(byMedium).map(([medium, mediumItems]) => (
          <div key={medium}>
            <div className="flex items-center bg-muted/30 border-y py-1.5">
              <div className="w-48 shrink-0 px-3 text-xs font-semibold">{medium}</div>
              <div className="flex-1" />
            </div>
            {mediumItems.map(item => (
              <div key={item.id} className="flex items-center border-b hover:bg-muted/10 group">
                <div className="w-48 shrink-0 px-3 py-2 text-xs text-muted-foreground truncate">
                  {item.campaign_name || item.placement || item.medium}
                </div>
                <div className="flex-1 relative h-8 mx-1">
                  <div className="absolute inset-y-0 flex items-center" style={getBarStyle(item)}>
                    <div
                      className="h-5 rounded-full relative w-full flex items-center px-2 text-xs text-white font-medium overflow-hidden cursor-grab group/bar"
                      style={{ backgroundColor: color(item), opacity: isDragging(item.id) ? 0.6 : 1 }}
                      title={`${item.campaign_name || item.medium} · ${fmt(item.budget)}`}
                      onMouseDown={(e) => {
                        if (item.start_date && item.end_date) {
                          onDragStart(e, item.id, 'move', item.start_date, item.end_date);
                        }
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/20 rounded-l-full z-10"
                        onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, item.id, 'resize-start', item.start_date!, item.end_date!); }}
                      />
                      <span className="truncate select-none">{fmt(item.budget)}</span>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/20 rounded-r-full z-10"
                        onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, item.id, 'resize-end', item.start_date!, item.end_date!); }}
                      />
                    </div>
                  </div>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {months.map((month, idx) => {
                      const monthDays = differenceInDays(
                        idx < months.length - 1 ? months[idx + 1] : addDays(timelineEnd, 1),
                        idx === 0 ? timelineStart : month
                      );
                      return (
                        <div key={month.toISOString()} style={{ width: `${(monthDays / totalDays) * 100}%` }}
                          className="border-r border-border/20 h-full" />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ items }: { items: MediaPlanItem[] }) {
  const withDates = items.filter(i => i.start_date || i.end_date);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const first = withDates.find(i => i.start_date);
    return first ? startOfMonth(parseISO(first.start_date!)) : startOfMonth(new Date());
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getItemsForDay = (day: Date) => {
    return items.filter(i => {
      if (!i.start_date && !i.end_date) return false;
      const start = i.start_date ? parseISO(i.start_date) : null;
      const end = i.end_date ? parseISO(i.end_date) : null;
      if (start && !end) return format(start, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      if (end && !start) return format(end, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      if (start && end) return day >= start && day <= end;
      return false;
    });
  };

  const dayOfWeekLabels = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];
  const firstDayOffset = (monthStart.getDay() + 6) % 7;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>←</Button>
        <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: el })}</h3>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>→</Button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {dayOfWeekLabels.map(d => (
          <div key={d} className="bg-muted/50 text-center text-xs font-medium py-2 text-muted-foreground">{d}</div>
        ))}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
        ))}
        {days.map(day => {
          const dayItems = getItemsForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <div key={day.toISOString()} className="bg-background min-h-[80px] p-1">
              <div className={cn('text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full', isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map(item => (
                  <div key={item.id} className="text-xs rounded px-1 py-0.5 truncate text-white"
                    style={{ backgroundColor: OBJECTIVE_COLORS[item.objective] || '#6366f1' }}
                    title={`${item.campaign_name || item.medium} · ${fmt(item.budget)}`}>
                    {item.campaign_name || item.medium}
                  </div>
                ))}
                {dayItems.length > 3 && <div className="text-xs text-muted-foreground px-1">+{dayItems.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Spreadsheet Row ──────────────────────────────────────────────────────────
function SpreadsheetRow({ item, deliverables, onUpdate, onDelete }: {
  item: MediaPlanItem; deliverables: Deliverable[];
  onUpdate: (id: string, field: string, value: string | number) => void;
  onDelete: (id: string) => void;
}) {
  const objOpt = OBJECTIVES.find(o => o.value === item.objective);

  return (
    <tr className="group hover:bg-muted/30 transition-colors border-b border-border/50">
      <td className="px-2 py-1 text-sm font-medium" style={{width:'180px', whiteSpace:'normal', wordBreak:'break-word'}}>
        <EditableCell value={item.campaign_name || ''} onSave={v => onUpdate(item.id, 'campaign_name', v)} placeholder="Όνομα καμπάνιας" />
      </td>
      <td className="px-2 py-1 text-sm" style={{width:'130px'}}>
        <SelectCell
          value={item.medium}
          options={ALL_MEDIA.map(m => ({ value: m, label: m }))}
          onSave={v => onUpdate(item.id, 'medium', v)}
        />
      </td>
      <td className="px-2 py-1 text-sm" style={{width:'90px', whiteSpace:'normal', wordBreak:'break-word'}}>
        <EditableCell value={item.format || ''} onSave={v => onUpdate(item.id, 'format', v)} placeholder="Format" />
      </td>
      <td className="px-2 py-1 text-sm" style={{width:'110px', whiteSpace:'normal', wordBreak:'break-word'}}>
        <EditableCell value={item.phase || ''} onSave={v => onUpdate(item.id, 'phase', v)} placeholder="Φάση" />
      </td>
      <td className="px-2 py-1" style={{width:'110px'}}>
        <SelectCell
          value={item.objective}
          options={OBJECTIVES.map(o => ({ value: o.value, label: o.label }))}
          onSave={v => onUpdate(item.id, 'objective', v)}
        />
      </td>
      <td className="px-2 py-1 text-sm" style={{width:'88px'}}>
        <EditableCell value={item.start_date || ''} type="date" onSave={v => onUpdate(item.id, 'start_date', v)} />
      </td>
      <td className="px-2 py-1 text-sm" style={{width:'88px'}}>
        <EditableCell value={item.end_date || ''} type="date" onSave={v => onUpdate(item.id, 'end_date', v)} />
      </td>
      <td className="px-2 py-1 text-sm text-right font-medium" style={{width:'80px', whiteSpace:'nowrap'}}>
        <EditableCell value={item.budget} type="number" onSave={v => onUpdate(item.id, 'budget', parseFloat(v) || 0)} className="text-right" />
      </td>
      <td className="px-2 py-1 text-sm text-right text-muted-foreground" style={{width:'80px', whiteSpace:'nowrap'}}>
        {fmt(item.net_budget || item.budget)}
      </td>
      <td className="px-2 py-1 text-sm text-right" style={{width:'80px', whiteSpace:'nowrap'}}>
        <EditableCell value={item.actual_cost} type="number" onSave={v => onUpdate(item.id, 'actual_cost', parseFloat(v) || 0)} className="text-right" />
      </td>
      <td className="px-2 py-1" style={{width:'110px'}}>
        <SelectCell
          value={item.status}
          options={ITEM_STATUS_OPTIONS}
          onSave={v => onUpdate(item.id, 'status', v)}
        />
      </td>
      <td className="px-2 py-1" style={{width:'32px'}}>
        <button onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Performance Projections Section ─────────────────────────────────────────
function ProjectionsSection({ items }: { items: MediaPlanItem[] }) {
  const [open, setOpen] = useState(false);

  const byMedium = useMemo(() => {
    const grouped: Record<string, { impressions: number; reach: number; clicks: number; ctr: number | null; cpm: number | null; cpc: number | null; count: number }> = {};
    items.forEach(item => {
      if (!grouped[item.medium]) grouped[item.medium] = { impressions: 0, reach: 0, clicks: 0, ctr: null, cpm: null, cpc: null, count: 0 };
      const g = grouped[item.medium];
      g.impressions += item.impressions || 0;
      g.reach += item.reach || 0;
      g.clicks += item.clicks || 0;
      if (item.cpm) g.cpm = (g.cpm || 0) + item.cpm;
      if (item.cpc) g.cpc = (g.cpc || 0) + item.cpc;
      g.count++;
    });
    // Average rates
    Object.values(grouped).forEach(g => {
      if (g.cpm) g.cpm = g.cpm / g.count;
      if (g.cpc) g.cpc = g.cpc / g.count;
      if (g.impressions > 0 && g.clicks > 0) g.ctr = (g.clicks / g.impressions) * 100;
    });
    return grouped;
  }, [items]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Performance Projections & Benchmarks
            <Badge variant="outline" className="text-xs">Βοηθητικό</Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Info className="h-3.5 w-3.5" />
            Εκτιμήσεις — συμπληρώστε ή υπολογίστε με AI
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Μέσο</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Εμφανίσεις</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Reach</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Clicks</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">CTR</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">CPM</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">CPC</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byMedium).map(([medium, stats]) => (
                <tr key={medium} className="border-b hover:bg-muted/10">
                  <td className="px-3 py-2">{medium}</td>
                  <td className="px-3 py-2 text-right">{stats.impressions > 0 ? fmtK(stats.impressions) : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-3 py-2 text-right">{stats.reach > 0 ? fmtK(stats.reach) : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-3 py-2 text-right">{stats.clicks > 0 ? fmtK(stats.clicks) : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-3 py-2 text-right">{stats.ctr !== null ? `${stats.ctr.toFixed(2)}%` : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-3 py-2 text-right">{stats.cpm !== null ? `€${stats.cpm.toFixed(2)}` : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-3 py-2 text-right">{stats.cpc !== null ? `€${stats.cpc.toFixed(2)}` : <span className="text-muted-foreground/50">—</span>}</td>
                </tr>
              ))}
              {Object.keys(byMedium).length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground text-sm">Δεν υπάρχουν δεδομένα. Προσθέστε items ή χρησιμοποιήστε τον AI Wizard.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── ReAllocate Modal ─────────────────────────────────────────────────────────
function ReAllocateModal({ open, onClose, items, newBudget, onApply }: {
  open: boolean; onClose: () => void;
  items: MediaPlanItem[]; newBudget: number;
  onApply: (allocations: Record<string, number>) => void;
}) {
  const currentTotal = items.reduce((s, i) => s + (i.budget || 0), 0);
  const [mode, setMode] = useState<'proportional' | 'custom'>('proportional');
  const [customAlloc, setCustomAlloc] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    items.forEach(i => { init[i.id] = i.budget || 0; });
    return init;
  });

  const proportionalAlloc = useMemo(() => {
    const alloc: Record<string, number> = {};
    if (currentTotal === 0) {
      const even = Math.round(newBudget / items.length);
      items.forEach(i => { alloc[i.id] = even; });
    } else {
      items.forEach(i => { alloc[i.id] = Math.round((i.budget / currentTotal) * newBudget); });
    }
    return alloc;
  }, [items, currentTotal, newBudget]);

  const customTotal = Object.values(customAlloc).reduce((s, v) => s + v, 0);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> Re-Allocate Budget
          </DialogTitle>
          <DialogDescription>
            Νέο budget: <span className="font-semibold text-foreground">{fmt(newBudget)}</span>
            {currentTotal > 0 && <> · Τρέχον: {fmt(currentTotal)}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(['proportional', 'custom'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('flex-1 py-1.5 rounded text-xs font-medium transition-colors',
                  mode === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {m === 'proportional' ? '⚖️ Αναλογική Κατανομή' : '✏️ Χειροκίνητη'}
              </button>
            ))}
          </div>

          {mode === 'proportional' ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground text-xs">Τα items θα κλιμακωθούν αναλογικά βάσει τρέχουσας κατανομής:</p>
              {items.map(i => (
                <div key={i.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{i.campaign_name || i.medium}</p>
                    <p className="text-xs text-muted-foreground">{i.medium}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-muted-foreground line-through text-xs">{fmt(i.budget)}</span>
                    <span className="ml-2 font-semibold text-primary">{fmt(proportionalAlloc[i.id])}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 flex justify-between font-semibold border-t">
                <span>Σύνολο</span>
                <span className="text-primary">{fmt(Object.values(proportionalAlloc).reduce((s, v) => s + v, 0))}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground text-xs">Ορίστε χειροκίνητα το budget κάθε item:</p>
              {items.map(i => (
                <div key={i.id} className="flex items-center gap-3 py-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-xs">{i.campaign_name || i.medium}</p>
                    <p className="text-xs text-muted-foreground">{i.medium}</p>
                  </div>
                  <Input
                    type="number"
                    value={customAlloc[i.id] ?? 0}
                    onChange={e => setCustomAlloc(prev => ({ ...prev, [i.id]: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-28 text-right text-sm"
                  />
                </div>
              ))}
              <div className={cn('pt-2 flex justify-between font-semibold border-t text-sm', customTotal > newBudget ? 'text-destructive' : '')}>
                <span>Σύνολο{customTotal > newBudget ? ' ⚠️ Υπέρβαση!' : ''}</span>
                <span>{fmt(customTotal)} / {fmt(newBudget)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
          <Button onClick={() => { onApply(mode === 'proportional' ? proportionalAlloc : customAlloc); onClose(); }}
            disabled={mode === 'custom' && customTotal > newBudget}>
            <RefreshCw className="h-4 w-4 mr-2" /> Εφαρμογή
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Actual Spent Wizard ──────────────────────────────────────────────────────
function ActualSpentWizard({ open, onClose, items, onSave }: {
  open: boolean; onClose: () => void;
  items: MediaPlanItem[];
  onSave: (entries: Record<string, number>) => void;
}) {
  const [entries, setEntries] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    items.forEach(i => { init[i.id] = i.actual_cost || 0; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const totalActual = Object.values(entries).reduce((s, v) => s + v, 0);
  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    await onSave(entries);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Καταχώρηση Actual Costs
          </DialogTitle>
          <DialogDescription>Εισάγετε το πραγματικό κόστος για κάθε media item</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_120px_100px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
            <span>Item</span>
            <span className="text-right">Budget</span>
            <span className="text-right">Actual</span>
          </div>
          {items.map(i => (
            <div key={i.id} className="grid grid-cols-[1fr_120px_100px] gap-2 items-center px-2 py-1.5 rounded hover:bg-muted/30">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{i.campaign_name || i.medium}</p>
                <p className="text-xs text-muted-foreground">{i.medium}{i.phase ? ` · ${i.phase}` : ''}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">{fmt(i.budget)}</div>
              <Input
                type="number"
                value={entries[i.id] ?? 0}
                onChange={e => setEntries(prev => ({ ...prev, [i.id]: parseFloat(e.target.value) || 0 }))}
                className="h-8 text-right text-sm"
                min={0}
              />
            </div>
          ))}
        </div>

        <div className={cn('rounded-lg p-3 text-sm flex justify-between font-semibold border', totalActual > totalBudget ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border bg-muted/30')}>
          <span>Σύνολο Actual {totalActual > totalBudget ? '⚠️ Υπέρβαση Budget!' : ''}</span>
          <span>{fmt(totalActual)} / {fmt(totalBudget)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-2" />}
            Αποθήκευση Όλων
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter / Group Toolbar ───────────────────────────────────────────────────
type GroupByType = 'medium' | 'phase' | 'objective' | 'category';

function FilterGroupToolbar({ items, groupBy, setGroupBy, filterPhase, setFilterPhase, filterObjective, setFilterObjective, filterCategory, setFilterCategory, searchQuery, setSearchQuery }: {
  items: MediaPlanItem[];
  groupBy: GroupByType; setGroupBy: (v: GroupByType) => void;
  filterPhase: string[]; setFilterPhase: (v: string[]) => void;
  filterObjective: string[]; setFilterObjective: (v: string[]) => void;
  filterCategory: string; setFilterCategory: (v: string) => void;
  searchQuery: string; setSearchQuery: (v: string) => void;
}) {
  const allPhases = useMemo(() => [...new Set(items.map(i => i.phase).filter(Boolean) as string[])], [items]);
  const allObjectives = useMemo(() => [...new Set(items.map(i => i.objective).filter(Boolean) as string[])], [items]);
  const hasFilters = filterPhase.length > 0 || filterObjective.length > 0 || filterCategory !== 'all' || searchQuery;

  const toggleMulti = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Αναζήτηση..." className="h-8 pl-8 pr-3 text-xs w-44" />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Group by */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Ομαδ/ση: {groupBy === 'medium' ? 'Κανάλι' : groupBy === 'phase' ? 'Φάση' : groupBy === 'objective' ? 'Objective' : 'Κατηγορία'}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {([['medium','Κανάλι'],['phase','Φάση'],['objective','Objective'],['category','Κατηγορία']] as [GroupByType,string][]).map(([val, label]) => (
            <DropdownMenuItem key={val} onClick={() => setGroupBy(val)} className={groupBy === val ? 'font-semibold' : ''}>
              {groupBy === val ? '✓ ' : ''}{label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter Phase */}
      {allPhases.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', filterPhase.length > 0 && 'border-primary text-primary')}>
              Φάση {filterPhase.length > 0 ? `(${filterPhase.length})` : ''}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {allPhases.map(ph => (
              <DropdownMenuItem key={ph} onClick={() => toggleMulti(filterPhase, ph, setFilterPhase)}
                className="flex items-center gap-2">
                <div className={cn('w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center', filterPhase.includes(ph) ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
                  {filterPhase.includes(ph) && <span className="text-primary-foreground text-[8px] font-bold">✓</span>}
                </div>
                {ph}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Filter Objective */}
      {allObjectives.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', filterObjective.length > 0 && 'border-primary text-primary')}>
              Objective {filterObjective.length > 0 ? `(${filterObjective.length})` : ''}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {allObjectives.map(obj => {
              const label = OBJECTIVES.find(o => o.value === obj)?.label || obj;
              return (
                <DropdownMenuItem key={obj} onClick={() => toggleMulti(filterObjective, obj, setFilterObjective)}
                  className="flex items-center gap-2">
                  <div className={cn('w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center', filterObjective.includes(obj) ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
                    {filterObjective.includes(obj) && <span className="text-primary-foreground text-[8px] font-bold">✓</span>}
                  </div>
                  {label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Filter Category */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', filterCategory !== 'all' && 'border-primary text-primary')}>
            {filterCategory !== 'all' ? filterCategory : 'Κατηγορία'}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setFilterCategory('all')} className={filterCategory === 'all' ? 'font-semibold' : ''}>Όλες οι κατηγορίες</DropdownMenuItem>
          <DropdownMenuSeparator />
          {Object.keys(MEDIA_CATEGORIES).map(cat => (
            <DropdownMenuItem key={cat} onClick={() => setFilterCategory(cat)} className={filterCategory === cat ? 'font-semibold' : ''}>{cat}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1"
          onClick={() => { setFilterPhase([]); setFilterObjective([]); setFilterCategory('all'); setSearchQuery(''); }}>
          <X className="h-3 w-3" /> Καθαρισμός
        </Button>
      )}
    </div>
  );
}

// ─── Plan Detail View ─────────────────────────────────────────────────────────
function PlanDetailView({ plan, projectId, projectName, projectBudget, agencyFeePercentage, deliverables, onBack, onPlanUpdate }: {
  plan: MediaPlan; projectId: string; projectName: string;
  projectBudget: number; agencyFeePercentage: number;
  deliverables: Deliverable[];
  onBack: () => void;
  onPlanUpdate: () => void;
}) {
  const { user, isAdmin, isManager } = useAuth();
  const canEdit = isAdmin || isManager;
  const [items, setItems] = useState<MediaPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('spreadsheet');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showWizard, setShowWizard] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [planName, setPlanName] = useState(plan.name);
  const [planBudget, setPlanBudget] = useState(plan.total_budget);
  const [showReAllocate, setShowReAllocate] = useState(false);
  const [showActualWizard, setShowActualWizard] = useState(false);
  const [pendingBudget, setPendingBudget] = useState<number | null>(null);
  // Filter/group state
  const [groupBy, setGroupBy] = useState<GroupByType>('medium');
  const [filterPhase, setFilterPhase] = useState<string[]>([]);
  const [filterObjective, setFilterObjective] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const netBudget = projectBudget * (1 - agencyFeePercentage / 100);
  const allocatedBudget = items.reduce((sum, i) => sum + (i.budget || 0), 0);
  const actualSpent = items.reduce((sum, i) => sum + (i.actual_cost || 0), 0);
  const overBudget = allocatedBudget > (planBudget || netBudget);

  const getCategory = (medium: string) =>
    Object.entries(MEDIA_CATEGORIES).find(([, mediums]) => mediums.includes(medium))?.[0] || 'Άλλο';

  // Filtered + grouped items
  const displayedItems = useMemo(() => {
    let result = items;
    if (searchQuery) result = result.filter(i =>
      i.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.medium.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filterPhase.length > 0) result = result.filter(i => filterPhase.includes(i.phase || ''));
    if (filterObjective.length > 0) result = result.filter(i => filterObjective.includes(i.objective));
    if (filterCategory !== 'all') result = result.filter(i => getCategory(i.medium) === filterCategory);
    return result;
  }, [items, searchQuery, filterPhase, filterObjective, filterCategory]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, MediaPlanItem[]> = {};
    displayedItems.forEach(item => {
      const key = groupBy === 'medium' ? item.medium
        : groupBy === 'phase' ? (item.phase || 'Χωρίς Φάση')
        : groupBy === 'objective' ? (OBJECTIVES.find(o => o.value === item.objective)?.label || item.objective)
        : getCategory(item.medium);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [displayedItems, groupBy]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_plan_items')
      .select('*')
      .eq('media_plan_id', plan.id)
      .order('sort_order', { ascending: true });
    if (!error && data) setItems(data as MediaPlanItem[]);
    setLoading(false);
  }, [plan.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Update plan field
  const updatePlan = async (field: string, value: string | number) => {
    const { error } = await supabase.from('media_plans').update({ [field]: value }).eq('id', plan.id);
    if (!error) { onPlanUpdate(); toast.success('Αποθηκεύτηκε'); }
    else toast.error('Σφάλμα αποθήκευσης');
  };

  // Update item
  const updateItem = async (id: string, field: string, value: string | number) => {
    const { error } = await supabase.from('media_plan_items').update({ [field]: value }).eq('id', id);
    if (!error) fetchItems();
    else toast.error('Σφάλμα αποθήκευσης');
  };

  // Delete item
  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('media_plan_items').delete().eq('id', id);
    if (!error) { setItems(prev => prev.filter(i => i.id !== id)); toast.success('Διαγράφηκε'); }
    else toast.error('Σφάλμα διαγραφής');
  };

  // Add item
  const addItem = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('media_plan_items').insert({
      project_id: projectId,
      media_plan_id: plan.id,
      medium: 'TV',
      budget: 0,
      actual_cost: 0,
      status: 'planned',
      objective: 'awareness',
      sort_order: items.length,
    }).select().single();
    if (!error && data) { setItems(prev => [...prev, data as MediaPlanItem]); }
    else toast.error('Σφάλμα προσθήκης');
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Καμπάνια', 'Μέσο', 'Format', 'Φάση', 'Objective', 'Έναρξη', 'Λήξη', 'Budget', 'Net Budget', 'Actual', 'Status'];
    const rows = items.map(i => [
      i.campaign_name || '', i.medium, i.format || '', i.phase || '',
      OBJECTIVES.find(o => o.value === i.objective)?.label || i.objective,
      i.start_date || '', i.end_date || '',
      i.budget, i.net_budget || i.budget, i.actual_cost, i.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${planName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  };

  // AI Generate
  const handleGenerate = async (wizardState: WizardState) => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-media-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            projectId,
            projectName,
            projectBudget,
            agencyFeePercentage,
            deliverables,
            campaignObjectives: wizardState.campaignObjectives,
            targetAudience: wizardState.targetAudience,
            phases: wizardState.phases,
            selectedChannels: wizardState.selectedChannels,
            budgetAllocation: wizardState.budgetAllocation,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'AI generation failed');
      }

      const result = await response.json();
      const aiItems = result.mediaPlanItems || [];

      if (aiItems.length === 0) throw new Error('Δεν παράχθηκαν αντικείμενα');

      // Insert all items linked to this plan
      const insertData = aiItems.map((item: Partial<MediaPlanItem>, idx: number) => ({
        project_id: projectId,
        media_plan_id: plan.id,
        medium: item.medium || 'TV',
        placement: item.placement || null,
        campaign_name: item.campaign_name || null,
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        budget: item.budget || 0,
        actual_cost: 0,
        objective: item.objective || 'awareness',
        phase: item.phase || null,
        format: item.format || null,
        reach: item.reach || 0,
        impressions: item.impressions || 0,
        target_audience: item.target_audience || null,
        notes: item.notes || null,
        status: 'planned',
        sort_order: idx,
        deliverable_id: item.deliverable_id || null,
      }));

      const { error: insertError } = await supabase.from('media_plan_items').insert(insertData);
      if (insertError) throw insertError;

      await fetchItems();
      setShowWizard(false);
      toast.success(`✅ Δημιουργήθηκαν ${aiItems.length} media items!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Σφάλμα';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Chart data (uses all items, not filtered)
  const channelData = useMemo(() => {
    const byMedium: Record<string, number> = {};
    items.forEach(i => { byMedium[i.medium] = (byMedium[i.medium] || 0) + i.budget; });
    return Object.entries(byMedium).map(([name, budget]) => ({ name, budget })).sort((a, b) => b.budget - a.budget);
  }, [items]);

  const objectiveData = useMemo(() => {
    const obj: Record<string, number> = {};
    items.forEach(i => { obj[i.objective] = (obj[i.objective] || 0) + i.budget; });
    return Object.entries(obj).map(([name, value]) => ({ name, value }));
  }, [items]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground hover:text-foreground -ml-1">
          <ArrowLeft className="h-4 w-4" /> Πίσω
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {editingName ? (
              <input
                autoFocus
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                onBlur={() => { setEditingName(false); updatePlan('name', planName); }}
                onKeyDown={e => { if (e.key === 'Enter') { setEditingName(false); updatePlan('name', planName); } if (e.key === 'Escape') { setEditingName(false); setPlanName(plan.name); } }}
                className="text-lg font-bold bg-background border border-primary/40 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-[200px]"
              />
            ) : (
              <button onClick={() => canEdit && setEditingName(true)}
                className={cn('text-lg font-bold flex items-center gap-1 group', canEdit && 'hover:text-primary cursor-pointer')}>
                {planName}
                {canEdit && <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
              </button>
            )}
            <PlanStatusBadge status={plan.status} onSave={v => updatePlan('status', v)} />
          </div>

          {/* Budget row */}
          <div className="flex items-center gap-4 mt-1.5 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Budget:</span>
              <EditableCell
                value={planBudget}
                type="number"
                onSave={v => {
                  const n = parseFloat(v) || 0;
                  const old = planBudget;
                  setPlanBudget(n);
                  updatePlan('total_budget', n);
                  if (items.length > 0 && n !== old) {
                    setPendingBudget(n);
                    setShowReAllocate(true);
                  }
                }}
                className="font-semibold text-foreground"
              />
              {items.length > 0 && canEdit && (
                <button onClick={() => { setPendingBudget(planBudget); setShowReAllocate(true); }}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  <RefreshCw className="h-3 w-3" /> Re-allocate
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>Fee: {agencyFeePercentage}%</span>
              <span>·</span>
              <span className="font-medium text-foreground">Net: {fmt(netBudget)}</span>
            </div>
            <div className={cn('flex items-center gap-1 text-xs', overBudget ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              {overBudget && <AlertTriangle className="h-3.5 w-3.5" />}
              Κατανεμήθηκε: {fmt(allocatedBudget)} / {fmt(planBudget || netBudget)}
              {overBudget && ' — ΥΠΕΡΒΑΣΗ!'}
            </div>
          </div>
          {overBudget && (
            <Progress value={100} className="h-1 mt-1 max-w-xs [&>div]:bg-destructive" />
          )}
          {!overBudget && allocatedBudget > 0 && (
            <Progress value={(allocatedBudget / (planBudget || netBudget)) * 100} className="h-1 mt-1 max-w-xs" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" /> Νέα Γραμμή
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowWizard(true)} className="gap-1">
                <Sparkles className="h-4 w-4" /> AI Wizard
              </Button>
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowActualWizard(true)} className="gap-1">
                  <ClipboardList className="h-4 w-4" /> Actual Costs
                </Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Σύνολο Budget', value: fmt(allocatedBudget), icon: DollarSign, color: 'text-primary' },
            { label: 'Πραγματικό Κόστος', value: fmt(actualSpent), icon: TrendingUp, color: 'text-green-600' },
            { label: 'Υπόλοιπο', value: fmt((planBudget || netBudget) - actualSpent), icon: Target, color: actualSpent > (planBudget || netBudget) ? 'text-destructive' : 'text-muted-foreground' },
            { label: 'Αντικείμενα', value: items.length.toString(), icon: Layout, color: 'text-muted-foreground' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-muted">
                <kpi.icon className={cn('h-4 w-4', kpi.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={cn('text-sm font-bold', kpi.color)}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts (only when there are items) */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-3">Κατανομή ανά Κανάλι</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={channelData.slice(0, 8)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} width={45} />
                <Tooltip formatter={(v: number) => [fmt(v), 'Budget']} />
                <Bar dataKey="budget" radius={[4, 4, 0, 0]}>
                  {channelData.slice(0, 8).map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-3">Ανά Objective</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={objectiveData} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${OBJECTIVES.find(o => o.value === name)?.label?.slice(0, 8) || name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={9}>
                  {objectiveData.map((entry, idx) => <Cell key={idx} fill={OBJECTIVE_COLORS[entry.name] || CHART_COLORS[idx % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [fmt(v), 'Budget']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* View Toggle + Filter Toolbar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {([
              { key: 'spreadsheet', label: '📋 Πίνακας' },
              { key: 'gantt', label: '📊 Gantt' },
              { key: 'calendar', label: '📅 Ημερολόγιο' },
            ] as { key: ViewMode; label: string }[]).map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)}
                className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors', viewMode === v.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        {items.length > 0 && (viewMode === 'spreadsheet' || viewMode === 'gantt') && (
          <FilterGroupToolbar
            items={items}
            groupBy={groupBy} setGroupBy={setGroupBy}
            filterPhase={filterPhase} setFilterPhase={setFilterPhase}
            filterObjective={filterObjective} setFilterObjective={setFilterObjective}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          />
        )}
        {displayedItems.length < items.length && (
          <p className="text-xs text-muted-foreground">Εμφάνιση {displayedItems.length} από {items.length} items</p>
        )}
      </div>

      {/* Main content area */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border rounded-xl border-dashed">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Δεν υπάρχουν media items</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-4">Δημιουργήστε με τον AI Wizard ή προσθέστε χειροκίνητα</p>
          {canEdit && (
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" /> Χειροκίνητη Εισαγωγή
              </Button>
              <Button size="sm" onClick={() => setShowWizard(true)} className="gap-1">
                <Sparkles className="h-4 w-4" /> AI Wizard
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'spreadsheet' && (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '1069px', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{width:'180px'}} /><col style={{width:'130px'}} /><col style={{width:'90px'}} />
                    <col style={{width:'110px'}} /><col style={{width:'110px'}} /><col style={{width:'88px'}} />
                    <col style={{width:'88px'}} /><col style={{width:'80px'}} /><col style={{width:'80px'}} />
                    <col style={{width:'80px'}} /><col style={{width:'110px'}} /><col style={{width:'32px'}} />
                  </colgroup>
                  <thead>
                    <tr className="bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                      <th className="px-2 py-2 text-left">Καμπάνια</th>
                      <th className="px-2 py-2 text-left">Μέσο</th>
                      <th className="px-2 py-2 text-left">Format</th>
                      <th className="px-2 py-2 text-left">Φάση</th>
                      <th className="px-2 py-2 text-left">Objective</th>
                      <th className="px-2 py-2 text-left">Έναρξη</th>
                      <th className="px-2 py-2 text-left">Λήξη</th>
                      <th className="px-2 py-2 text-right">Budget</th>
                      <th className="px-2 py-2 text-right">Net</th>
                      <th className="px-2 py-2 text-right">Actual</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
                      const isCollapsed = collapsedGroups.has(groupKey);
                      const groupBudget = groupItems.reduce((s, i) => s + i.budget, 0);
                      const groupActual = groupItems.reduce((s, i) => s + i.actual_cost, 0);
                      return (
                        <>
                          <tr key={`group-${groupKey}`}
                            className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors border-b"
                            onClick={() => toggleGroup(groupKey)}>
                            <td colSpan={7} className="px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="font-semibold text-sm">{groupKey}</span>
                                <Badge variant="outline" className="text-xs">{groupItems.length}</Badge>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right text-sm font-semibold">{fmt(groupBudget)}</td>
                            <td className="px-2 py-1.5" />
                            <td className="px-2 py-1.5 text-right text-sm text-muted-foreground">{fmt(groupActual)}</td>
                            <td colSpan={2} />
                          </tr>
                          {!isCollapsed && groupItems.map(item => (
                            <SpreadsheetRow key={item.id} item={item} deliverables={deliverables} onUpdate={updateItem} onDelete={deleteItem} />
                          ))}
                        </>
                      );
                    })}
                    {displayedItems.length === 0 && (
                      <tr><td colSpan={12} className="px-4 py-8 text-center text-sm text-muted-foreground">Δεν βρέθηκαν αποτελέσματα με τα τρέχοντα φίλτρα.</td></tr>
                    )}
                    {/* Totals */}
                    <tr className="bg-muted/20 border-t-2 font-semibold text-sm">
                      <td colSpan={7} className="px-2 py-2 text-right text-muted-foreground">ΣΥΝΟΛΟ</td>
                      <td className="px-2 py-2 text-right">{fmt(displayedItems.reduce((s,i)=>s+i.budget,0))}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{fmt(displayedItems.reduce((s,i)=>s+(i.net_budget||i.budget),0))}</td>
                      <td className="px-2 py-2 text-right">{fmt(displayedItems.reduce((s,i)=>s+i.actual_cost,0))}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {viewMode === 'gantt' && <div className="rounded-xl border p-4"><GanttView items={displayedItems} onItemUpdate={(id, updates) => {
            Object.entries(updates).forEach(([field, value]) => updateItem(id, field, value as string));
          }} /></div>}
          {viewMode === 'calendar' && <div className="rounded-xl border p-4"><CalendarView items={displayedItems} /></div>}
        </>
      )}

      {/* Performance Projections */}
      <ProjectionsSection items={items} />

      {/* AI Wizard */}
      {showWizard && (
        <AIWizardModal
          open={showWizard}
          onClose={() => setShowWizard(false)}
          onGenerate={handleGenerate}
          projectName={projectName}
          projectBudget={projectBudget}
          agencyFeePercentage={agencyFeePercentage}
          deliverables={deliverables}
          generating={generating}
        />
      )}

      {/* Re-Allocate Modal */}
      {showReAllocate && pendingBudget !== null && (
        <ReAllocateModal
          open={showReAllocate}
          onClose={() => { setShowReAllocate(false); setPendingBudget(null); }}
          items={items}
          newBudget={pendingBudget}
          onApply={async (allocations) => {
            const updates = Object.entries(allocations).map(([id, budget]) =>
              supabase.from('media_plan_items').update({ budget }).eq('id', id)
            );
            await Promise.all(updates);
            await fetchItems();
            toast.success('Budget ανακατανεμήθηκε!');
          }}
        />
      )}

      {/* Actual Spent Wizard */}
      {showActualWizard && (
        <ActualSpentWizard
          open={showActualWizard}
          onClose={() => setShowActualWizard(false)}
          items={items}
          onSave={async (entries) => {
            const updates = Object.entries(entries).map(([id, actual_cost]) =>
              supabase.from('media_plan_items').update({ actual_cost }).eq('id', id)
            );
            await Promise.all(updates);
            await fetchItems();
            toast.success('Actual costs αποθηκεύτηκαν!');
          }}
        />
      )}
    </div>
  );
}

// ─── Plans List View ──────────────────────────────────────────────────────────
function PlansListView({ projectId, projectName, projectBudget, agencyFeePercentage, deliverables, onSelectPlan }: {
  projectId: string; projectName: string; projectBudget: number;
  agencyFeePercentage: number; deliverables: Deliverable[];
  onSelectPlan: (plan: MediaPlan) => void;
}) {
  const { user, isAdmin, isManager } = useAuth();
  const canEdit = isAdmin || isManager;
  const [plans, setPlans] = useState<MediaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState('draft');
  const [creating, setCreating] = useState(false);
  const netBudget = projectBudget * (1 - agencyFeePercentage / 100);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_plans')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (!error && data) setPlans(data as MediaPlan[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const createPlan = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    const { data, error } = await supabase.from('media_plans').insert({
      project_id: projectId,
      name: newName.trim(),
      status: newStatus,
      total_budget: netBudget,
      agency_fee_percentage: agencyFeePercentage,
      created_by: user.id,
    }).select().single();
    if (!error && data) {
      setPlans(prev => [data as MediaPlan, ...prev]);
      setShowNew(false);
      setNewName('');
      toast.success('Νέο Media Plan δημιουργήθηκε!');
    } else {
      toast.error('Σφάλμα δημιουργίας');
    }
    setCreating(false);
  };

  const deletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Διαγραφή media plan και όλων των items;')) return;
    const { error } = await supabase.from('media_plans').delete().eq('id', planId);
    if (!error) { setPlans(prev => prev.filter(p => p.id !== planId)); toast.success('Διαγράφηκε'); }
    else toast.error('Σφάλμα διαγραφής');
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Media Plans</h2>
          <p className="text-sm text-muted-foreground">
            {plans.length} πλάνο{plans.length !== 1 ? 'α' : ''} · Net Budget: <span className="font-medium text-foreground">{fmt(netBudget)}</span>
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowNew(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Νέο Πλάνο
          </Button>
        )}
      </div>

      {/* New Plan Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Νέο Media Plan</DialogTitle>
            <DialogDescription>Δημιουργήστε νέο media plan για το έργο {projectName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Όνομα Πλάνου</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="π.χ. Media Plan Q1 2026" className="mt-1"
                onKeyDown={e => e.key === 'Enter' && createPlan()} />
            </div>
            <div>
              <Label>Κατάσταση</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/30 border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project Budget</span>
                <span>{fmt(projectBudget)}</span>
              </div>
              {agencyFeePercentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agency Fee ({agencyFeePercentage}%)</span>
                  <span className="text-destructive">-{fmt(projectBudget * agencyFeePercentage / 100)}</span>
                </div>
              )}
              <div className="flex justify-between border-t mt-1 pt-1 font-semibold">
                <span>Net Budget (αρχικό)</span>
                <span className="text-primary">{fmt(netBudget)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Ακύρωση</Button>
            <Button onClick={createPlan} disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Δημιουργία
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="text-center py-16 border rounded-xl border-dashed">
          <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Δεν υπάρχουν Media Plans</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-4">Δημιουργήστε το πρώτο σας media plan</p>
          {canEdit && (
            <Button onClick={() => setShowNew(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Νέο Media Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const statusOpt = PLAN_STATUS_OPTIONS.find(o => o.value === plan.status);
            return (
              <div key={plan.id}
                className="rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer p-4"
                onClick={() => onSelectPlan(plan)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{plan.name}</span>
                        <Badge variant="outline" className={cn('text-xs shrink-0', statusOpt?.color)}>
                          {statusOpt?.label || plan.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Budget: <span className="text-foreground font-medium">{fmt(plan.total_budget || 0)}</span>
                        {agencyFeePercentage > 0 && (
                          <> · Fee: {plan.agency_fee_percentage}%</>
                        )}
                        <span className="mx-1">·</span>
                        {format(new Date(plan.created_at), 'd MMM yyyy', { locale: el })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="default" size="sm" className="gap-1" onClick={e => { e.stopPropagation(); onSelectPlan(plan); }}>
                      Άνοιγμα →
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={e => deletePlan(plan.id, e)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProjectMediaPlan({ projectId, projectName, projectBudget, agencyFeePercentage = 0, deliverables }: ProjectMediaPlanProps) {
  const [selectedPlan, setSelectedPlan] = useState<MediaPlan | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePlanUpdate = () => setRefreshKey(k => k + 1);

  if (selectedPlan) {
    return (
      <PlanDetailView
        key={selectedPlan.id + refreshKey}
        plan={selectedPlan}
        projectId={projectId}
        projectName={projectName}
        projectBudget={projectBudget}
        agencyFeePercentage={agencyFeePercentage}
        deliverables={deliverables}
        onBack={() => setSelectedPlan(null)}
        onPlanUpdate={handlePlanUpdate}
      />
    );
  }

  return (
    <PlansListView
      key={refreshKey}
      projectId={projectId}
      projectName={projectName}
      projectBudget={projectBudget}
      agencyFeePercentage={agencyFeePercentage}
      deliverables={deliverables}
      onSelectPlan={setSelectedPlan}
    />
  );
}
