import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  companyId: string | undefined;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const SECTORS = [
  'Τεχνολογία', 'Λιανικό Εμπόριο', 'Υγεία', 'Εκπαίδευση', 'Χρηματοοικονομικά',
  'Τουρισμός', 'Τρόφιμα & Ποτά', 'Μόδα', 'Αυτοκίνητο', 'Real Estate', 'Άλλο',
];

export default function OnboardingFirstClient({ companyId, onNext, onBack, onSkip }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !companyId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('clients').insert({
        name: name.trim(),
        contact_email: email.trim() || null,
        sector: sector || null,
        company_id: companyId,
      });
      if (error) throw error;
      toast.success(`Ο πελάτης "${name.trim()}" δημιουργήθηκε!`);
      onNext();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Briefcase className="h-10 w-10 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-foreground">Πρώτος πελάτης</h2>
        <p className="text-sm text-muted-foreground">Προσθέστε τον πρώτο πελάτη σας (προαιρετικό)</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Όνομα πελάτη *</Label>
          <Input placeholder="π.χ. Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email επικοινωνίας</Label>
          <Input placeholder="info@client.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Κλάδος</Label>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε κλάδο" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Μπορείτε να προσθέσετε περισσότερους πελάτες αργότερα.
      </p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
        </Button>
        <Button onClick={name.trim() ? handleCreate : onNext} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {name.trim() ? 'Δημιουργία & συνέχεια' : 'Συνέχεια'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Παράλειψη
        </Button>
      </div>
    </div>
  );
}
