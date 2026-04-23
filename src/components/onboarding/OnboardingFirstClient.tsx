import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, ChevronLeft, ChevronRight, Loader2, Sparkles, Globe } from 'lucide-react';
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
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const handleAIFill = async () => {
    if (!name.trim() && !website.trim()) {
      toast.info('Συμπλήρωσε όνομα ή website για AI auto-fill');
      return;
    }
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-client', {
        body: {
          mode: 'preview',
          input: { name: name.trim() || undefined, website: website.trim() || undefined },
        },
      });
      if (error) throw error;
      const suggestions = data?.suggestions ?? [];
      let applied = 0;
      for (const s of suggestions) {
        if (s.field === 'contact_email' && s.value && !email) { setEmail(String(s.value)); applied++; }
        if (s.field === 'sector' && s.value && !sector) { setSector(String(s.value)); applied++; }
        if (s.field === 'website' && s.value && !website) { setWebsite(String(s.value)); applied++; }
        if (s.field === 'name' && s.value && !name) { setName(String(s.value)); applied++; }
      }
      if (applied > 0) toast.success(`Συμπληρώθηκαν ${applied} πεδία από AI`);
      else toast.info('Δεν βρέθηκαν επιπλέον στοιχεία.');
    } catch (e: any) {
      toast.error(e.message || 'AI auto-fill απέτυχε');
    } finally {
      setEnriching(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !companyId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('clients').insert({
        name: name.trim(),
        contact_email: email.trim() || null,
        website: website.trim() || null,
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
          <div className="flex items-center justify-between">
            <Label>Website</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAIFill}
              disabled={enriching}
              className="h-7 px-2 text-xs gap-1.5"
            >
              {enriching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
              AI auto-fill
            </Button>
          </div>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="https://acme.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="pl-9"
            />
          </div>
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
        Πάτα ✨ AI auto-fill για να βρει αυτόματα website, email, κλάδο από το όνομα.
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
