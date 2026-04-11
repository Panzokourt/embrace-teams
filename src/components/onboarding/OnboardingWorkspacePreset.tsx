import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Check } from 'lucide-react';
import { WORKSPACE_PRESETS, type WorkspacePreset } from './workspacePresets';

interface Props {
  companyId: string | undefined;
  onNext: (preset: WorkspacePreset) => void;
  onBack: () => void;
}

export default function OnboardingWorkspacePreset({ companyId, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedPreset = WORKSPACE_PRESETS.find(p => p.type === selected) || null;

  const handleContinue = async () => {
    if (!selectedPreset) return;
    if (companyId) {
      try {
        await (supabase.from('companies') as any).update({ workspace_type: selectedPreset.type }).eq('id', companyId);
      } catch (e) {
        console.warn('Could not save workspace_type:', e);
      }
    }
    onNext(selectedPreset);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Τι είδους εταιρία είστε;</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Θα φορτώσουμε έτοιμες υπηρεσίες, templates και δομή που ταιριάζουν στη δουλειά σας.
        </p>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {WORKSPACE_PRESETS.map(preset => {
          const isSelected = selected === preset.type;
          return (
            <button
              key={preset.type}
              onClick={() => setSelected(preset.type)}
              className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/40 hover:border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{preset.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{preset.label}</span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                        <Check className="h-3.5 w-3.5" /> Επιλεγμένο
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{preset.tagline}</p>
                </div>
              </div>

              {isSelected && (
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  {preset.departments.length > 0 && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1.5">Τμήματα</p>
                      <div className="flex flex-wrap gap-1">
                        {preset.departments.slice(0, 3).map(d => (
                          <span key={d} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{d}</span>
                        ))}
                        {preset.departments.length > 3 && (
                          <span className="px-2 py-0.5 text-muted-foreground">+{preset.departments.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-muted-foreground mb-1.5">Υπηρεσίες</p>
                    <div className="flex flex-wrap gap-1">
                      {preset.services.slice(0, 3).map(s => (
                        <span key={s.name} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{s.name}</span>
                      ))}
                      {preset.services.length > 3 && (
                        <span className="px-2 py-0.5 text-muted-foreground">+{preset.services.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1.5">Templates</p>
                    <div className="flex flex-wrap gap-1">
                      {preset.projectTemplates.map(t => (
                        <span key={t.name} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Όλα μπορούν να αλλάξουν μετά. Αυτό είναι μόνο αφετηρία.
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Πίσω</Button>
        <Button onClick={handleContinue} disabled={!selected}>Συνέχεια</Button>
      </div>
    </div>
  );
}
