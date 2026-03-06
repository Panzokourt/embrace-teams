import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

const TIMEZONES = [
  { value: 'Europe/Athens', label: 'Ελλάδα (EET)' },
  { value: 'Europe/London', label: 'Λονδίνο (GMT)' },
  { value: 'Europe/Berlin', label: 'Βερολίνο (CET)' },
  { value: 'America/New_York', label: 'Νέα Υόρκη (EST)' },
];

const LANGUAGES = [
  { value: 'el', label: 'Ελληνικά' },
  { value: 'en', label: 'English' },
];

interface OrgGeneralTabProps {
  companyId: string;
  initialName: string;
  initialDomain: string;
  settings: Record<string, any>;
  isOwner: boolean;
}

export function OrgGeneralTab({ companyId, initialName, initialDomain, settings, isOwner }: OrgGeneralTabProps) {
  const { refreshUserData } = useAuth();
  const [name, setName] = useState(initialName);
  const [domain, setDomain] = useState(initialDomain);
  const [description, setDescription] = useState((settings?.description as string) || '');
  const [industry, setIndustry] = useState((settings?.industry as string) || '');
  const [timezone, setTimezone] = useState((settings?.timezone as string) || 'Europe/Athens');
  const [language, setLanguage] = useState((settings?.language as string) || 'el');
  const [saving, setSaving] = useState(false);
  const [domainError, setDomainError] = useState('');

  const validateDomain = (d: string): boolean => {
    if (!d.trim()) { setDomainError('Το domain δεν μπορεί να είναι κενό'); return false; }
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(d.trim())) { setDomainError('Μη έγκυρη μορφή domain (π.χ. example.com)'); return false; }
    setDomainError('');
    return true;
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedDomain = domain.trim().toLowerCase();

    if (!trimmedName) { toast.error('Το όνομα εταιρείας δεν μπορεί να είναι κενό'); return; }
    if (!validateDomain(trimmedDomain)) return;

    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({
        name: trimmedName,
        domain: trimmedDomain,
        settings: { ...settings, description, industry, timezone, language },
      } as any)
      .eq('id', companyId);

    setSaving(false);

    if (error) {
      if (error.code === '23505' || error.message?.includes('companies_domain_key')) {
        setDomainError('Αυτό το domain χρησιμοποιείται ήδη από άλλη εταιρεία');
        toast.error('Αυτό το domain χρησιμοποιείται ήδη από άλλη εταιρεία');
      } else {
        toast.error(`Σφάλμα αποθήκευσης: ${error.message}`);
      }
      return;
    }

    toast.success('Γενικές ρυθμίσεις αποθηκεύτηκαν');
    await refreshUserData();
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Γενικές ρυθμίσεις
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Όνομα εταιρείας</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} />
        </div>

        <div className="space-y-2">
          <Label>Domain</Label>
          <Input
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setDomainError(''); }}
            disabled={!isOwner}
            placeholder="example.com"
            className={domainError ? 'border-destructive focus:ring-destructive/25' : ''}
          />
          {domainError && <p className="text-sm text-destructive">{domainError}</p>}
        </div>

        <div className="space-y-2">
          <Label>Περιγραφή</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isOwner}
            placeholder="Σύντομη περιγραφή της εταιρείας..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Κλάδος / Industry</Label>
          <Input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={!isOwner}
            placeholder="π.χ. Marketing, Technology"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ζώνη ώρας</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={!isOwner}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Γλώσσα</Label>
            <Select value={language} onValueChange={setLanguage} disabled={!isOwner}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isOwner && (
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Αποθήκευση
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
