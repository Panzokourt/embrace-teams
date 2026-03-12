import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Trash2, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Phase { name: string; start: string; end: string; }

interface WizardState {
  step: 1 | 2 | 3;
  campaignObjectives: string[];
  targetAudience: string;
  phases: Phase[];
  selectedChannels: string[];
  budgetAllocation: Record<string, number>;
}

const OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Brand Awareness', icon: '📢' },
  { value: 'launch', label: 'Product Launch', icon: '🚀' },
  { value: 'conversion', label: 'Sales / Conversion', icon: '💰' },
  { value: 'retention', label: 'Retention / Loyalty', icon: '🔄' },
  { value: 'engagement', label: 'Engagement', icon: '❤️' },
  { value: 'leads', label: 'Lead Generation', icon: '🎯' },
  { value: 'consideration', label: 'Consideration', icon: '🤔' },
];

const CHANNEL_OPTIONS = [
  { key: 'TV & Radio', label: 'TV & Radio', icon: '📺' },
  { key: 'Digital Paid', label: 'Digital Paid', icon: '🔍' },
  { key: 'Social Media', label: 'Social Media', icon: '📱' },
  { key: 'Outdoor', label: 'Outdoor / OOH', icon: '🏙️' },
  { key: 'Print', label: 'Print & Native', icon: '📰' },
  { key: 'Influencers/PR', label: 'Influencers / PR', icon: '⭐' },
  { key: 'Email/CRM', label: 'Email / CRM', icon: '📧' },
  { key: 'Events', label: 'Events / Sponsorship', icon: '🎪' },
];

interface MediaPlanAIWizardProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  projectId: string | null;
  projectName?: string;
  totalBudget: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  onGenerated: () => void;
}

