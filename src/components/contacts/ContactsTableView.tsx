import { useState, useMemo, useRef } from 'react';
import { StickyHorizontalScroll, type StickyHorizontalScrollHandle } from '@/components/shared/StickyHorizontalScroll';
import { HorizontalScrollButtons } from '@/components/shared/HorizontalScrollButtons';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Pencil, Trash2, Mail, Phone, Building2, User, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useColumnLayout, type ColumnDef } from '@/hooks/useColumnLayout';
import { SortableTableHead } from '@/components/shared/SortableTableHead';

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

type ColKey = 'name' | 'category' | 'tags' | 'email' | 'phone' | 'actions';

const COLUMNS: ColumnDef<ColKey>[] = [
  { key: 'name', label: 'Όνομα', width: 280, sortField: 'name' },
  { key: 'category', label: 'Κατηγορία', width: 200, sortField: 'category' },
  { key: 'tags', label: 'Tags', width: 200 },
  { key: 'email', label: 'Email', width: 220, sortField: 'email' },
  { key: 'phone', label: 'Τηλέφωνο', width: 160, sortField: 'phone' },
  { key: 'actions', label: 'Ενέργειες', width: 60, locked: true },
];

export function ContactsTableView({ contacts, loading, onEdit, onRefresh }: ContactsTableViewProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const layout = useColumnLayout<ColKey>({ storageKey: 'contacts-table', columns: COLUMNS });
  const scrollRef = useRef<StickyHorizontalScrollHandle>(null);

  const filtered = useMemo(() => contacts.filter(c => {
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      (c.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesEntity = entityFilter === 'all' || c.entity_type === entityFilter;
    return matchesSearch && matchesCategory && matchesEntity;
  }), [contacts, search, categoryFilter, entityFilter]);

  const sorted = useMemo(() => {
    if (!layout.sortField) return filtered;
    const f = layout.sortField;
    const dir = layout.sortDirection;
    return [...filtered].sort((a, b) => {
      const av = (a[f] ?? '').toString().toLowerCase();
      const bv = (b[f] ?? '').toString().toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, layout.sortField, layout.sortDirection]);

  const handleDelete = async (id: string) => {
    if (!confirm('Σίγουρα θέλετε να διαγράψετε αυτή την επαφή;')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Η επαφή διαγράφηκε'); onRefresh(); }
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const totalWidth = layout.visibleOrder.reduce((s, k) => s + layout.widths[k], 0);

  const renderCell = (key: ColKey, contact: any) => {
    switch (key) {
      case 'name': {
        const EntityIcon = entityIcons[contact.entity_type] || User;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={contact.avatar_url} />
              <AvatarFallback className="text-xs bg-muted text-foreground">{getInitials(contact.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium flex items-center gap-1.5 truncate">
                {contact.name}
                {contact.client_id && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Πελάτης</Badge>}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <EntityIcon className="h-3 w-3" />
                {contact.entity_type === 'person' ? 'Φυσικό Πρόσωπο' : contact.entity_type === 'company' ? 'Εταιρεία' : 'Οργανισμός'}
              </div>
            </div>
          </div>
        );
      }
      case 'category':
        return (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">{categoryLabels[contact.category] || contact.category}</Badge>
            {contact.sector && <Badge variant="outline" className="text-[10px]">{
              ({ public: 'Δημόσιος', private: 'Ιδιωτικός', non_profit: 'Μη Κερδ.', government: 'Κυβερν.', mixed: 'Μικτός' } as any)[contact.sector] || contact.sector
            }</Badge>}
          </div>
        );
      case 'tags':
        return (
          <div className="flex flex-wrap gap-1">
            {(contact.tags || []).slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
            ))}
            {(contact.tags || []).length > 3 && <Badge variant="outline" className="text-[10px]">+{contact.tags.length - 3}</Badge>}
          </div>
        );
      case 'email':
        return contact.email ? (
          <div className="flex items-center gap-1 text-sm min-w-0"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{contact.email}</span></div>
        ) : null;
      case 'phone':
        return contact.phone ? (
          <div className="flex items-center gap-1 text-sm min-w-0"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{contact.phone}</span></div>
        ) : null;
      case 'actions':
        return (
          <div onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(contact)}><Pencil className="mr-2 h-4 w-4" />Επεξεργασία</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(contact.id)}><Trash2 className="mr-2 h-4 w-4" />Διαγραφή</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
    }
  };

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
        <HorizontalScrollButtons containerRef={scrollRef} className="ml-auto" />
      </div>

      <StickyHorizontalScroll ref={scrollRef} className="rounded-xl border border-border/60">
        <layout.DndContext
          sensors={layout.sensors}
          collisionDetection={layout.closestCenter}
          onDragEnd={layout.handleDragEnd}
        >
          <Table unstyledWrapper style={{ width: totalWidth, tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <layout.SortableContext
                  items={layout.visibleOrder}
                  strategy={layout.horizontalListSortingStrategy}
                >
                  {layout.visibleOrder.map(key => (
                    <SortableTableHead
                      key={key}
                      colKey={key}
                      layout={layout}
                      align={key === 'actions' ? 'right' : 'left'}
                    >
                      {COLUMNS.find(c => c.key === key)?.label}
                    </SortableTableHead>
                  ))}
                </layout.SortableContext>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={layout.visibleOrder.length} className="text-center py-8 text-muted-foreground">Φόρτωση...</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={layout.visibleOrder.length} className="text-center py-8 text-muted-foreground">Δεν βρέθηκαν επαφές</TableCell></TableRow>
              ) : sorted.map(contact => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  {layout.visibleOrder.map(key => (
                    <TableCell key={key} style={{ width: layout.widths[key] }} className="overflow-hidden">
                      {renderCell(key, contact)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </layout.DndContext>
      </StickyHorizontalScroll>
    </div>
  );
}
