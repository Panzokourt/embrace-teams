import { Button } from '@/components/ui/button';
import { Rocket, ChevronLeft, Loader2, FolderOpen, MessageSquare } from 'lucide-react';
import { Profile } from '@/contexts/AuthContext';

interface Props {
  profile: Profile | null;
  jobTitle: string;
  phone: string;
  loading: boolean;
  onFinish: () => void;
  onBack: () => void;
}

export default function OnboardingReady({ profile, jobTitle, phone, loading, onFinish, onBack }: Props) {
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
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Γρήγορες ενέργειες</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border/40 text-sm">
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Δημιουργήστε project</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border/40 text-sm">
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Ρωτήστε τον Secretary</span>
          </div>
        </div>
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
