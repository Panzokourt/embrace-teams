import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Plus, Sparkles, Download, ChevronDown, ChevronRight, Loader2,
  TrendingUp, DollarSign, Eye, MousePointer, Target, Layers,
  Flag, Megaphone, Search, Trash2, Pencil, CheckCircle2, X,
  BarChart2, ArrowRight, Users, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────
interface MediaPlanItem {
  id: string;
  project_id: string;
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
  'Facebook': '📘', 'Instagram': '📸', 'TikTok': '🎵', 'LinkedIn': '💼', 'Twitter/X': '🐦', 'Pinterest': '📌',
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
];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Προγραμματισμένο', color: 'bg-muted text-muted-foreground' },
  { value: 'active', label: 'Ενεργό', color: 'bg-success/10 text-success border-success/20' },
  { value: 'completed', label: 'Ολοκληρώθηκε', color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'cancelled', label: 'Ακυρώθηκε', color: 'bg-destructive/10 text-destructive border-destructive/20' },
];

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const CAMPAIGN_OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'launch', label: 'Product Launch' },
  { value: 'conversion', label: 'Sales / Conversion' },
  { value: 'retention', label: 'Retention / Loyalty' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'leads', label: 'Lead Generation' },
  { value: 'event', label: 'Event Promotion' },
];

