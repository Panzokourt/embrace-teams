import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ChevronLeft, ChevronRight, ArrowLeft, Link2, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DomainCompany {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Props {
  userId: string;
  isPersonalEmail: boolean;
  emailDomain: string;
  domainCompanies: DomainCompany[];
  suggestedCompanyName: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onPending: (companyName: string) => void;
  refreshUserData: () => Promise<void>;
}

const INDUSTRIES = [
  'Τεχνολογία', 'Marketing & Διαφήμιση', 'Χρηματοοικονομικά', 'Νομικά',
  'Εκπαίδευση', 'Υγεία', 'Κατασκευές', 'Λιανικό Εμπόριο', 'Τουρισμός',
  'Media & Ψυχαγωγία', 'Logistics', 'Συμβουλευτική', 'Άλλο',
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 άτομα' },
  { value: '11-50', label: '11-50 άτομα' },
  { value: '51-200', label: '51-200 άτομα' },
  { value: '200+', label: '200+ άτομα' },
];

export default function OnboardingCompany({
  userId, isPersonalEmail, emailDomain, domainCompanies,
  suggestedCompanyName, onNext, onBack, onSkip, onPending, refreshUserData,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [companyMode, setCompanyMode] = useState<'create' | 'join' | null>(null);
  const [companyName, setCompanyName] = useState(suggestedCompanyName);
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    try {
      const autoDomain = isPersonalEmail
        ? `${companyName.trim().toLowerCase().replace(/\s+/g, '-')}-${userId.slice(0, 8)}.personal`
        : emailDomain || 'default.com';

      const { data: companyId, error } = await supabase.rpc('create_company_with_owner', {
        _name: companyName.trim(),
        _domain: autoDomain,
      });
      if (error) {
        if (error.code === '23505') {
          toast.error('Υπάρχει ήδη εταιρεία με αυτό το domain.');
        } else throw error;
        return;
      }

      // Update industry & company_size
      if (industry || companySize) {
        await supabase.from('companies').update({
          ...(industry ? { industry } : {}),
          ...(companySize ? { company_size: companySize } : {}),
        } as any).eq('id', companyId);
      }

      // Upload logo
      if (logoFile && companyId) {
        const ext = logoFile.name.split('.').pop();
        const path = `logos/${companyId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(path, logoFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path);
          await supabase.from('companies').update({ logo_url: urlData.publicUrl }).eq('id', companyId);
        }
      }

      toast.success('Η εταιρεία δημιουργήθηκε!');
      await refreshUserData();
      onNext();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα δημιουργίας');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (company: DomainCompany) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('join_requests')
        .insert({ user_id: userId, company_id: company.id });
      if (error) {
        if (error.message?.includes('duplicate')) toast.error('Έχετε ήδη στείλει αίτημα');
        else throw error;
        return;
      }
      toast.success('Το αίτημα στάλθηκε!');
      onPending(company.name);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Building2 className="h-10 w-10 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-foreground">Ο χώρος εργασίας σας</h2>
        <p className="text-sm text-muted-foreground">
          {isPersonalEmail
            ? 'Δημιουργήστε μια νέα εταιρεία'
            : domainCompanies.length > 0
              ? `Βρέθηκαν εταιρείες με domain @${emailDomain}`
              : `Δημιουργήστε εταιρεία για @${emailDomain}`
          }
        </p>
      </div>

      {/* Domain companies — join options */}
      {!isPersonalEmail && domainCompanies.length > 0 && companyMode !== 'create' && (
        <div className="space-y-3">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Υπάρχουσες εταιρείες</Label>
          {domainCompanies.map((dc) => (
            <div key={dc.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40">
              <div className="flex items-center gap-3">
                {dc.logo_url ? (
                  <img src={dc.logo_url} alt={dc.name} className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="font-medium text-foreground">{dc.name}</span>
              </div>
              <Button size="sm" onClick={() => handleRequestJoin(dc)} disabled={loading}>
                <Link2 className="h-3.5 w-3.5 mr-1.5" />Αίτημα
              </Button>
            </div>
          ))}
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setCompanyMode('create')} className="text-muted-foreground">
              Ή δημιουργήστε νέα εταιρεία
            </Button>
          </div>
        </div>
      )}

      {/* Create company form */}
      {(isPersonalEmail || domainCompanies.length === 0 || companyMode === 'create') && (
        <div className="space-y-4">
          {companyMode === 'create' && domainCompanies.length > 0 && (
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setCompanyMode(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />Πίσω στις υπάρχουσες
            </Button>
          )}

          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <label className="cursor-pointer group">
              <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border/60 group-hover:border-primary/40 flex items-center justify-center overflow-hidden transition-colors">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
            </label>
            <div className="flex-1 space-y-2">
              <Label>Όνομα εταιρείας *</Label>
              <Input
                placeholder="Η εταιρεία μου"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label>Κλάδος</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε κλάδο" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company size */}
          <div className="space-y-2">
            <Label>Μέγεθος ομάδας</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMPANY_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setCompanySize(size.value)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                    companySize === size.value
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleCreateCompany}
            disabled={loading || !companyName.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Δημιουργία & συνέχεια
          </Button>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Παράλειψη
        </Button>
      </div>
    </div>
  );
}
