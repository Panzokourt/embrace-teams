import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Loader2, Building2, ChevronDown, Scale, Phone, MapPin,
  Share2, Settings2, Upload, X,
} from 'lucide-react';

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

const LEGAL_FORMS = [
  { value: 'ae', label: 'Α.Ε. (Ανώνυμη Εταιρεία)' },
  { value: 'epe', label: 'Ε.Π.Ε. (Εταιρεία Περιορισμένης Ευθύνης)' },
  { value: 'ike', label: 'Ι.Κ.Ε. (Ιδιωτική Κεφαλαιουχική Εταιρεία)' },
  { value: 'oe', label: 'Ο.Ε. (Ομόρρυθμη Εταιρεία)' },
  { value: 'ee', label: 'Ε.Ε. (Ετερόρρυθμη Εταιρεία)' },
  { value: 'atomiki', label: 'Ατομική Επιχείρηση' },
  { value: 'nonprofit', label: 'Μη Κερδοσκοπική' },
  { value: 'other', label: 'Άλλο' },
];

const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 άτομα' },
  { value: '11-50', label: '11-50 άτομα' },
  { value: '51-200', label: '51-200 άτομα' },
  { value: '201-500', label: '201-500 άτομα' },
  { value: '500+', label: '500+ άτομα' },
];

interface OrgGeneralTabProps {
  companyId: string;
  initialName: string;
  initialDomain: string;
  settings: Record<string, any>;
  isOwner: boolean;
}

// Helper to safely read nested settings
function s(settings: Record<string, any>, path: string): string {
  const parts = path.split('.');
  let val: any = settings;
  for (const p of parts) {
    val = val?.[p];
  }
  return (val as string) || '';
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <CollapsibleTrigger className="flex w-full items-center justify-between py-1 group">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </span>
      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}