const WIZARD_CHANNELS = [
  { key: 'TV & Radio', label: 'TV & Radio' },
  { key: 'Digital Paid', label: 'Digital Paid' },
  { key: 'Social Media', label: 'Social Media' },
  { key: 'Outdoor', label: 'Outdoor / OOH' },
  { key: 'Print', label: 'Print & Native' },
  { key: 'Influencers/PR', label: 'Influencers / PR' },
  { key: 'Email/CRM', label: 'Email / CRM' },
  { key: 'Events', label: 'Events / Sponsorship' },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────
const fmt = (v: number) => `€${v.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtK = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`;

function getStatusBadge(status: string) {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return <Badge variant="outline" className={cn('text-xs', opt?.color)}>{opt?.label || status}</Badge>;
}

function getObjectiveBadge(objective: string) {
  const opt = OBJECTIVES.find(o => o.value === objective);
  return <Badge variant="outline" className={cn('text-xs', opt?.color)}>{opt?.label || objective}</Badge>;
}

// ─── Inline editable cell ────────────────────────────────────────────────────
function EditableCell({
  value, type = 'text', onSave, className
}: {
  value: string | number;
  type?: 'text' | 'number' | 'date';
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocal(String(value)); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => { setEditing(false); onSave(local); };
  const cancel = () => { setEditing(false); setLocal(String(value)); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        className={cn('w-full bg-background border border-primary/40 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40', className)}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn('cursor-pointer hover:bg-primary/5 rounded px-1 py-0.5 min-h-[28px] flex items-center group', className)}
    >
      <span className="flex-1">{value === 0 || value === '' ? <span className="text-muted-foreground/40">—</span> : value}</span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-muted-foreground ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function SelectCell({
  value, options, onSave
}: {
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
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

// ─── AI Wizard Modal ──────────────────────────────────────────────────────────
interface WizardState {
  step: 1 | 2 | 3;
  campaignObjective: string;
  targetAudience: string;
  campaignStart: string;
  campaignEnd: string;
  selectedChannels: string[];
  budgetAllocation: Record<string, number>;
}

function AIWizardModal({
  open, onClose, onGenerate, projectName, projectBudget, agencyFeePercentage, deliverables, generating
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (w: WizardState) => void;
  projectName: string;
  projectBudget: number;
  agencyFeePercentage: number;
  deliverables: Deliverable[];
  generating: boolean;
}) {
  const [w, setW] = useState<WizardState>({
    step: 1,
    campaignObjective: 'awareness',
    targetAudience: '',
    campaignStart: '',
    campaignEnd: '',
    selectedChannels: ['TV & Radio', 'Social Media', 'Digital Paid'],
    budgetAllocation: {},
  });

  const netBudget = projectBudget * (1 - agencyFeePercentage / 100);

  // Normalize allocation to 100%
  const normalizeAlloc = (alloc: Record<string, number>) => {
    const total = Object.values(alloc).reduce((s, v) => s + v, 0);
    if (total === 0) return alloc;
    const factor = 100 / total;
    return Object.fromEntries(Object.entries(alloc).map(([k, v]) => [k, Math.round(v * factor)]));
  };

  const toggleChannel = (ch: string) => {
    setW(prev => {
      const sel = prev.selectedChannels.includes(ch)
        ? prev.selectedChannels.filter(c => c !== ch)
        : [...prev.selectedChannels, ch];
      return { ...prev, selectedChannels: sel };
    });
  };

  const setAlloc = (ch: string, val: number) => {
    setW(prev => ({ ...prev, budgetAllocation: { ...prev.budgetAllocation, [ch]: val } }));
  };

  const canNext1 = w.campaignObjective && (w.campaignStart || w.campaignEnd || true);
  const canNext2 = w.selectedChannels.length > 0;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Media Plan Wizard
          </DialogTitle>
          <DialogDescription>
            Βήμα {w.step} από 3 · {projectName}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn('flex-1 h-1.5 rounded-full transition-colors', s <= w.step ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        {/* Step 1: Briefing */}
        {w.step === 1 && (
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">Ποιος είναι ο κύριος στόχος της καμπάνιας;</Label>
              <div className="grid grid-cols-2 gap-2">
                {CAMPAIGN_OBJECTIVE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setW(p => ({ ...p, campaignObjective: opt.value }))}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all',
                      w.campaignObjective === opt.value
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full border-2', w.campaignObjective === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Κοινό-στόχος</Label>
              <Textarea
                value={w.targetAudience}
                onChange={e => setW(p => ({ ...p, targetAudience: e.target.value }))}
                placeholder="π.χ. Γυναίκες 25-44, αστικές περιοχές, mobile-first, ενδιαφέρον για lifestyle..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Έναρξη καμπάνιας</Label>
                <Input type="date" value={w.campaignStart} onChange={e => setW(p => ({ ...p, campaignStart: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Λήξη καμπάνιας</Label>
                <Input type="date" value={w.campaignEnd} onChange={e => setW(p => ({ ...p, campaignEnd: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Media Mix */}
        {w.step === 2 && (
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">Ποια κανάλια να συμπεριληφθούν;</Label>
              <div className="grid grid-cols-2 gap-2">
                {WIZARD_CHANNELS.map(ch => (
                  <button
                    key={ch.key}
                    onClick={() => toggleChannel(ch.key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                      w.selectedChannels.includes(ch.key)
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                      w.selectedChannels.includes(ch.key) ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                    )}>
                      {w.selectedChannels.includes(ch.key) && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {w.selectedChannels.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block text-muted-foreground">
                  Κατανομή Budget (προαιρετικό) · Σύνολο: {Object.values(w.budgetAllocation).reduce((a, b) => a + b, 0)}%
                </Label>
                <div className="space-y-3">
                  {w.selectedChannels.map(ch => {
                    const val = w.budgetAllocation[ch] ?? 0;
                    return (
                      <div key={ch} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{ch}</span>
                          <span className="font-medium text-foreground">{val}%</span>
                        </div>
                        <Slider
                          value={[val]}
                          onValueChange={([v]) => setAlloc(ch, v)}
                          min={0} max={100} step={5}
                          className="h-4"
                        />
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
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Megaphone className="h-4 w-4 text-primary" />
                {projectName}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="ml-2 font-semibold">{fmt(projectBudget)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Net (μετά fee):</span>
                  <span className="ml-2 font-semibold text-success">{fmt(netBudget)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Στόχος:</span>
                  <span className="ml-2">{CAMPAIGN_OBJECTIVE_OPTIONS.find(o => o.value === w.campaignObjective)?.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Φάση:</span>
                  <span className="ml-2">{w.campaignStart || '—'} → {w.campaignEnd || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Κανάλια:</span>
                  <span className="ml-2">{w.selectedChannels.join(', ')}</span>
                </div>
                {w.targetAudience && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Κοινό:</span>
                    <span className="ml-2">{w.targetAudience}</span>
                  </div>
                )}
                {deliverables.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Παραδοτέα:</span>
                    <span className="ml-2">{deliverables.length} παραδοτέα για σύνδεση</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Το AI θα δημιουργήσει ένα ολοκληρωμένο media plan με φάσεις, objectives, formats και budget allocation βάσει των παραπάνω επιλογών.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {w.step > 1 && (
            <Button variant="outline" onClick={() => setW(p => ({ ...p, step: (p.step - 1) as 1 | 2 | 3 }))}>
              ← Πίσω
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Ακύρωση</Button>
          {w.step < 3 ? (
            <Button
              onClick={() => setW(p => ({ ...p, step: (p.step + 1) as 2 | 3 }))}
              disabled={(w.step === 1 && !canNext1) || (w.step === 2 && !canNext2)}
            >
              Επόμενο <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => onGenerate(w)} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Δημιουργία με AI
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add/Edit Item Modal ─────────────────────────────────────────────────────
interface ItemFormState {
  medium: string;
  placement: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  budget: string;
  actual_cost: string;
  impressions: string;
  clicks: string;
  reach: string;
  objective: string;
  phase: string;
  format: string;
  commission_rate: string;
  target_audience: string;
  notes: string;
  status: string;
  deliverable_id: string;
}

function ItemFormModal({
  open, item, deliverables, onClose, onSave
}: {
  open: boolean;
  item: MediaPlanItem | null;
  deliverables: Deliverable[];
  onClose: () => void;
  onSave: (data: ItemFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<ItemFormState>({
    medium: '', placement: '', campaign_name: '', start_date: '', end_date: '',
    budget: '', actual_cost: '', impressions: '', clicks: '', reach: '',
    objective: 'awareness', phase: '', format: '', commission_rate: '0',
    target_audience: '', notes: '', status: 'planned', deliverable_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        medium: item.medium,
        placement: item.placement || '',
        campaign_name: item.campaign_name || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        budget: item.budget?.toString() || '',
        actual_cost: item.actual_cost?.toString() || '',
        impressions: item.impressions?.toString() || '',
        clicks: item.clicks?.toString() || '',
        reach: item.reach?.toString() || '',
        objective: item.objective || 'awareness',
        phase: item.phase || '',
        format: item.format || '',
        commission_rate: item.commission_rate?.toString() || '0',
        target_audience: item.target_audience || '',
        notes: item.notes || '',
        status: item.status || 'planned',
        deliverable_id: item.deliverable_id || '',
      });
    } else {
      setForm({
        medium: '', placement: '', campaign_name: '', start_date: '', end_date: '',
        budget: '', actual_cost: '', impressions: '', clicks: '', reach: '',
        objective: 'awareness', phase: '', format: '', commission_rate: '0',
        target_audience: '', notes: '', status: 'planned', deliverable_id: '',
      });
    }
  }, [item, open]);

  const set = (k: keyof ItemFormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.medium) { toast.error('Επιλέξτε μέσο'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Επεξεργασία' : 'Νέο'} Media Plan Item</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Medium */}
          <div className="col-span-2">
            <Label>Μέσο *</Label>
            <Select value={form.medium} onValueChange={v => set('medium', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Επιλέξτε μέσο..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Object.entries(MEDIA_CATEGORIES).map(([cat, mediums]) => (
                  <div key={cat}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</div>
                    {mediums.map(m => (
                      <SelectItem key={m} value={m}>{MEDIA_EMOJI[m] || '📌'} {m}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Name */}
          <div className="col-span-2">
            <Label>Όνομα Καμπάνιας</Label>
            <Input className="mt-1" value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} placeholder="π.χ. Summer Launch 2026" />
          </div>

          {/* Placement & Format */}
          <div>
            <Label>Placement</Label>
            <Input className="mt-1" value={form.placement} onChange={e => set('placement', e.target.value)} placeholder="π.χ. Feed, Stories, Banner..." />
          </div>
          <div>
            <Label>Format</Label>
            <Input className="mt-1" value={form.format} onChange={e => set('format', e.target.value)} placeholder="π.χ. Video 15sec, 300x250..." />
          </div>

          {/* Objective & Phase */}
          <div>
            <Label>Objective</Label>
            <Select value={form.objective} onValueChange={v => set('objective', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Φάση</Label>
            <Input className="mt-1" value={form.phase} onChange={e => set('phase', e.target.value)} placeholder="π.χ. Φάση 1 - Launching" />
          </div>

          {/* Dates */}
          <div>
            <Label>Έναρξη</Label>
            <Input className="mt-1" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <Label>Λήξη</Label>
            <Input className="mt-1" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>

          {/* Budget & Commission */}
          <div>
            <Label>Budget (€)</Label>
            <Input className="mt-1" type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Προμήθεια Agency (%)</Label>
            <Input className="mt-1" type="number" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)} placeholder="0" min="0" max="100" />
          </div>

          {/* Actual Cost */}
          <div>
            <Label>Πραγματικό Κόστος (€)</Label>
            <Input className="mt-1" type="number" value={form.actual_cost} onChange={e => set('actual_cost', e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* KPIs */}
          <div>
            <Label>Impressions</Label>
            <Input className="mt-1" type="number" value={form.impressions} onChange={e => set('impressions', e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Clicks</Label>
            <Input className="mt-1" type="number" value={form.clicks} onChange={e => set('clicks', e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Reach</Label>
            <Input className="mt-1" type="number" value={form.reach} onChange={e => set('reach', e.target.value)} placeholder="0" />
          </div>

          {/* Deliverable link */}
          {deliverables.length > 0 && (
            <div>
              <Label>Παραδοτέο</Label>
              <Select value={form.deliverable_id || 'none'} onValueChange={v => set('deliverable_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Χωρίς σύνδεση</SelectItem>
                  {deliverables.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1 text-sm" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Επιπλέον σημειώσεις..." rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Αποθήκευση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProjectMediaPlan({
  projectId, projectName, projectBudget, agencyFeePercentage = 0, deliverables
}: ProjectMediaPlanProps) {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;

  const [items, setItems] = useState<MediaPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaPlanItem | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterObjective, setFilterObjective] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPhase, setFilterPhase] = useState('all');
  const [breakdownTab, setBreakdownTab] = useState('channel');

  useEffect(() => { fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('media_plan_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('start_date', { ascending: true });
      if (error) throw error;
      setItems((data as MediaPlanItem[]) || []);
    } catch (e) {
      console.error('Error fetching media plan:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed ──
  const allPhases = useMemo(() => [...new Set(items.map(i => i.phase).filter(Boolean))], [items]);

  const filteredItems = useMemo(() => items.filter(item => {
    if (filterObjective !== 'all' && item.objective !== filterObjective) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterPhase !== 'all' && item.phase !== filterPhase) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.medium.toLowerCase().includes(q) ||
        item.campaign_name?.toLowerCase().includes(q) ||
        item.placement?.toLowerCase().includes(q) ||
        item.phase?.toLowerCase().includes(q)
      );
    }
    return true;
  }), [items, filterObjective, filterStatus, filterPhase, searchQuery]);

  const totals = useMemo(() => ({
    budget: filteredItems.reduce((s, i) => s + (Number(i.budget) || 0), 0),
    netBudget: filteredItems.reduce((s, i) => s + (Number(i.net_budget) || 0), 0),
    actualCost: filteredItems.reduce((s, i) => s + (Number(i.actual_cost) || 0), 0),
    planned: filteredItems.filter(i => i.status === 'planned').reduce((s, i) => s + (Number(i.budget) || 0), 0),
    impressions: filteredItems.reduce((s, i) => s + (Number(i.impressions) || 0), 0),
    reach: filteredItems.reduce((s, i) => s + (Number(i.reach) || 0), 0),
    clicks: filteredItems.reduce((s, i) => s + (Number(i.clicks) || 0), 0),
  }), [filteredItems]);

  const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
  const avgCPM = totals.impressions > 0 ? (totals.actualCost / totals.impressions * 1000) : 0;

  // Grouped by medium
  const grouped = useMemo(() => {
    const map = new Map<string, MediaPlanItem[]>();
    filteredItems.forEach(item => {
      if (!map.has(item.medium)) map.set(item.medium, []);
      map.get(item.medium)!.push(item);
    });
    return map;
  }, [filteredItems]);

  // Chart data
  const channelData = useMemo(() =>
    [...grouped.entries()].map(([medium, items]) => ({
      name: medium.length > 15 ? medium.substring(0, 14) + '…' : medium,
      budget: Math.round(items.reduce((s, i) => s + (Number(i.budget) || 0), 0)),
      actual: Math.round(items.reduce((s, i) => s + (Number(i.actual_cost) || 0), 0)),
    })).sort((a, b) => b.budget - a.budget)
  , [grouped]);

  const objectiveData = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach(i => {
      const obj = i.objective || 'awareness';
      map.set(obj, (map.get(obj) || 0) + (Number(i.budget) || 0));
    });
    return [...map.entries()].map(([name, value]) => ({
      name: OBJECTIVES.find(o => o.value === name)?.label || name,
      value: Math.round(value),
    }));
  }, [filteredItems]);

  const deliverableData = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach(i => {
      const key = i.deliverable_id
        ? (deliverables.find(d => d.id === i.deliverable_id)?.name || 'Παραδοτέο')
        : 'Χωρίς παραδοτέο';
      map.set(key, (map.get(key) || 0) + (Number(i.budget) || 0));
    });
    return [...map.entries()].map(([name, value]) => ({
      name: name.length > 20 ? name.substring(0, 19) + '…' : name,
      value: Math.round(value),
    })).filter(d => d.value > 0);
  }, [filteredItems, deliverables]);

  const phaseData = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach(i => {
      const key = i.phase || 'Χωρίς φάση';
      map.set(key, (map.get(key) || 0) + (Number(i.budget) || 0));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filteredItems]);

  // ── CRUD ──
  const handleSaveItem = async (form: ItemFormState) => {
    try {
      const data = {
        project_id: projectId,
        medium: form.medium,
        placement: form.placement || null,
        campaign_name: form.campaign_name || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: parseFloat(form.budget) || 0,
        actual_cost: parseFloat(form.actual_cost) || 0,
        impressions: parseInt(form.impressions) || 0,
        clicks: parseInt(form.clicks) || 0,
        reach: parseInt(form.reach) || 0,
        objective: form.objective,
        phase: form.phase || null,
        format: form.format || null,
        commission_rate: parseFloat(form.commission_rate) || 0,
        target_audience: form.target_audience || null,
        notes: form.notes || null,
        status: form.status,
        deliverable_id: form.deliverable_id || null,
      };

      if (editingItem) {
        const { data: updated, error } = await supabase.from('media_plan_items').update(data).eq('id', editingItem.id).select().single();
        if (error) throw error;
        setItems(p => p.map(i => i.id === editingItem.id ? updated as MediaPlanItem : i));
        toast.success('Ενημερώθηκε!');
      } else {
        const { data: inserted, error } = await supabase.from('media_plan_items').insert(data).select().single();
        if (error) throw error;
        setItems(p => [...p, inserted as MediaPlanItem]);
        toast.success('Δημιουργήθηκε!');
      }
      setFormOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error(e);
      toast.error('Σφάλμα αποθήκευσης');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('media_plan_items').delete().eq('id', id);
      setItems(p => p.filter(i => i.id !== id));
      toast.success('Διαγράφηκε!');
    } catch { toast.error('Σφάλμα διαγραφής'); }
  };

  const handleInlineUpdate = async (id: string, field: string, value: string | number) => {
    try {
      const numericFields = ['budget', 'actual_cost', 'impressions', 'clicks', 'reach', 'commission_rate', 'frequency'];
      const parsed = numericFields.includes(field) ? (parseFloat(String(value)) || 0) : value;
      const { data, error } = await supabase.from('media_plan_items').update({ [field]: parsed }).eq('id', id).select().single();
      if (error) throw error;
      setItems(p => p.map(i => i.id === id ? data as MediaPlanItem : i));
    } catch { toast.error('Σφάλμα ενημέρωσης'); }
  };

  // ── AI Generate ──
  const handleAIGenerate = async (wizard: WizardState) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-media-plan', {
        body: {
          projectId,
          projectName,
          projectBudget,
          agencyFeePercentage,
          deliverables: deliverables.map(d => ({ id: d.id, name: d.name })),
          campaignObjective: wizard.campaignObjective,
          targetAudience: wizard.targetAudience,
          campaignDuration: { start: wizard.campaignStart, end: wizard.campaignEnd },
          selectedChannels: wizard.selectedChannels,
          budgetAllocation: wizard.budgetAllocation,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.mediaPlanItems && Array.isArray(data.mediaPlanItems)) {
        const newItems = data.mediaPlanItems.map((item: Record<string, unknown>) => ({
          project_id: projectId,
          medium: item.medium || 'Άλλο',
          placement: item.placement || null,
          campaign_name: item.campaign_name || null,
          start_date: item.start_date || null,
          end_date: item.end_date || null,
          budget: item.budget || 0,
          actual_cost: 0,
          impressions: item.impressions || 0,
          reach: item.reach || 0,
          objective: item.objective || 'awareness',
          phase: item.phase || null,
          format: item.format || null,
          commission_rate: agencyFeePercentage,
          target_audience: item.target_audience || null,
          notes: item.notes || null,
          status: 'planned',
          deliverable_id: item.deliverable_id || null,
        }));

        const { data: inserted, error: insertErr } = await supabase.from('media_plan_items').insert(newItems).select();
        if (insertErr) throw insertErr;
        setItems(p => [...p, ...(inserted as MediaPlanItem[] || [])]);
        toast.success(`${inserted?.length || 0} items δημιουργήθηκαν με AI!`);
        setWizardOpen(false);
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Σφάλμα AI generation');
    } finally {
      setGenerating(false);
    }
  };

  // ── Export ──
  const handleExport = () => {
    const headers = ['Μέσο', 'Καμπάνια', 'Placement', 'Format', 'Φάση', 'Objective', 'Έναρξη', 'Λήξη', 'Budget', 'Net Budget', 'Κόστος', 'Impressions', 'Reach', 'Clicks', 'CTR', 'CPM', 'Status'];
    const rows = filteredItems.map(i => [
      i.medium, i.campaign_name || '', i.placement || '', i.format || '',
      i.phase || '', i.objective, i.start_date || '', i.end_date || '',
      i.budget, i.net_budget, i.actual_cost, i.impressions, i.reach, i.clicks,
      i.ctr?.toFixed(2) || '0', i.cpm?.toFixed(2) || '0', i.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `media_plan_${projectName.replace(/\s+/g, '_')}.csv`;
    a.click();
    toast.success('Export ολοκληρώθηκε!');
  };

  const toggleGroup = (medium: string) => {
    setCollapsedGroups(p => {
      const n = new Set(p);
      n.has(medium) ? n.delete(medium) : n.add(medium);
      return n;
    });
  };

  // ── RENDER ──
  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const isEmpty = items.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Media Plan</h3>
          {items.length > 0 && (
            <Badge variant="secondary">{items.length} items</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                AI Wizard
              </Button>
              <Button size="sm" onClick={() => { setEditingItem(null); setFormOpen(true); }} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Προσθήκη
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Empty State ── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed border-border">
          <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h4 className="text-base font-medium mb-1">Δεν υπάρχει Media Plan ακόμα</h4>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            Δημιουργήστε ένα ολοκληρωμένο media plan με βοήθεια AI ή προσθέστε placements manually.
          </p>
          {canManage && (
            <div className="flex gap-2">
              <Button onClick={() => setWizardOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Wizard
              </Button>
              <Button variant="outline" onClick={() => { setEditingItem(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />
                Manual entry
              </Button>
            </div>
          )}
        </div>
      )}

      {!isEmpty && (
        <>
          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Budget', value: fmt(totals.budget), icon: DollarSign, color: 'text-primary' },
              { label: `Net (μετά ${agencyFeePercentage}% fee)`, value: fmt(totals.netBudget), icon: TrendingUp, color: 'text-success' },
              { label: 'Κόστος (Actual)', value: fmt(totals.actualCost), icon: Target, color: 'text-warning' },
              { label: 'Υπόλοιπο', value: fmt(Math.max(0, totals.budget - totals.actualCost)), icon: BarChart2, color: 'text-muted-foreground' },
              { label: 'Impressions', value: fmtK(totals.impressions), icon: Eye, color: 'text-primary' },
              { label: 'Reach', value: fmtK(totals.reach), icon: Users, color: 'text-purple-500' },
              { label: 'Avg CTR', value: `${avgCTR.toFixed(2)}%`, icon: MousePointer, color: 'text-orange-500' },
              { label: 'Avg CPM', value: totals.impressions > 0 ? fmt(avgCPM) : '—', icon: Layers, color: 'text-muted-foreground' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <kpi.icon className={cn('h-3.5 w-3.5', kpi.color)} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* ── Budget Breakdown Charts ── */}
          <div className="rounded-xl border bg-card">
            <div className="px-4 pt-4 pb-2">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                Budget Breakdown
              </h4>
              <div className="flex gap-1 flex-wrap">
                {[
                  { id: 'channel', label: 'Ανά Κανάλι' },
                  { id: 'objective', label: 'Ανά Objective' },
                  { id: 'deliverable', label: 'Ανά Παραδοτέο' },
                  { id: 'phase', label: 'Ανά Φάση' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setBreakdownTab(t.id)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                      breakdownTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4" style={{ height: 200 }}>
              {breakdownTab === 'channel' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="actual" fill="hsl(var(--warning))" name="Actual" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {(breakdownTab === 'objective' || breakdownTab === 'deliverable' || breakdownTab === 'phase') && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownTab === 'objective' ? objectiveData : breakdownTab === 'deliverable' ? deliverableData : phaseData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {(breakdownTab === 'objective' ? objectiveData : breakdownTab === 'deliverable' ? deliverableData : phaseData).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Αναζήτηση..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-44"
              />
            </div>
            <Select value={filterObjective} onValueChange={setFilterObjective}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Objective" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλα τα Objectives</SelectItem>
                {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλα τα Status</SelectItem>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {allPhases.length > 0 && (
              <Select value={filterPhase} onValueChange={setFilterPhase}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Φάση" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Όλες οι Φάσεις</SelectItem>
                  {allPhases.map(p => <SelectItem key={p!} value={p!}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {(searchQuery || filterObjective !== 'all' || filterStatus !== 'all' || filterPhase !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterObjective('all'); setFilterStatus('all'); setFilterPhase('all'); }} className="h-9 gap-1.5 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          {/* ── Spreadsheet ── */}
          <div className="rounded-xl border overflow-hidden">
            {/* Column Headers */}
            <div className="bg-muted/50 grid text-xs font-medium text-muted-foreground uppercase tracking-wide border-b" style={{
              gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr 1fr 1fr 1fr 0.8fr 0.8fr'
            }}>
              {['Καμπάνια / Placement', 'Format / Φάση', 'Objective', 'Περίοδος', 'Budget', 'Net', 'Actual', 'Impr.', 'Status', ''].map((h, i) => (
                <div key={i} className="px-3 py-2.5">{h}</div>
              ))}
            </div>

            {/* Grouped Rows */}
            {[...grouped.entries()].map(([medium, groupItems]) => {
              const isCollapsed = collapsedGroups.has(medium);
              const groupBudget = groupItems.reduce((s, i) => s + (Number(i.budget) || 0), 0);
              const groupActual = groupItems.reduce((s, i) => s + (Number(i.actual_cost) || 0), 0);
              const emoji = MEDIA_EMOJI[medium] || '📌';
              const pct = groupBudget > 0 ? (groupActual / groupBudget * 100) : 0;

              return (
                <div key={medium}>
                  {/* Group Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroup(medium)}
                  >
                    <button className="shrink-0">
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <span className="text-base">{emoji}</span>
                    <span className="font-semibold text-sm">{medium}</span>
                    <Badge variant="secondary" className="text-xs">{groupItems.length}</Badge>
                    <div className="flex-1 mx-3 max-w-24">
                      <Progress value={Math.min(pct, 100)} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {fmt(groupBudget)} · Actual: {fmt(groupActual)}
                    </span>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingItem(null);
                          setFormOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Group Rows */}
                  {!isCollapsed && groupItems.map(item => (
                    <div
                      key={item.id}
                      className="grid border-b hover:bg-muted/20 transition-colors group/row text-sm"
                      style={{ gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr 1fr 1fr 1fr 0.8fr 0.8fr' }}
                    >
                      {/* Campaign + Placement */}
                      <div className="px-3 py-2">
                        <EditableCell
                          value={item.campaign_name || ''}
                          onSave={v => handleInlineUpdate(item.id, 'campaign_name', v)}
                          className="font-medium text-sm"
                        />
                        {item.placement && (
                          <span className="text-xs text-muted-foreground ml-1">{item.placement}</span>
                        )}
                      </div>
                      {/* Format + Phase */}
                      <div className="px-3 py-2">
                        <div className="text-xs text-muted-foreground">{item.format || '—'}</div>
                        {item.phase && <div className="text-xs font-medium">{item.phase}</div>}
                      </div>
                      {/* Objective */}
                      <div className="px-3 py-2 flex items-center">
                        <SelectCell
                          value={item.objective || 'awareness'}
                          options={OBJECTIVES.map(o => ({ value: o.value, label: o.label }))}
                          onSave={v => handleInlineUpdate(item.id, 'objective', v)}
                        />
                      </div>
                      {/* Period */}
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {item.start_date ? format(new Date(item.start_date), 'd MMM', { locale: el }) : '—'}
                        {item.end_date ? ` → ${format(new Date(item.end_date), 'd MMM', { locale: el })}` : ''}
                      </div>
                      {/* Budget */}
                      <div className="px-3 py-2">
                        <EditableCell
                          value={item.budget || 0}
                          type="number"
                          onSave={v => handleInlineUpdate(item.id, 'budget', v)}
                          className="font-medium"
                        />
                      </div>
                      {/* Net Budget */}
                      <div className="px-3 py-2 text-xs">
                        <span className={cn(
                          'font-medium',
                          item.commission_rate > 0 ? 'text-success' : 'text-muted-foreground'
                        )}>
                          {fmt(Number(item.net_budget) || 0)}
                        </span>
                        {item.commission_rate > 0 && (
                          <div className="text-muted-foreground/60 text-[10px]">-{item.commission_rate}%</div>
                        )}
                      </div>
                      {/* Actual */}
                      <div className="px-3 py-2">
                        <EditableCell
                          value={item.actual_cost || 0}
                          type="number"
                          onSave={v => handleInlineUpdate(item.id, 'actual_cost', v)}
                        />
                      </div>
                      {/* Impressions */}
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {fmtK(Number(item.impressions) || 0)}
                        {(item.clicks || 0) > 0 && (
                          <div className="text-[10px] text-muted-foreground/60">{fmtK(item.clicks)} clicks</div>
                        )}
                      </div>
                      {/* Status */}
                      <div className="px-3 py-2">
                        <SelectCell
                          value={item.status}
                          options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                          onSave={v => handleInlineUpdate(item.id, 'status', v)}
                        />
                      </div>
                      {/* Actions */}
                      <div className="px-2 py-2 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => { setEditingItem(item); setFormOpen(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Totals Row */}
            {filteredItems.length > 0 && (
              <div className="grid bg-muted/50 font-semibold text-sm border-t-2" style={{
                gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr 1fr 1fr 1fr 0.8fr 0.8fr'
              }}>
                <div className="px-3 py-2.5 text-muted-foreground">ΣΥΝΟΛΟ ({filteredItems.length} items)</div>
                <div className="px-3 py-2.5" />
                <div className="px-3 py-2.5" />
                <div className="px-3 py-2.5" />
                <div className="px-3 py-2.5">{fmt(totals.budget)}</div>
                <div className="px-3 py-2.5 text-success">{fmt(totals.netBudget)}</div>
                <div className="px-3 py-2.5">{fmt(totals.actualCost)}</div>
                <div className="px-3 py-2.5 text-xs">{fmtK(totals.impressions)}</div>
                <div className="px-3 py-2.5" />
                <div className="px-3 py-2.5" />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ── */}
      <AIWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerate={handleAIGenerate}
        projectName={projectName}
        projectBudget={projectBudget}
        agencyFeePercentage={agencyFeePercentage}
        deliverables={deliverables}
        generating={generating}
      />

      <ItemFormModal
        open={formOpen}
        item={editingItem}
        deliverables={deliverables}
        onClose={() => { setFormOpen(false); setEditingItem(null); }}
        onSave={handleSaveItem}
      />
    </div>
  );
}
