import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket, ChevronLeft, Loader2, FolderOpen, MessageSquare, Users, Mail, BookOpen, Sparkles, Briefcase, Settings } from 'lucide-react';
import { Profile } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Props {
  profile: Profile | null;
  jobTitle: string;
  phone: string;
  loading: boolean;
  onFinish: () => void;
  onBack: () => void;
}

interface NextStep {
  title: string;
  description: string;
  href: string;
  icon: 'users' | 'folder' | 'message' | 'book' | 'briefcase' | 'sparkles' | 'mail' | 'settings';
}

const ICONS: Record<NextStep['icon'], React.ComponentType<{ className?: string }>> = {
  users: Users,
  folder: FolderOpen,
  message: MessageSquare,
  book: BookOpen,
  briefcase: Briefcase,
  sparkles: Sparkles,
  mail: Mail,
  settings: Settings,
};

const FALLBACK: NextStep[] = [
  { title: 'Καλέστε την ομάδα σας', description: 'Προσθέστε συναδέλφους με ρόλους.', href: '/hr', icon: 'users' },
  { title: 'Δημιουργήστε πρώτο έργο', description: 'Ξεκινήστε από template ή κενό.', href: '/work/projects', icon: 'folder' },
  { title: 'Συνδέστε email', description: 'Μετατρέψτε briefs σε projects.', href: '/inbox', icon: 'mail' },
  { title: 'Εξερευνήστε τη Βιβλιοθήκη', description: 'AI suggestions για άρθρα.', href: '/knowledge', icon: 'book' },
  { title: 'Ρωτήστε τον Secretary', description: 'AI βοηθός για κάθε ερώτηση.', href: '/', icon: 'sparkles' },
];

export default function OnboardingReady({ profile, jobTitle, phone, loading, onFinish, onBack }: Props) {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<NextStep[]>([]);
  const [stepsLoading, setStepsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('onboarding-personalize', { body: {} });
        if (cancelled) return;
        if (!error && Array.isArray(data?.steps) && data.steps.length > 0) {
          setSteps(data.steps);
        } else {
          setSteps(FALLBACK);
        }
      } catch {
        if (!cancelled) setSteps(FALLBACK);
      } finally {
        if (!cancelled) setStepsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="text-center space-y-6">
      <Rocket className="h-16 w-16 text-primary mx-auto" />
      <h2 className="text-xl font-semibold text-foreground">Είστε έτοιμοι! 🎉</h2>

      <div className="text-left bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
        <p className="text-muted-foreground">
          <strong className="text-foreground">Email:</strong> {profile?.email}
        </p>
        {profile?.full_name && (
          <p className="text-muted-foreground">
            <strong className="text-foreground">Όνομα:</strong> {profile.full_name}
          </p>
        )}
        {jobTitle && (
          <p className="text-muted-foreground">
            <strong className="text-foreground">Θέση:</strong> {jobTitle}
          </p>
        )}
        {phone && (
          <p className="text-muted-foreground">
            <strong className="text-foreground">Τηλέφωνο:</strong> {phone}
          </p>
        )}
      </div>

      <div className="space-y-2 text-left">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            AI πρόταση: Τα επόμενά σας 5 βήματα
          </p>
        </div>
        {stepsLoading ? (
          <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Προσαρμογή στον ρόλο σας...
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((s, i) => {
              const Icon = ICONS[s.icon] ?? Sparkles;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onFinish(); setTimeout(() => navigate(s.href), 50); }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
        </Button>
        <Button onClick={onFinish} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Μπείτε στον χώρο εργασίας
        </Button>
      </div>
    </div>
  );
}
