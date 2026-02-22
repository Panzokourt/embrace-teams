import { useState, useEffect, useCallback } from 'react';
import { Plus, Download, BookUser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactsTableView } from '@/components/contacts/ContactsTableView';
import { ContactForm } from '@/components/contacts/ContactForm';
import { supabase } from '@/integrations/supabase/client';

export default function Contacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').eq('is_active', true).order('name');
    setContacts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleEdit = (contact: any) => { setEditContact(contact); setFormOpen(true); };
  const handleNew = () => { setEditContact(null); setFormOpen(true); };

  const exportCSV = () => {
    const headers = ['Όνομα', 'Τύπος', 'Κατηγορία', 'Email', 'Τηλέφωνο', 'Tags'];
    const rows = contacts.map(c => [c.name, c.entity_type, c.category, c.email || '', c.phone || '', (c.tags || []).join('; ')]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-muted"><BookUser className="h-6 w-6 text-foreground" /></div>
          <div>
            <h1 className="text-2xl font-bold">Ευρετήριο Επαφών</h1>
            <p className="text-sm text-muted-foreground">{contacts.length} επαφές</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" onClick={handleNew}><Plus className="h-4 w-4 mr-1" />Νέα Επαφή</Button>
        </div>
      </div>

      <ContactsTableView contacts={contacts} loading={loading} onEdit={handleEdit} onRefresh={fetchContacts} />

      <ContactForm open={formOpen} onOpenChange={setFormOpen} contact={editContact} onSaved={fetchContacts} />
    </div>
  );
}
