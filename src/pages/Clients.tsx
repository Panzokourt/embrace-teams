import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Search,
  Mail,
  Phone,
  MapPin,
  Loader2,
  FolderKanban
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
  projects_count?: number;
}

export default function ClientsPage() {
  const { isAdmin, isManager } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setDialogOpen(false);
      resetForm();
      toast.success('Ο πελάτης δημιουργήθηκε!');
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            Πελάτες
          </h1>
          <p className="text-muted-foreground mt-1">
            Διαχείριση πελατών και οργανισμών
          </p>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέος Πελάτης</DialogTitle>
                <DialogDescription>
                  Προσθέστε έναν νέο πελάτη/οργανισμό
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Επωνυμία *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="π.χ. ABC Company"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="info@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Τηλέφωνο</Label>
                    <Input
                      id="phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="+30 210 1234567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Διεύθυνση</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Οδός, Αριθμός, Πόλη"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Σημειώσεις</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Δημιουργία
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Αναζήτηση πελατών..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν βρέθηκαν πελάτες</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Δοκιμάστε διαφορετικό όρο αναζήτησης'
                : 'Προσθέστε τον πρώτο σας πελάτη'}
            </p>
            {canManage && !searchQuery && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Επωνυμία</TableHead>
                <TableHead>Επικοινωνία</TableHead>
                <TableHead>Διεύθυνση</TableHead>
                <TableHead>Ημ/νία</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map(client => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {client.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {client.contact_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {client.contact_email}
                        </div>
                      )}
                      {client.contact_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {client.contact_phone}
                        </div>
                      )}
                      {!client.contact_email && !client.contact_phone && (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.address ? (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(client.created_at), 'd MMM yyyy', { locale: el })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