export function MediaPlanAIWizard({
  open, onClose, planId, projectId, projectName = 'Media Plan',
  totalBudget, periodStart, periodEnd, onGenerated,
}: MediaPlanAIWizardProps) {
  const [generating, setGenerating] = useState(false);
  const [w, setW] = useState<WizardState>({
    step: 1,
    campaignObjectives: ['awareness'],
    targetAudience: '',
    phases: [{ name: 'Phase 1 - Launch', start: periodStart || '', end: periodEnd || '' }],
    selectedChannels: ['Digital Paid', 'Social Media'],
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
      phases: [...prev.phases, { name: `Phase ${prev.phases.length + 1}`, start: '', end: '' }],
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

  const handleGenerate = async () => {
    if (!projectId) {
      toast.error('This plan must be linked to a project for AI generation');
      return;
    }

    setGenerating(true);
    try {
      // We need at least a dummy deliverable for the edge function
      const { data: deliverables } = await supabase
        .from('deliverables')
        .select('id, name')
        .eq('project_id', projectId);

      const delivList = deliverables && deliverables.length > 0
        ? deliverables
        : [{ id: crypto.randomUUID(), name: projectName }];

      const { data, error } = await supabase.functions.invoke('generate-media-plan', {
        body: {
          projectId,
          projectName,
          projectBudget: totalBudget,
          agencyFeePercentage: 0,
          deliverables: delivList,
          campaignObjectives: w.campaignObjectives,
          targetAudience: w.targetAudience,
          phases: w.phases,
          selectedChannels: w.selectedChannels,
          budgetAllocation: w.budgetAllocation,
        },
      });

      if (error) throw error;
      if (!data?.mediaPlanItems?.length) throw new Error('AI returned no items');

      // Get current max sort order
      const { data: existing } = await supabase
        .from('media_plan_items')
        .select('sort_order')
        .eq('media_plan_id', planId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.sort_order || 0;

      // Insert generated items
      const inserts = data.mediaPlanItems.map((item: any, idx: number) => ({
        media_plan_id: planId,
        project_id: projectId,
        medium: item.medium || 'TBD',
        title: item.campaign_name || item.medium,
        placement: item.placement || null,
        objective: item.objective || null,
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        budget: item.budget || 0,
        status: 'planned',
        priority: 'medium',
        phase: item.phase || null,
        notes: item.notes || null,
        sort_order: maxOrder + idx + 1,
      }));

      const { error: insertError } = await supabase.from('media_plan_items').insert(inserts);
      if (insertError) throw insertError;

      toast.success(`${inserts.length} actions generated by AI`);
      onGenerated();
      onClose();
    } catch (err: any) {
      toast.error('AI generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Media Plan Wizard
          </DialogTitle>
          <DialogDescription>Step {w.step} of 3 · Budget: €{totalBudget.toLocaleString()}</DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn('flex-1 h-1.5 rounded-full transition-colors', s <= w.step ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        {/* Step 1: Objectives & Audience */}
        {w.step === 1 && (
          <div className="space-y-5 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">Campaign Objectives</Label>
              <div className="grid grid-cols-2 gap-2">
                {OBJECTIVE_OPTIONS.map(opt => {
                  const selected = w.campaignObjectives.includes(opt.value);
                  return (
                    <button key={opt.value} onClick={() => toggleObjective(opt.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all',
                        selected ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/30'
                      )}>
                      <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', selected ? 'border-primary bg-primary' : 'border-muted-foreground/40')}>
                        {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Target Audience</Label>
              <Textarea
                value={w.targetAudience}
                onChange={e => setW(p => ({ ...p, targetAudience: e.target.value }))}
                placeholder="e.g. Women 25-44, urban areas, mobile-first..."
                rows={2} className="text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Campaign Phases</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPhase} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Phase
                </Button>
              </div>
              <div className="space-y-2">
                {w.phases.map((phase, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_130px_130px_32px] gap-2 items-center p-2 rounded-lg bg-muted/30 border">
                    <Input value={phase.name} onChange={e => updatePhase(idx, 'name', e.target.value)} placeholder="Phase name" className="h-8 text-sm" />
                    <Input type="date" value={phase.start} onChange={e => updatePhase(idx, 'start', e.target.value)} className="h-8 text-sm" />
                    <Input type="date" value={phase.end} onChange={e => updatePhase(idx, 'end', e.target.value)} className="h-8 text-sm" />
                    {w.phases.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePhase(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Channels */}
        {w.step === 2 && (
          <div className="space-y-5 py-2">
            <Label className="text-sm font-medium block">Select Channels</Label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_OPTIONS.map(ch => {
                const selected = w.selectedChannels.includes(ch.key);
                return (
                  <button key={ch.key} onClick={() => toggleChannel(ch.key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all',
                      selected ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/30'
                    )}>
                    <span>{ch.icon}</span>
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Budget Allocation */}
        {w.step === 3 && (
          <div className="space-y-5 py-2">
            <Label className="text-sm font-medium block">Budget Allocation (optional)</Label>
            <p className="text-xs text-muted-foreground">Adjust percentages per channel or leave equal for AI to decide.</p>
            <div className="space-y-3">
              {w.selectedChannels.map(ch => {
                const pct = w.budgetAllocation[ch] || Math.round(100 / w.selectedChannels.length);
                return (
                  <div key={ch} className="flex items-center gap-3">
                    <span className="text-sm w-36 shrink-0">{ch}</span>
                    <Slider
                      value={[pct]}
                      onValueChange={([v]) => setW(prev => ({
                        ...prev,
                        budgetAllocation: { ...prev.budgetAllocation, [ch]: v },
                      }))}
                      max={100} step={5} className="flex-1"
                    />
                    <Badge variant="secondary" className="w-12 text-center">{pct}%</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {w.step > 1 && (
            <Button variant="outline" onClick={() => setW(p => ({ ...p, step: (p.step - 1) as 1 | 2 | 3 }))}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {w.step < 3 ? (
            <Button onClick={() => setW(p => ({ ...p, step: (p.step + 1) as 1 | 2 | 3 }))}
              disabled={w.step === 1 && w.campaignObjectives.length === 0}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={generating || w.selectedChannels.length === 0}>
              {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Generate Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
