import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Search,
  Mail,
  Phone,
  MapPin,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const { isAdmin, isManager } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Σφάλμα κατά τη φόρτωση πελατών');
    } finally {
      setLoading(false);
    }
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
      };

      if (editingClient) {
        const { data, error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
          .select()
          .single();

        if (error) throw error;

        setClients(prev => prev.map(c => c.id === editingClient.id ? data : c));
        toast.success('Ο πελάτης ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();

        if (error) throw error;

        setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Ο πελάτης δημιουργήθηκε!');
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
    });
    setDialogOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== clientId));
      toast.success('Ο πελάτης διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      notes: '',
    });
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManage = isAdmin || isManager;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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
            Διαχείριση πελατών και οργανισμών
          </p>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="shadow-soft">
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg">{editingClient ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης'}</DialogTitle>
                <DialogDescription className="text-sm">
                  {editingClient ? 'Ενημερώστε τα στοιχεία του πελάτη' : 'Προσθέστε έναν νέο πελάτη/οργανισμό'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Επωνυμία *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="π.χ. ABC Company"
                    className="bg-card border-border/50"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="info@example.com"
                      className="bg-card border-border/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Τηλέφωνο</Label>
                    <Input
                      id="phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="+30 210 1234567"
                      className="bg-card border-border/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Διεύθυνση</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Οδός, Αριθμός, Πόλη"
                    className="bg-card border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Σημειώσεις</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="bg-card border-border/50 resize-none"
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={saving} className="shadow-soft">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingClient ? 'Αποθήκευση' : 'Δημιουργία'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md animate-fade-in" style={{ animationDelay: '50ms' }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Αναζήτηση πελατών..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border/50 focus:border-primary/30"
        />
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground mt-3">Φόρτωση...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card py-16 animate-fade-in shadow-soft">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Δεν βρέθηκαν πελάτες</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              {searchQuery
                ? 'Δοκιμάστε διαφορετικό όρο αναζήτησης'
                : 'Προσθέστε τον πρώτο σας πελάτη'}
            </p>
            {canManage && !searchQuery && (
              <Button onClick={() => setDialogOpen(true)} className="shadow-soft">
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-soft animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 border-b border-border/30 hover:bg-secondary/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Επωνυμία</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Επικοινωνία</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Διεύθυνση</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Ημ/νία</TableHead>
                {canManage && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client, index) => (
                <TableRow 
                  key={client.id} 
                  className="transition-colors duration-150 hover:bg-secondary/40 border-b border-border/20 last:border-0"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-105">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        {client.notes && (
                          <p className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
                            {client.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      {client.contact_email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 opacity-50" />
                          {client.contact_email}
                        </div>
                      )}
                      {client.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 opacity-50" />
                          {client.contact_phone}
                        </div>
                      )}
                      {!client.contact_email && !client.contact_phone && (
                        <span className="text-muted-foreground/50 text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.address ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 opacity-50" />
                        <span className="truncate max-w-[200px]">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(client.created_at), 'd MMM yyyy', { locale: el })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <EditDeleteActions
                        onEdit={() => handleEdit(client)}
                        onDelete={() => handleDelete(client.id)}
                        itemName={`τον πελάτη "${client.name}"`}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
