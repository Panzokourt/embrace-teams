import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, Building2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

interface ClientSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  clients: Client[];
  onClientCreated?: (client: Client) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
}

export function ClientSelector({
  value,
  onValueChange,
  clients,
  onClientCreated,
  placeholder = 'Επιλέξτε πελάτη/φορέα',
  disabled = false,
  allowCreate = true,
}: ClientSelectorProps) {
  const { company, isAdmin, isManager } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    notes: '',
  });

  const canCreate = allowCreate && (isAdmin || isManager);

  const resetForm = () => {
    setFormData({
      name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      notes: '',
    });
  };

  const handleCreateClient = async () => {
    if (!formData.name.trim()) {
      toast.error('Το όνομα είναι υποχρεωτικό');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: formData.name.trim(),
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
          company_id: company?.id || null,
        })
        .select('id, name')
        .single();

      if (error) throw error;

      toast.success('Ο πελάτης δημιουργήθηκε!');
      
      // Call callback to update parent's client list
      if (onClientCreated && data) {
        onClientCreated(data);
      }
      
      // Select the newly created client
      if (data) {
        onValueChange(data.id);
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg z-50 max-h-60 overflow-y-auto">
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
            {clients.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Δεν υπάρχουν πελάτες
              </div>
            )}
          </SelectContent>
        </Select>
        {canCreate && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setDialogOpen(true)}
            disabled={disabled}
            title="Δημιουργία νέου πελάτη"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Νέος Πελάτης/Φορέας
            </DialogTitle>
            <DialogDescription>
              Δημιουργήστε νέο πελάτη ή φορέα για τα έργα σας
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Όνομα *</Label>
              <Input
                id="client-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Όνομα πελάτη ή φορέα"
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Τηλέφωνο</Label>
                <Input
                  id="client-phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="+30 210 1234567"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client-address">Διεύθυνση</Label>
              <Input
                id="client-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Διεύθυνση πελάτη"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client-notes">Σημειώσεις</Label>
              <Textarea
                id="client-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Πρόσθετες πληροφορίες..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Ακύρωση
            </Button>
            <Button 
              onClick={handleCreateClient} 
              disabled={saving || !formData.name.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Δημιουργία
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
