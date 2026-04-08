import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  companyId: string | undefined;
  sourceIds: string[];
  onNext: () => void;
  onSkip: () => void;
}

type SetupPhase = 'idle' | 'compiling' | 'done' | 'error';

export default function OnboardingAISetup({ companyId, sourceIds, onNext, onSkip }: Props) {
  const [phase, setPhase] = useState<SetupPhase>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [articlesCreated, setArticlesCreated] = useState(0);

  useEffect(() => {
    if (sourceIds.length === 0) {
      setPhase('done');
      setStatusMsg('Δεν υπάρχουν έγγραφα για επεξεργασία.');
    }
  }, [sourceIds]);

  const startCompilation = async () => {
    if (!companyId || sourceIds.length === 0) {
      onNext();
      return;
    }

    setPhase('compiling');
    setStatusMsg('Ο AI αναλύει τα έγγραφά σας...');

    try {
      for (let i = 0; i < sourceIds.length; i++) {
        setStatusMsg(`Επεξεργασία ${i + 1}/${sourceIds.length}...`);

        const { data, error } = await supabase.functions.invoke('kb-compiler', {
          body: { source_id: sourceIds[i], company_id: companyId },
        });

        if (!error && data?.articles_created) {
          setArticlesCreated(prev => prev + data.articles_created);
        }
      }

      setPhase('done');
      setStatusMsg('Η εκπαίδευση ολοκληρώθηκε!');
    } catch (error) {
      setPhase('error');
      setStatusMsg('Σφάλμα κατά την επεξεργασία. Μπορείτε να δοκιμάσετε ξανά αργότερα.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="relative inline-block">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-2" />
          {phase === 'compiling' && (
            <div className="absolute inset-0 animate-ping">
              <Sparkles className="h-10 w-10 text-primary/30" />
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold text-foreground">AI Εκπαίδευση</h2>
        <p className="text-sm text-muted-foreground">
          Ο AI βοηθός σας μαθαίνει για την εταιρεία σας
        </p>
      </div>

      {/* Progress area */}
      <div className="bg-muted/50 rounded-xl p-6 text-center space-y-4">
        {phase === 'idle' && sourceIds.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {sourceIds.length} έγγραφ{sourceIds.length === 1 ? 'ο' : 'α'} έτοιμ{sourceIds.length === 1 ? 'ο' : 'α'} για ανάλυση
            </p>
            <Button onClick={startCompilation}>
              <Sparkles className="h-4 w-4 mr-2" />
              Ξεκινήστε την εκπαίδευση
            </Button>
          </>
        )}

        {phase === 'compiling' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{statusMsg}</p>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
            <p className="text-sm text-foreground font-medium">{statusMsg}</p>
            {articlesCreated > 0 && (
              <p className="text-xs text-muted-foreground">
                Δημιουργήθηκαν {articlesCreated} άρθρα στο Wiki σας
              </p>
            )}
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="text-sm text-destructive">{statusMsg}</p>
            <Button variant="outline" size="sm" onClick={startCompilation}>
              Δοκιμή ξανά
            </Button>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={onNext} className="flex-1" disabled={phase === 'compiling'}>
          {phase === 'compiling' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Συνέχεια <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        {phase !== 'compiling' && (
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Παράλειψη
          </Button>
        )}
      </div>
    </div>
  );
}
