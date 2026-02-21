import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogger } from '@/hooks/useActivityLogger';
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
  X
} from 'lucide-react';

import { useProjectCategories } from '@/hooks/useProjectCategories';

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
  const { isAdmin, isManager } = useAuth();
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const { data: categories = [] } = useProjectCategories();
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
  }, []);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

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
      const clientData = {
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

        setClients(prev => [...prev, { ...data, projectCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </span>
            Πελάτες
          </h1>
          <p className="text-muted-foreground mt-1 text-sm ml-[52px]">
            Διαχείριση πελατών και οργανισμών • {clients.length} συνολικά
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Αναζήτηση πελατών..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border/50"
            />
          </div>
          
          {canManage && (
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
          )}
        </div>
      </div>

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
    </div>
  );
}
