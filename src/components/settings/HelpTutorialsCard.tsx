import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { GraduationCap, RotateCcw, PlayCircle, CheckCircle2 } from 'lucide-react';
import { COACHING_REGISTRY, filterCoachingForRole } from '@/lib/coaching/registry';
import { useCoach } from '@/hooks/useCoach';
import { useCoaching } from '@/components/coaching/CoachingProvider';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function HelpTutorialsCard() {
  const { companyRole } = useAuth();
  const { seen, reset } = useCoach();
  const { trigger, restartAll, disabled, setDisabled } = useCoaching();

  const entries = useMemo(
    () => filterCoachingForRole(COACHING_REGISTRY, companyRole?.role ?? null),
    [companyRole?.role]
  );

  const handleResetAll = async () => {
    await restartAll();
    toast.success('Όλα τα tutorials έγιναν reset.');
  };

  const handleResetOne = async (key: string) => {
    await reset(key);
    toast.success('Έγινε reset — θα ξαναεμφανιστεί στην επόμενη επίσκεψη.');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          <CardTitle>Βοήθεια & Tutorials</CardTitle>
        </div>
        <CardDescription>
          Διαχειρίσου τα in-app tours και τις οδηγίες πρώτης χρήσης.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Ενεργοποίηση in-app coaching</Label>
            <p className="text-xs text-muted-foreground">
              Όταν είναι απενεργοποιημένα, δεν εμφανίζονται popovers/tours αυτόματα.
            </p>
          </div>
          <Switch checked={!disabled} onCheckedChange={(v) => setDisabled(!v)} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Επανέλαβε όλα τα tutorials</Label>
            <p className="text-xs text-muted-foreground">
              Καθαρίζει το ιστορικό — όλα τα coaches θα ξαναεμφανιστούν.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset όλων
          </Button>
        </div>

        <Separator />

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Διαθέσιμα tutorials</Label>
          <div className="mt-3 space-y-2">
            {entries.map((e) => {
              const wasSeen = seen.has(e.key);
              return (
                <div key={e.key} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-primary/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      {wasSeen && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-success" /> Είδα
                        </span>
                      )}
                    </div>
                    {e.body && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{e.body}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => trigger(e.key)} className="h-8">
                      <PlayCircle className="h-3.5 w-3.5 mr-1" />
                      Δείξε μου
                    </Button>
                    {wasSeen && (
                      <Button variant="ghost" size="icon" onClick={() => handleResetOne(e.key)} className="h-8 w-8" title="Reset">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
