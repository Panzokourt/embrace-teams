import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ClientsTableView } from '@/components/clients/ClientsTableView';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Search,
  Loader2,
  X,
  Sparkles,
  Upload
} from 'lucide-react';

import { useProjectCategories } from '@/hooks/useProjectCategories';
import { ImportWizard } from '@/components/import/ImportWizard';

const defaultSectorOptions = [
  { value: 'public', label: 'Δημόσιος Τομέας' },
  { value: 'private', label: 'Ιδιωτικός Τομέας' },
  { value: 'non_profit', label: 'Μη Κερδοσκοπικός' },
  { value: 'government', label: 'Κυβερνητικός' },
  { value: 'mixed', label: 'Μικτός' },
];

interface Client {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  sector: string | null;
  website: string | null;
  tax_id: string | null;
  secondary_phone: string | null;
  tags: string[] | null;
  logo_url: string | null;
  projectCount?: number;
}

export default function ClientsPage() {
  const { isAdmin, isManager, company } = useAuth();
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const { data: categories = [] } = useProjectCategories();
  const pagination = usePagination(50);
  const [clients, setClients] = useState<Client[]>([]);

  // Build sector options dynamically
  const sectorOptions = categories.length > 0
    ? categories.map(c => ({ value: c.name, label: c.name }))
    : defaultSectorOptions;
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    notes: '',
    sector: '',
    website: '',
    tax_id: '',
    secondary_phone: '',
    tags: [] as string[],
  });

  useEffect(() => {
    fetchClients();
  }, [pagination.page]);

  const fetchClients = async () => {
    try {
      // Get total count first
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      pagination.setTotalCount(count || 0);

      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')
        .range(pagination.from, pagination.to);

      if (error) throw error;

      const { data: projectCounts } = await supabase
        .from('projects')
        .select('client_id');

      const countMap = new Map<string, number>();
      projectCounts?.forEach(p => {
        if (p.client_id) {
          countMap.set(p.client_id, (countMap.get(p.client_id) || 0) + 1);
        }
      });

      const clientsWithCounts = (clientsData || []).map(c => ({
        ...c,
        projectCount: countMap.get(c.id) || 0
      }));

      setClients(clientsWithCounts);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Σφάλμα κατά τη φόρτωση πελατών');
    } finally {
      setLoading(false);
    }
  };

  const mergeTags = (current: string[], incoming: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    [...(current || []), ...(incoming || [])].forEach(t => {
      const k = String(t).trim().toLowerCase();
      if (k && !seen.has(k)) { seen.add(k); out.push(String(t).trim()); }
    });
    return out;
  };

  const handleEnrich = async () => {
    const site = formData.website.trim();
    const tax = formData.tax_id.trim();
    const name = formData.name.trim();
    if (!site && !tax && !name) {
      toast.error('Συμπλήρωσε website, ΑΦΜ ή επωνυμία πρώτα.');
      return;
    }
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-client', {
        body: { draft: true, website: site || undefined, taxId: tax || undefined, clientName: name || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const suggestions: any[] = data?.suggestions || [];
      const logoUrl: string | undefined = data?.logoUrl;

      let appliedCount = 0;
      setFormData(prev => {
        const next = { ...prev };
        for (const s of suggestions) {
          const v = s.value;
          if (v === null || v === undefined || v === '') continue;
          switch (s.field) {
            case 'name':
              if (!next.name) { next.name = String(v); appliedCount++; } break;
            case 'tax_id':
              if (!next.tax_id) { next.tax_id = String(v); appliedCount++; } break;
            case 'contact_email':
              if (!next.contact_email) { next.contact_email = String(v); appliedCount++; } break;
            case 'contact_phone':
              if (!next.contact_phone) { next.contact_phone = String(v); appliedCount++; } break;
            case 'secondary_phone':
              if (!next.secondary_phone) { next.secondary_phone = String(v); appliedCount++; } break;
            case 'address':
              if (!next.address) { next.address = String(v); appliedCount++; } break;
            case 'website':
              if (!next.website) { next.website = String(v); appliedCount++; } break;
            case 'sector':
              if (!next.sector) { next.sector = String(v); appliedCount++; } break;
            case 'notes':
              if (!next.notes) { next.notes = String(v); appliedCount++; } break;
            case 'tags':
              if (Array.isArray(v)) {
                const merged = mergeTags(next.tags, v);
                if (merged.length !== next.tags.length) { next.tags = merged; appliedCount++; }
              }
              break;
          }
        }
        return next;
      });

      if (logoUrl) {
        setPendingLogoUrl(logoUrl);
        appliedCount++;
      }

      if (appliedCount > 0) toast.success(`Εφαρμόστηκαν ${appliedCount} προτάσεις από AI`);
      else toast.info('Δεν βρέθηκαν νέες προτάσεις.');
    } catch (e: any) {
      toast.error(e?.message || 'AI enrichment απέτυχε');
    } finally {
      setEnriching(false);
    }
  };

  const uploadPendingLogo = async (clientId: string): Promise<string | null> => {
    if (!pendingLogoUrl) return null;
    try {
      const { data: userData, error: uErr } = await supabase.auth.getUser();
      if (uErr || !userData?.user) return null;
      const userId = userData.user.id;
      const r = await fetch(pendingLogoUrl);
      if (!r.ok) return null;
      const ct = (r.headers.get('content-type') || 'image/png').toLowerCase();
      if (!ct.startsWith('image/') && !ct.includes('svg')) return null;
      const blob = await r.blob();
      const ext = ct.includes('svg') ? 'svg'
                : ct.includes('jpeg') || ct.includes('jpg') ? 'jpg'
                : ct.includes('webp') ? 'webp'
                : ct.includes('gif') ? 'gif'
                : 'png';
      const path = `${userId}/client-logos/${clientId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, blob, { contentType: ct, upsert: true });
      if (upErr) { console.error('Logo upload', upErr); return null; }
      const { data: signed } = await supabase.storage
        .from('project-files')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      return signed?.signedUrl || null;
    } catch (e) {
      console.error('uploadPendingLogo', e);
      return null;
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !formData.tags.includes(t)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const clientData: any = {
        name: formData.name,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        address: formData.address || null,
        notes: formData.notes || null,
        sector: formData.sector || null,
        website: formData.website || null,
        tax_id: formData.tax_id || null,
        secondary_phone: formData.secondary_phone || null,
        tags: formData.tags,
      };
      if (!editingClient && company) {
        clientData.company_id = company.id;
      }

      if (editingClient) {
        const { data, error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
          .select()
          .single();

        if (error) throw error;

        setClients(prev => prev.map(c => c.id === editingClient.id ? { ...data, projectCount: c.projectCount } : c));
        toast.success('Ο πελάτης ενημερώθηκε!');
        logUpdate('client', editingClient.id, formData.name);
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();

        if (error) throw error;

        let finalLogoUrl: string | null = null;
        if (data?.id && pendingLogoUrl) {
          finalLogoUrl = await uploadPendingLogo(data.id);
          if (finalLogoUrl) {
            await supabase.from('clients').update({ logo_url: finalLogoUrl }).eq('id', data.id);
          }
        }

        const newRow = { ...data, logo_url: finalLogoUrl ?? data.logo_url, projectCount: 0 };
        setClients(prev => [...prev, newRow].sort((a, b) => a.name.localeCompare(b.name, 'el', { numeric: true, sensitivity: 'base' })));
        toast.success('Ο πελάτης δημιουργήθηκε!');
        logCreate('client', data.id, formData.name);
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      address: client.address || '',
      notes: client.notes || '',
      sector: client.sector || '',
      website: client.website || '',
      tax_id: client.tax_id || '',
      secondary_phone: client.secondary_phone || '',
      tags: client.tags || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη;')) return;
    
    try {
      const deletedClient = clients.find(c => c.id === clientId);
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== clientId));
      toast.success('Ο πελάτης διαγράφηκε!');
      logDelete('client', clientId, deletedClient?.name);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setTagInput('');
    setPendingLogoUrl(null);
    setEnriching(false);
    setFormData({
      name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      notes: '',
      sector: '',
      website: '',
      tax_id: '',
      secondary_phone: '',
      tags: [],
    });
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.tax_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManage = isAdmin || isManager;

  return (
    <div className="page-shell">
      <PageHeader
        icon={Building2}
        title="Πελάτες"
        subtitle={`Διαχείριση πελατών και οργανισμών • ${clients.length} συνολικά`}
        breadcrumbs={[{ label: 'Πελάτες' }]}
        toolbar={
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Αναζήτηση πελατών..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border/50"
            />
          </div>
        }
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="shadow-soft" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Μαζική Εισαγωγή
              </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="shadow-soft">
                  <Plus className="h-4 w-4 mr-2" />
                  Νέος Πελάτης
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg">{editingClient ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης'}</DialogTitle>
                  <DialogDescription className="text-sm">
                    {editingClient ? 'Ενημερώστε τα στοιχεία του πελάτη' : 'Προσθέστε έναν νέο πελάτη/οργανισμό'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!editingClient && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            AI Συμπλήρωση
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Συμπλήρωσε το website / επωνυμία / ΑΦΜ και άσε το AI να βρει τα υπόλοιπα.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleEnrich}
                          disabled={enriching}
                          className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shrink-0"
                        >
                          {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          AI Enrich
                        </Button>
                      </div>
                      {pendingLogoUrl && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border">
                          <img
                            src={pendingLogoUrl}
                            alt="logo preview"
                            className="h-12 w-12 object-contain rounded-md bg-secondary shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">Λογότυπο εντοπίστηκε</p>
                            <p className="text-xs text-muted-foreground truncate">{pendingLogoUrl}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setPendingLogoUrl(null)}
                            title="Αφαίρεση"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="name" className="text-sm font-medium">Επωνυμία *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="π.χ. ABC Company"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Τομέας</Label>
                      <Select value={formData.sector} onValueChange={v => setFormData(prev => ({ ...prev, sector: v }))}>
                        <SelectTrigger><SelectValue placeholder="Επιλέξτε τομέα" /></SelectTrigger>
                        <SelectContent>
                          {sectorOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax_id" className="text-sm font-medium">ΑΦΜ</Label>
                      <Input
                        id="tax_id"
                        value={formData.tax_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                        placeholder="123456789"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="info@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Τηλέφωνο</Label>
                      <Input
                        id="phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                        placeholder="+30 210 1234567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary_phone" className="text-sm font-medium">Δεύτερο Τηλέφωνο</Label>
                      <Input
                        id="secondary_phone"
                        value={formData.secondary_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondary_phone: e.target.value }))}
                        placeholder="+30 210 7654321"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm font-medium">Ιστοσελίδα</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address" className="text-sm font-medium">Διεύθυνση</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Οδός, Αριθμός, Πόλη"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-medium">Tags</Label>
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {formData.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          placeholder="Προσθήκη tag..."
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="notes" className="text-sm font-medium">Σημειώσεις</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                      Ακύρωση
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingClient ? 'Αποθήκευση' : 'Δημιουργία'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          ) : undefined
        }
      />

      {/* Clients Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground mt-3">Φόρτωση...</p>
        </div>
      ) : filteredClients.length === 0 && !searchQuery ? (
        <div className="rounded-2xl border border-border/50 bg-card py-16 animate-fade-in shadow-soft">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Δεν υπάρχουν πελάτες</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Προσθέστε τον πρώτο σας πελάτη
            </p>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)} className="shadow-soft">
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            )}
          </div>
        </div>
      ) : (
        <ClientsTableView
          clients={filteredClients}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canManage={canManage}
        />
      )}
      <PaginationControls pagination={pagination} />
      <ImportWizard open={importOpen} onOpenChange={setImportOpen} entity="clients" onComplete={fetchClients} />
    </div>
  );
}