export function OrgGeneralTab({ companyId, initialName, initialDomain, settings, isOwner }: OrgGeneralTabProps) {
  const { refreshUserData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Basic
  const [name, setName] = useState(initialName);
  const [domain, setDomain] = useState(initialDomain);
  const [description, setDescription] = useState(s(settings, 'description'));
  const [logoUrl, setLogoUrl] = useState(s(settings, 'logo_url'));
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Legal
  const [legalForm, setLegalForm] = useState(s(settings, 'legal.form'));
  const [vat, setVat] = useState(s(settings, 'legal.vat'));
  const [taxOffice, setTaxOffice] = useState(s(settings, 'legal.tax_office'));
  const [gemi, setGemi] = useState(s(settings, 'legal.gemi'));
  const [currency, setCurrency] = useState(s(settings, 'legal.currency') || 'EUR');

  // Contact
  const [phone, setPhone] = useState(s(settings, 'contact.phone'));
  const [fax, setFax] = useState(s(settings, 'contact.fax'));
  const [companyEmail, setCompanyEmail] = useState(s(settings, 'contact.email'));
  const [website, setWebsite] = useState(s(settings, 'contact.website'));

  // Address
  const [street, setStreet] = useState(s(settings, 'address.street'));
  const [city, setCity] = useState(s(settings, 'address.city'));
  const [zip, setZip] = useState(s(settings, 'address.zip'));
  const [country, setCountry] = useState(s(settings, 'address.country') || 'Ελλάδα');

  // Social
  const [linkedin, setLinkedin] = useState(s(settings, 'social.linkedin'));
  const [facebook, setFacebook] = useState(s(settings, 'social.facebook'));
  const [instagram, setInstagram] = useState(s(settings, 'social.instagram'));
  const [xTwitter, setXTwitter] = useState(s(settings, 'social.x'));

  // Operations
  const [industry, setIndustry] = useState((settings?.industry as string) || '');
  const [companySize, setCompanySize] = useState((settings?.company_size as string) || '');
  const [foundedYear, setFoundedYear] = useState(s(settings, 'founded_year'));
  const [timezone, setTimezone] = useState(s(settings, 'timezone') || 'Europe/Athens');
  const [language, setLanguage] = useState(s(settings, 'language') || 'el');

  const [saving, setSaving] = useState(false);
  const [domainError, setDomainError] = useState('');

  const validateDomain = (d: string): boolean => {
    if (!d.trim()) { setDomainError('Το domain δεν μπορεί να είναι κενό'); return false; }
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(d.trim())) { setDomainError('Μη έγκυρη μορφή domain (π.χ. example.com)'); return false; }
    setDomainError('');
    return true;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Επιτρέπονται μόνο εικόνες'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Μέγιστο μέγεθος 2MB'); return; }

    setUploadingLogo(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `logos/${companyId}.${ext}`;
    const { error: upErr } = await supabase.storage.from('project-files').upload(path, file, { upsert: true });
    if (upErr) { toast.error('Σφάλμα ανεβάσματος λογοτύπου'); setUploadingLogo(false); return; }
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedDomain = domain.trim().toLowerCase();

    if (!trimmedName) { toast.error('Το όνομα εταιρείας δεν μπορεί να είναι κενό'); return; }
    if (!validateDomain(trimmedDomain)) return;
    if (vat && !/^\d{9}$/.test(vat.trim())) { toast.error('Το ΑΦΜ πρέπει να έχει 9 ψηφία'); return; }
    if (zip && !/^\d{5}$/.test(zip.trim())) { toast.error('Ο Τ.Κ. πρέπει να έχει 5 ψηφία'); return; }
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())) {
      toast.error('Μη έγκυρη μορφή email'); return;
    }

    setSaving(true);

    const newSettings = {
      ...settings,
      description,
      logo_url: logoUrl,
      industry,
      timezone,
      language,
      founded_year: foundedYear,
      legal: {
        form: legalForm,
        vat: vat.trim(),
        tax_office: taxOffice.trim(),
        gemi: gemi.trim(),
        currency,
      },
      contact: {
        phone: phone.trim(),
        fax: fax.trim(),
        email: companyEmail.trim(),
        website: website.trim(),
      },
      address: {
        street: street.trim(),
        city: city.trim(),
        zip: zip.trim(),
        country: country.trim(),
      },
      social: {
        linkedin: linkedin.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        x: xTwitter.trim(),
      },
    };

    const { error } = await supabase
      .from('companies')
      .update({
        name: trimmedName,
        domain: trimmedDomain,
        settings: newSettings,
        industry: industry.trim() || null,
        company_size: companySize || null,
        logo_url: logoUrl || null,
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

    toast.success('Ρυθμίσεις αποθηκεύτηκαν');
    await refreshUserData();
  };

  const disabled = !isOwner;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Section 1: Basic */}
      <Card className="border-border/40">
        <Collapsible defaultOpen>
          <CardHeader className="pb-2">
            <SectionHeader icon={Building2} title="Βασικά στοιχεία" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Λογότυπο</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative">
                      <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-border/40" />
                      {isOwner && (
                        <button onClick={() => setLogoUrl('')} className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-xl border border-dashed border-border/60 flex items-center justify-center bg-muted/30">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {isOwner && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
                        {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                        Ανέβασμα
                      </Button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Όνομα εταιρείας</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} disabled={disabled} />
                </div>
                <div className="space-y-1.5">
                  <Label>Domain</Label>
                  <Input
                    value={domain}
                    onChange={e => { setDomain(e.target.value); setDomainError(''); }}
                    disabled={disabled}
                    placeholder="example.com"
                    className={domainError ? 'border-destructive focus:ring-destructive/25' : ''}
                  />
                  {domainError && <p className="text-xs text-destructive">{domainError}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Περιγραφή</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} disabled={disabled} placeholder="Σύντομη περιγραφή..." rows={2} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 2: Legal & Tax */}
      <Card className="border-border/40">
        <Collapsible defaultOpen>
          <CardHeader className="pb-2">
            <SectionHeader icon={Scale} title="Νομικά & Φορολογικά" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Μορφή εταιρείας</Label>
                  <Select value={legalForm} onValueChange={setLegalForm} disabled={disabled}>
                    <SelectTrigger><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>ΑΦΜ</Label>
                  <Input value={vat} onChange={e => setVat(e.target.value)} disabled={disabled} placeholder="123456789" maxLength={9} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>ΔΟΥ</Label>
                  <Input value={taxOffice} onChange={e => setTaxOffice(e.target.value)} disabled={disabled} placeholder="π.χ. Α' Αθηνών" />
                </div>
                <div className="space-y-1.5">
                  <Label>Αρ. ΓΕΜΗ</Label>
                  <Input value={gemi} onChange={e => setGemi(e.target.value)} disabled={disabled} />
                </div>
              </div>
              <div className="space-y-1.5 max-w-[200px]">
                <Label>Νόμισμα</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={disabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 3: Contact */}
      <Card className="border-border/40">
        <Collapsible defaultOpen>
          <CardHeader className="pb-2">
            <SectionHeader icon={Phone} title="Στοιχεία Επικοινωνίας" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Τηλέφωνο</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} disabled={disabled} placeholder="+30 210 1234567" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fax</Label>
                  <Input value={fax} onChange={e => setFax(e.target.value)} disabled={disabled} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Email εταιρείας</Label>
                  <Input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} disabled={disabled} placeholder="info@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} disabled={disabled} placeholder="https://example.com" />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 4: Address */}
      <Card className="border-border/40">
        <Collapsible defaultOpen>
          <CardHeader className="pb-2">
            <SectionHeader icon={MapPin} title="Διεύθυνση" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-1.5">
                <Label>Οδός & αριθμός</Label>
                <Input value={street} onChange={e => setStreet(e.target.value)} disabled={disabled} placeholder="π.χ. Σταδίου 10" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Πόλη</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} disabled={disabled} placeholder="Αθήνα" />
                </div>
                <div className="space-y-1.5">
                  <Label>Τ.Κ.</Label>
                  <Input value={zip} onChange={e => setZip(e.target.value)} disabled={disabled} placeholder="10564" maxLength={5} />
                </div>
                <div className="space-y-1.5">
                  <Label>Χώρα</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} disabled={disabled} />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 5: Social */}
      <Card className="border-border/40">
        <Collapsible>
          <CardHeader className="pb-2">
            <SectionHeader icon={Share2} title="Social Media" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>LinkedIn</Label>
                  <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} disabled={disabled} placeholder="https://linkedin.com/company/..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Facebook</Label>
                  <Input value={facebook} onChange={e => setFacebook(e.target.value)} disabled={disabled} placeholder="https://facebook.com/..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Instagram</Label>
                  <Input value={instagram} onChange={e => setInstagram(e.target.value)} disabled={disabled} placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label>X (Twitter)</Label>
                  <Input value={xTwitter} onChange={e => setXTwitter(e.target.value)} disabled={disabled} placeholder="https://x.com/..." />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 6: Operations */}
      <Card className="border-border/40">
        <Collapsible defaultOpen>
          <CardHeader className="pb-2">
            <SectionHeader icon={Settings2} title="Επιχειρησιακά" />
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Κλάδος / Industry</Label>
                  <Input value={industry} onChange={e => setIndustry(e.target.value)} disabled={disabled} placeholder="π.χ. Marketing, Technology" />
                </div>
                <div className="space-y-1.5">
                  <Label>Μέγεθος εταιρείας</Label>
                  <Select value={companySize} onValueChange={setCompanySize} disabled={disabled}>
                    <SelectTrigger><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map(sz => <SelectItem key={sz.value} value={sz.value}>{sz.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Έτος ίδρυσης</Label>
                  <Input value={foundedYear} onChange={e => setFoundedYear(e.target.value)} disabled={disabled} placeholder="π.χ. 2020" maxLength={4} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ζώνη ώρας</Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={disabled}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Γλώσσα</Label>
                  <Select value={language} onValueChange={setLanguage} disabled={disabled}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Save button */}
      {isOwner && (
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Αποθήκευση
          </Button>
        </div>
      )}
    </div>
  );
}
