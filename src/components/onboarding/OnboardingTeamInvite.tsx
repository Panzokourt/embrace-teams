import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, ChevronLeft, ChevronRight, Loader2, X, Plus, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  companyId: string | undefined;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function OnboardingTeamInvite({ userId, companyId, onNext, onBack, onSkip }: Props) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  const addEmail = () => setEmails([...emails, '']);
  const removeEmail = (idx: number) => setEmails(emails.filter((_, i) => i !== idx));
  const updateEmail = (idx: number, val: string) => {
    const updated = [...emails];
    updated[idx] = val;
    setEmails(updated);
  };

  const handleInvite = async () => {
    if (!companyId) {
      toast.error('Πρέπει πρώτα να δημιουργήσετε εταιρεία');
      return;
    }

    const validEmails = emails
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (validEmails.length === 0) {
      onNext();
      return;
    }

    setLoading(true);
    try {
      const invitations = validEmails.map(email => ({
        email,
        company_id: companyId,
        invited_by: userId,
        role: 'member' as const,
        access_scope: 'assigned' as const,
      }));

      const { error } = await supabase.from('invitations').insert(invitations);
      if (error) throw error;

      toast.success(`${validEmails.length} πρόσκληση(-εις) στάλθηκε(-αν)!`);
      onNext();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα αποστολής');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Users className="h-10 w-10 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-foreground">Προσκαλέστε την ομάδα σας</h2>
        <p className="text-sm text-muted-foreground">Στείλτε πρόσκληση σε μέλη της ομάδας σας</p>
      </div>

      <div className="space-y-3">
        <Label>Email μελών</Label>
        {emails.map((email, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="email@example.com"
                type="email"
                value={email}
                onChange={(e) => updateEmail(idx, e.target.value)}
              />
            </div>
            {emails.length > 1 && (
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeEmail(idx)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {emails.length < 10 && (
          <Button variant="ghost" size="sm" onClick={addEmail} className="text-muted-foreground">
            <Plus className="h-4 w-4 mr-1" /> Προσθήκη email
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Θα λάβουν πρόσκληση μέσω email για να ενταχθούν στην ομάδα σας.
      </p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
        </Button>
        <Button onClick={handleInvite} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {emails.some(e => e.trim()) ? 'Πρόσκληση & συνέχεια' : 'Συνέχεια'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Παράλειψη
        </Button>
      </div>
    </div>
  );
}
