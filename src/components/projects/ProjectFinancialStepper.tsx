import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Check, Calculator, Send, ThumbsUp, Package, Receipt, Wallet,
  ChevronDown, Clock, SkipForward, X as XIcon, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Milestones {
  id?: string;
  project_id: string;
  company_id: string;
  costing_at: string | null;
  costing_amount: number | null;
  costing_notes: string | null;
  proposal_sent_at: string | null;
  proposal_amount: number | null;
  proposal_reference: string | null;
  proposal_accepted_at: string | null;
  proposal_rejected_at: string | null;
  delivery_at: string | null;
  delivery_notes: string | null;
  invoiced_at: string | null;
  invoice_id: string | null;
  collected_at: string | null;
  collected_amount: number | null;
  is_internal_costing: boolean;
}

interface StepDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dateField: keyof Milestones;
  skippableForInternal?: boolean;
}

const STEPS: StepDef[] = [
  { key: 'costing', label: 'Κοστολόγηση', icon: Calculator, dateField: 'costing_at' },
  { key: 'proposal', label: 'Προσφορά', icon: Send, dateField: 'proposal_sent_at', skippableForInternal: true },
  { key: 'accepted', label: 'Ανάθεση', icon: ThumbsUp, dateField: 'proposal_accepted_at', skippableForInternal: true },
  { key: 'delivery', label: 'Παράδοση', icon: Package, dateField: 'delivery_at' },
  { key: 'invoiced', label: 'Τιμολόγηση', icon: Receipt, dateField: 'invoiced_at' },
  { key: 'collected', label: 'Είσπραξη', icon: Wallet, dateField: 'collected_at' },
];

const emptyMilestones = (projectId: string, companyId: string): Milestones => ({
  project_id: projectId,
  company_id: companyId,
  costing_at: null,
  costing_amount: null,
  costing_notes: null,
  proposal_sent_at: null,
  proposal_amount: null,
  proposal_reference: null,
  proposal_accepted_at: null,
  proposal_rejected_at: null,
  delivery_at: null,
  delivery_notes: null,
  invoiced_at: null,
  invoice_id: null,
  collected_at: null,
  collected_amount: null,
  is_internal_costing: false,
});

function getDaysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return differenceInDays(new Date(b), new Date(a));
}

function formatDate(d: string | null) {
  if (!d) return null;
  return format(new Date(d), 'd MMM yyyy', { locale: el });
}

interface ProjectFinancialStepperProps {
  projectId: string;
  isInternal?: boolean;
  compact?: boolean;
}

