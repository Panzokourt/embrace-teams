import { Button } from '@/components/ui/button';
import { PartyPopper, ChevronRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Profile } from '@/contexts/AuthContext';

interface Props {
  profile: Profile | null;
  onNext: () => void;
  onSignOut: () => void;
}

export default function OnboardingWelcome({ profile, onNext, onSignOut }: Props) {
  return (
    <div className="text-center space-y-6">
      <div className="relative inline-block">
        <PartyPopper className="h-16 w-16 text-primary mx-auto" />
        <Sparkles className="h-5 w-5 text-warning absolute -top-1 -right-1 animate-pulse" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        Καλωσήρθατε, {profile?.full_name || 'χρήστη'}!
      </h1>
      <p className="text-muted-foreground">
        Ας ρυθμίσουμε μαζί τον χώρο εργασίας σας σε λίγα βήματα.
        Ο AI βοηθός σας θα είναι δίπλα σας καθ' όλη τη διαδρομή.
      </p>
      <div className="bg-accent/50 rounded-xl p-4 text-left text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Τι θα ρυθμίσουμε:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Εταιρεία & προφίλ</li>
          <li>Πρόσκληση ομάδας</li>
          <li>Πρώτος πελάτης</li>
          <li>Εταιρικά έγγραφα & AI εκπαίδευση</li>
        </ul>
      </div>
      <Button onClick={onNext} className="w-full">
        Ας ξεκινήσουμε <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onSignOut} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" />Αποσύνδεση
      </Button>
    </div>
  );
}
