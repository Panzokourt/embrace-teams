import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Pencil, Trash2, Mail, Phone, Building2, User, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const categoryLabels: Record<string, string> = {
  client: 'Πελάτης', supplier: 'Προμηθευτής', partner: 'Συνεργάτης',
  media: 'Μέσα', government: 'Φορέας', freelancer: 'Freelancer', other: 'Άλλο',
};

const entityIcons: Record<string, any> = {
  person: User, company: Building2, organization: Landmark,
};

interface ContactsTableViewProps {
  contacts: any[];
  loading: boolean;
  onEdit: (contact: any) => void;
  onRefresh: () => void;
}

export function ContactsTableView({ contacts, loading, onEdit, onRefresh }: ContactsTableViewProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const filtered = contacts.filter(c => {
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      (c.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesEntity = entityFilter === 'all' || c.entity_type === entityFilter;
    return matchesSearch && matchesCategory && matchesEntity;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Σίγουρα θέλετε να διαγράψετε αυτή την επαφή;')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Η επαφή διαγράφηκε'); onRefresh(); }
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Κατηγορία" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες</SelectItem>
            {Object.entries(categoryLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Τύπος" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλοι</SelectItem>
            <SelectItem value="person">Φυσικό Πρόσωπο</SelectItem>
            <SelectItem value="company">Εταιρεία</SelectItem>
            <SelectItem value="organization">Οργανισμός</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Όνομα</TableHead>
              <TableHead>Κατηγορία</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Τηλέφωνο</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Φόρτωση...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Δεν βρέθηκαν επαφές</TableCell></TableRow>
            ) : filtered.map(contact => {
              const EntityIcon = entityIcons[contact.entity_type] || User;
              return (
                <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/contacts/${contact.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(contact.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium flex items-center gap-1.5">
                          {contact.name}
                          {contact.client_id && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Πελάτης</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <EntityIcon className="h-3 w-3" />
                          {contact.entity_type === 'person' ? 'Φυσικό Πρόσωπο' : contact.entity_type === 'company' ? 'Εταιρεία' : 'Οργανισμός'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{categoryLabels[contact.category] || contact.category}</Badge>
                      {contact.sector && <Badge variant="outline" className="text-[10px]">{
                        { public: 'Δημόσιος', private: 'Ιδιωτικός', non_profit: 'Μη Κερδ.', government: 'Κυβερν.', mixed: 'Μικτός' }[contact.sector as string] || contact.sector
                      }</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(contact.tags || []).slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                      {(contact.tags || []).length > 3 && <Badge variant="outline" className="text-[10px]">+{contact.tags.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.email && <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" />{contact.email}</div>}
                  </TableCell>
                  <TableCell>
                    {contact.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{contact.phone}</div>}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(contact)}><Pencil className="mr-2 h-4 w-4" />Επεξεργασία</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(contact.id)}><Trash2 className="mr-2 h-4 w-4" />Διαγραφή</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
