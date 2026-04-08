import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
}

export function useOnboardingProgress() {
  const { user, profile, company } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const isComplete = onboardingCompleted === true;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkProgress = async () => {
      setLoading(true);
      try {
        // Fetch onboarding status from DB directly
        const { data: profileData } = await supabase
          .from('profiles')
          .select('onboarding_completed, phone, job_title, avatar_url')
          .eq('id', user.id)
          .single();

        const completed = profileData?.onboarding_completed === true;
        setOnboardingCompleted(completed);

        if (completed) {
          setLoading(false);
          return;
        }

        const companyDone = !!company?.id;
        const profileDone = !!(profileData?.phone || profileData?.job_title || profileData?.avatar_url);

        let teamDone = false;
        let clientDone = false;
        let docsDone = false;

        if (company?.id) {
          const [invRes, clientRes, docsRes] = await Promise.all([
            supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
            supabase.from('clients').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
            supabase.from('kb_raw_sources').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
          ]);
          teamDone = (invRes.count ?? 0) > 0;
          clientDone = (clientRes.count ?? 0) > 0;
          docsDone = (docsRes.count ?? 0) > 0;
        }

        let aiDone = false;
        if (company?.id && docsDone) {
          const { count } = await supabase.from('kb_articles').select('id', { count: 'exact', head: true }).eq('company_id', company.id);
          aiDone = (count ?? 0) > 0;
        }

        setSteps([
          { key: 'company', label: 'Εταιρεία', description: 'Ρύθμιση εταιρείας', completed: companyDone },
          { key: 'profile', label: 'Προφίλ', description: 'Στοιχεία προφίλ', completed: profileDone },
          { key: 'team', label: 'Ομάδα', description: 'Πρόσκληση μελών', completed: teamDone },
          { key: 'client', label: 'Πελάτης', description: 'Πρώτος πελάτης', completed: clientDone },
          { key: 'docs', label: 'Έγγραφα', description: 'Εταιρικά αρχεία', completed: docsDone },
          { key: 'ai', label: 'AI Setup', description: 'Εκπαίδευση AI', completed: aiDone },
        ]);
      } catch (err) {
        console.error('Onboarding progress check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, [user, profile, company]);

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length || 6;
  const percent = Math.round((completedCount / totalCount) * 100);

  const markComplete = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
    setOnboardingCompleted(true);
  };

  return { steps, completedCount, totalCount, percent, isComplete, loading, markComplete };
}
