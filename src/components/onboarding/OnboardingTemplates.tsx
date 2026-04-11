import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import type { WorkspacePreset } from './workspacePresets';

interface TemplateRow {
  name: string;
  stages: string[];
  defaultTasks: string[];
  selected: boolean;
}

interface Props {
  companyId: string | undefined;
  preset: WorkspacePreset | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

type Phase = 'idle' | 'saving_templates' | 'generating_sops' | 'done' | 'error';

export default function OnboardingTemplates({ companyId, preset, onNext, onBack, onSkip }: Props) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [generateSOPs, setGenerateSOPs] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (preset) {
      setTemplates(preset.projectTemplates.map(t => ({ ...t, selected: true })));
    }
  }, [preset]);

  const selectedCount = templates.filter(t => t.selected).length;
  const isBusy = phase === 'saving_templates' || phase === 'generating_sops';

  const toggleTemplate = (idx: number) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  };

  const handleSave = async () => {
    if (!companyId || !preset) return;
    const selected = templates.filter(t => t.selected);
    if (selected.length === 0) return;

    try {
      // Save templates
      setPhase('saving_templates');
      setStatusMsg('Δημιουργία templates...');

      for (const tmpl of selected) {
        const { data: created, error: tErr } = await supabase
          .from('project_templates')
          .insert({
            company_id: companyId,
            name: tmpl.name,
            description: `${preset.label} — ${tmpl.name}`,
            project_type: preset.type,
          })
          .select('id')
          .single();

        if (tErr) throw tErr;

        if (created && tmpl.defaultTasks.length > 0) {
          const { error: taskErr } = await supabase
            .from('project_template_tasks')
            .insert(
              tmpl.defaultTasks.map((title, i) => ({
                template_id: created.id,
                title,
                sort_order: i,
              }))
            );
          if (taskErr) throw taskErr;
        }
      }

      // Generate SOPs
      if (generateSOPs) {
        setPhase('generating_sops');
        setStatusMsg('AI δημιουργεί SOPs...');

        for (const tmpl of selected) {
          try {
            await supabase.functions.invoke('secretary-agent', {
              body: {
                messages: [{
                  role: 'user',
                  content: `Δημιούργησε ένα λεπτομερές SOP (Standard Operating Procedure) για project type "${tmpl.name}" για ${preset.label}. Stages: ${tmpl.stages.join(' → ')}. Typical tasks: ${tmpl.defaultTasks.join(', ')}. Γράψε το σε Markdown με sections: Σκοπός, Ευθύνες, Βήματα ανά stage, KPIs, Checklist. Γλώσσα: ελληνικά.`,
                }],
                mode: 'kb_create',
                company_id: companyId,
                kb_title: 'SOP: ' + tmpl.name,
                kb_tags: ['sop', 'template', preset.type],
              },
            });
          } catch (e) {
            console.warn('SOP generation failed for', tmpl.name, e);
          }
        }
      }

      setPhase('done');
      setStatusMsg('Ολοκληρώθηκε!');
      toast.success(`${selected.length} templates δημιουργήθηκαν${generateSOPs ? ' με SOPs' : ''}!`);
      setTimeout(onNext, 1200);
    } catch (err: any) {
      setPhase('error');
      setStatusMsg(err.message || 'Σφάλμα');
      toast.error(err.message || 'Σφάλμα δημιουργίας templates');
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Project templates & SOPs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Έτοιμες δομές για τα projects σας.
        </p>
      </div>

      <div className="space-y-3">
        {templates.map((tmpl, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-4 transition-all ${
              tmpl.selected
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/30 opacity-40'
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={tmpl.selected}
                onCheckedChange={() => toggleTemplate(idx)}
                disabled={isBusy}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{tmpl.name}</p>
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {tmpl.stages.map((stage, i) => (
                    <span key={stage} className="inline-flex items-center">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">{stage}</span>
                      {i < tmpl.stages.length - 1 && <span className="text-muted-foreground/50 mx-0.5 text-xs">→</span>}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {tmpl.defaultTasks.length} default tasks · {tmpl.defaultTasks.slice(0, 3).join(', ')}
                  {tmpl.defaultTasks.length > 3 && '...'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI SOP toggle */}
      {selectedCount > 0 && (
        <div className={`rounded-xl border p-4 transition-all ${
          generateSOPs
            ? 'border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20'
            : 'border-border/30'
        }`}>
          <div className="flex items-center gap-3">
            <Sparkles className={`h-5 w-5 ${generateSOPs ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Δημιουργία SOPs με AI</p>
              <p className="text-xs text-muted-foreground">
                Ο AI θα γράψει Standard Operating Procedures για κάθε template στο Knowledge Base σας
              </p>
            </div>
            <Checkbox
              checked={generateSOPs}
              onCheckedChange={(c) => setGenerateSOPs(!!c)}
              disabled={isBusy}
            />
          </div>
        </div>
      )}

      {/* Progress / success indicator */}
      {(phase === 'saving_templates' || phase === 'generating_sops') && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{statusMsg}</span>
        </div>
      )}
      {phase === 'done' && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary py-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isBusy}>Πίσω</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={isBusy}>Skip</Button>
          <Button onClick={handleSave} disabled={isBusy || selectedCount === 0}>
            {isBusy ? 'Αποθήκευση...' : `Αποθήκευση (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