export function ProjectFinancialStepper({ projectId, isInternal, compact }: ProjectFinancialStepperProps) {
  const { user, company } = useAuth();
  const [milestones, setMilestones] = useState<Milestones | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    loadMilestones();
  }, [projectId]);

  async function loadMilestones() {
    setLoading(true);
    const { data } = await supabase
      .from('project_financial_milestones')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (data) {
      setMilestones(data as unknown as Milestones);
    } else {
      setMilestones(null);
    }
    setLoading(false);
  }

  async function ensureMilestones(): Promise<Milestones> {
    if (milestones?.id) return milestones;
    const newM = emptyMilestones(projectId, company?.id || '');
    newM.is_internal_costing = isInternal || false;
    const { data, error } = await supabase
      .from('project_financial_milestones')
      .insert({
        project_id: newM.project_id,
        company_id: newM.company_id,
        is_internal_costing: newM.is_internal_costing,
      } as any)
      .select()
      .single();
    if (error) throw error;
    const result = data as unknown as Milestones;
    setMilestones(result);
    return result;
  }

  async function saveField(updates: Partial<Milestones>) {
    setSaving(true);
    try {
      const m = await ensureMilestones();
      const { error } = await supabase
        .from('project_financial_milestones')
        .update({ ...updates, updated_by: user?.id } as any)
        .eq('id', m.id!);
      if (error) throw error;
      setMilestones(prev => prev ? { ...prev, ...updates } : prev);
      toast.success('Αποθηκεύτηκε');
    } catch {
      toast.error('Σφάλμα αποθήκευσης');
    }
    setSaving(false);
  }

  async function completeStep(step: StepDef) {
    const now = new Date().toISOString();
    await saveField({ [step.dateField]: now } as any);
    setExpandedStep(null);
  }

  async function clearStep(step: StepDef) {
    await saveField({ [step.dateField]: null } as any);
  }

  const isIntCosting = milestones?.is_internal_costing || isInternal || false;

  function getStepStatus(step: StepDef): 'done' | 'current' | 'upcoming' | 'skipped' {
    if (!milestones) {
      return step.key === 'costing' ? 'current' : 'upcoming';
    }
    const dateVal = milestones[step.dateField] as string | null;
    if (dateVal) return 'done';

    // Check if skipped for internal
    if (isIntCosting && step.skippableForInternal) return 'skipped';

    // Rejected proposal
    if (step.key === 'accepted' && milestones.proposal_rejected_at) return 'skipped';

    // Find first incomplete non-skipped step
    for (const s of STEPS) {
      if (isIntCosting && s.skippableForInternal) continue;
      if (s.key === 'accepted' && milestones.proposal_rejected_at) continue;
      const val = milestones[s.dateField] as string | null;
      if (!val) return s.key === step.key ? 'current' : 'upcoming';
    }
    return 'upcoming';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visibleSteps = STEPS.filter(s => {
    if (compact && isIntCosting && s.skippableForInternal) return false;
    return true;
  });

  // Timeline durations
  const durations: { label: string; days: number }[] = [];
  if (milestones) {
    const pairs: [string, string, keyof Milestones, keyof Milestones][] = [
      ['Κοστολόγηση → Προσφορά', 'proposal', 'costing_at', 'proposal_sent_at'],
      ['Προσφορά → Ανάθεση', 'accepted', 'proposal_sent_at', 'proposal_accepted_at'],
      ['Ανάθεση → Παράδοση', 'delivery', 'proposal_accepted_at', 'delivery_at'],
      ['Παράδοση → Τιμολόγηση', 'invoiced', 'delivery_at', 'invoiced_at'],
      ['Τιμολόγηση → Είσπραξη', 'collected', 'invoiced_at', 'collected_at'],
    ];
    for (const [label, , from, to] of pairs) {
      const days = getDaysBetween(milestones[from] as string | null, milestones[to] as string | null);
      if (days !== null) durations.push({ label, days });
    }
  }

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {visibleSteps.map((step, idx) => {
          const status = getStepStatus(step);
          const Icon = step.icon;
          const isExpanded = expandedStep === step.key;
          const dateVal = milestones?.[step.dateField] as string | null;

          return (
            <div key={step.key} className="flex items-center">
              {idx > 0 && (
                <div className={cn(
                  'w-6 h-0.5 mx-0.5 flex-shrink-0',
                  status === 'done' ? 'bg-success' :
                  status === 'skipped' ? 'bg-muted-foreground/20' : 'bg-border'
                )} />
              )}
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all min-w-[72px]',
                  status === 'done' && 'bg-success/10',
                  status === 'current' && 'bg-primary/10 ring-1 ring-primary/30',
                  status === 'skipped' && 'opacity-40',
                  status === 'upcoming' && 'opacity-50',
                  isExpanded && 'ring-2 ring-primary/50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  status === 'done' && 'bg-success text-success-foreground',
                  status === 'current' && 'bg-primary text-primary-foreground',
                  status === 'skipped' && 'bg-muted text-muted-foreground',
                  status === 'upcoming' && 'bg-muted text-muted-foreground',
                )}>
                  {status === 'done' ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-[10px] font-medium leading-tight text-center">{step.label}</span>
                {dateVal && !compact && (
                  <span className="text-[9px] text-muted-foreground">{formatDate(dateVal)}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Expanded edit panel */}
      {expandedStep && !compact && (
        <StepEditPanel
          step={STEPS.find(s => s.key === expandedStep)!}
          milestones={milestones}
          saving={saving}
          onComplete={completeStep}
          onClear={clearStep}
          onSaveField={saveField}
          projectId={projectId}
        />
      )}

      {/* Duration timeline */}
      {!compact && durations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {durations.map(d => (
            <Badge key={d.label} variant="secondary" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {d.label}: {d.days} {d.days === 1 ? 'ημέρα' : 'ημέρες'}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function StepEditPanel({
  step,
  milestones,
  saving,
  onComplete,
  onClear,
  onSaveField,
  projectId,
}: {
  step: StepDef;
  milestones: Milestones | null;
  saving: boolean;
  onComplete: (s: StepDef) => void;
  onClear: (s: StepDef) => void;
  onSaveField: (u: Partial<Milestones>) => void;
  projectId: string;
}) {
  const dateVal = milestones?.[step.dateField] as string | null;
  const isDone = !!dateVal;

  // Local form state
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (step.key === 'costing') {
      setAmount(milestones?.costing_amount?.toString() || '');
      setNotes(milestones?.costing_notes || '');
    } else if (step.key === 'proposal') {
      setAmount(milestones?.proposal_amount?.toString() || '');
      setReference(milestones?.proposal_reference || '');
    } else if (step.key === 'delivery') {
      setNotes(milestones?.delivery_notes || '');
    } else if (step.key === 'collected') {
      setAmount(milestones?.collected_amount?.toString() || '');
    }
  }, [step.key, milestones]);

  function handleSaveDetails() {
    const updates: Partial<Milestones> = {};
    if (step.key === 'costing') {
      updates.costing_amount = amount ? parseFloat(amount) : null;
      updates.costing_notes = notes || null;
    } else if (step.key === 'proposal') {
      updates.proposal_amount = amount ? parseFloat(amount) : null;
      updates.proposal_reference = reference || null;
    } else if (step.key === 'delivery') {
      updates.delivery_notes = notes || null;
    } else if (step.key === 'collected') {
      updates.collected_amount = amount ? parseFloat(amount) : null;
    }
    onSaveField(updates);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <step.icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{step.label}</span>
            {isDone && (
              <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                {formatDate(dateVal)}
              </Badge>
            )}
          </div>
          <div className="flex gap-1.5">
            {isDone ? (
              <Button size="sm" variant="ghost" onClick={() => onClear(step)} disabled={saving}>
                <XIcon className="h-3.5 w-3.5 mr-1" /> Αναίρεση
              </Button>
            ) : (
              <Button size="sm" onClick={() => onComplete(step)} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Ολοκλήρωση
              </Button>
            )}
          </div>
        </div>

        {/* Step-specific fields */}
        {(step.key === 'costing' || step.key === 'collected') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ποσό (€)</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {step.key === 'costing' && (
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Σημειώσεις</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={handleSaveDetails} disabled={saving}>
                Αποθήκευση
              </Button>
            </div>
          </div>
        )}

        {step.key === 'proposal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ποσό προσφοράς (€)</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Αρ. προσφοράς</label>
              <Input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="π.χ. PROP-2026-001"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={handleSaveDetails} disabled={saving}>
                Αποθήκευση
              </Button>
            </div>
          </div>
        )}

        {step.key === 'delivery' && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground block">Σημειώσεις παράδοσης</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleSaveDetails} disabled={saving}>
                Αποθήκευση
              </Button>
            </div>
          </div>
        )}

        {step.key === 'accepted' && !isDone && milestones && !milestones.proposal_rejected_at && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onSaveField({ proposal_rejected_at: new Date().toISOString() })}
              disabled={saving}
            >
              Απόρριψη προσφοράς
            </Button>
          </div>
        )}

        {step.key === 'accepted' && milestones?.proposal_rejected_at && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              Απορρίφθηκε: {formatDate(milestones.proposal_rejected_at)}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSaveField({ proposal_rejected_at: null })}
              disabled={saving}
            >
              Αναίρεση
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini version for project header
export function ProjectFinancialStepperMini({ projectId, isInternal }: { projectId: string; isInternal?: boolean }) {
  return <ProjectFinancialStepper projectId={projectId} isInternal={isInternal} compact />;
}
