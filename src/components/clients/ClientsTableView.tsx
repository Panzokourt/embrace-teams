import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, Pencil, Trash2, Building2, Mail, Phone, 
  MapPin, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';

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

const sectorLabels: Record<string, string> = {
  public: 'Δημόσιος',
  private: 'Ιδιωτικός',
  non_profit: 'Μη Κερδοσκ.',
  government: 'Κυβερνητικός',
  mixed: 'Μικτός',
};

interface ClientsTableViewProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  canManage: boolean;
}

type SortField = 'name' | 'contact_email' | 'created_at' | 'projectCount';

export function ClientsTableView({
  clients,
  onEdit,
  onDelete,
  canManage
}: ClientsTableViewProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedClients = useMemo(() => {
    let sorted = [...clients];
    if (sortField) {
      sorted.sort((a, b) => {
        let valA: any, valB: any;
        switch (sortField) {
          case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
          case 'contact_email': valA = a.contact_email || ''; valB = b.contact_email || ''; break;
          case 'created_at': valA = new Date(a.created_at); valB = new Date(b.created_at); break;
          case 'projectCount': valA = a.projectCount || 0; valB = b.projectCount || 0; break;
          default: return 0;
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [clients, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === clients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clients.map(c => c.id)));
    }
  };

  const toggleSelect = (clientId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(clientId)) newSelected.delete(clientId);
    else newSelected.add(clientId);
    setSelectedIds(newSelected);
  };

  const handleExport = () => {
    const exportColumns = [
      { key: 'name', label: 'Επωνυμία' },
      { key: 'contact_email', label: 'Email' },
      { key: 'contact_phone', label: 'Τηλέφωνο' },
      { key: 'address', label: 'Διεύθυνση' },
      { key: 'created_at', label: 'Ημ/νία', format: (v: string) => format(new Date(v), 'd MMM yyyy', { locale: el }) },
    ];
    exportToCSV(clients, exportColumns, 'clients');
    toast.success('Εξαγωγή ολοκληρώθηκε');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} επιλεγμένα
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Εξαγωγή CSV
        </Button>
      </div>
      
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedIds.size === clients.length && clients.length > 0} 
                  onCheckedChange={toggleSelectAll} 
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Επωνυμία
                  <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => toggleSort('contact_email')}
              >
                <div className="flex items-center gap-2">
                  Επικοινωνία
                  <SortIcon field="contact_email" />
                </div>
              </TableHead>
              <TableHead>Τομέας</TableHead>
              <TableHead>Διεύθυνση</TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => toggleSort('projectCount')}
              >
                <div className="flex items-center gap-2">
                  Έργα
                  <SortIcon field="projectCount" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => toggleSort('created_at')}
              >
                <div className="flex items-center gap-2">
                  Ημ/νία
                  <SortIcon field="created_at" />
                </div>
              </TableHead>
              <TableHead className="w-[80px] text-right">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Δεν βρέθηκαν πελάτες
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map(client => (
                <TableRow 
                  key={client.id} 
                  className="group cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest('button, input, [role="menuitem"]')) {
                      navigate(`/clients/${client.id}`);
                    }
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.has(client.id)} 
                      onCheckedChange={() => toggleSelect(client.id)} 
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={client.name}
                            className="h-full w-full object-contain p-0.5"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{client.name}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
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
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.sector ? (
                      <Badge variant="outline">{sectorLabels[client.sector] || client.sector}</Badge>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.address ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 opacity-50" />
                        <span className="truncate max-w-[180px]">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.projectCount !== undefined ? (
                      <Badge variant="secondary">{client.projectCount} έργα</Badge>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(client.created_at), 'd MMM yyyy', { locale: el })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ενέργειες</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Προβολή
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(client)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Επεξεργασία
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(client.id)} 
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Διαγραφή
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
