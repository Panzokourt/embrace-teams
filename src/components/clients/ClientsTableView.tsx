import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  status?: string | null;
  projectCount?: number;
}

const sectorLabels: Record<string, string> = {
  public: 'Δημόσιος',
  private: 'Ιδιωτικός',
  non_profit: 'Μη Κερδοσκ.',
  government: 'Κυβερνητικός',
  mixed: 'Μικτός',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  proposal: 'Proposal',
  risk: 'Risk',
};

const statusClasses: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  proposal: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  risk: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface ClientsTableViewProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  canManage: boolean;
}

type SortField = 'name' | 'contact_email' | 'created_at' | 'projectCount' | 'status';

type ColKey = 'select' | 'name' | 'contact' | 'sector' | 'address' | 'status' | 'projects' | 'date' | 'actions';

const DEFAULT_WIDTHS: Record<ColKey, number> = {
  select: 40,
  name: 280,
  contact: 240,
  sector: 140,
  address: 220,
  status: 120,
  projects: 110,
  date: 120,
  actions: 80,
};

const MIN_WIDTH = 60;
const STORAGE_KEY = 'clients-table-col-widths-v1';

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

  const [widths, setWidths] = useState<Record<ColKey, number>>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTHS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_WIDTHS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_WIDTHS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {}
  }, [widths]);

  const dragRef = useRef<{ key: ColKey; startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback((key: ColKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { key, startX: e.clientX, startW: widths[key] };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const next = Math.max(MIN_WIDTH, dragRef.current.startW + delta);
      setWidths(prev => ({ ...prev, [dragRef.current!.key]: next }));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths]);

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
          case 'status': valA = a.status || ''; valB = b.status || ''; break;
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
    if (selectedIds.size === clients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(clients.map(c => c.id)));
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
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Ημ/νία', format: (v: string) => format(new Date(v), 'd MMM yyyy', { locale: el }) },
    ];
    exportToCSV(clients, exportColumns, 'clients');
    toast.success('Εξαγωγή ολοκληρώθηκε');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Resize handle rendered absolutely on the right edge of each <th>
  const ResizeHandle = ({ colKey }: { colKey: ColKey }) => (
    <span
      onMouseDown={onResizeStart(colKey)}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-primary/40 active:bg-primary/60 transition-colors"
      aria-hidden
    />
  );

  const totalWidth = Object.values(widths).reduce((a, b) => a + b, 0);

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
      
      <div className="rounded-xl border border-border/50 bg-card shadow-soft overflow-x-auto">
        <Table style={{ width: totalWidth, tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead style={{ width: widths.select }} className="relative">
                <Checkbox 
                  checked={selectedIds.size === clients.length && clients.length > 0} 
                  onCheckedChange={toggleSelectAll} 
                />
                <ResizeHandle colKey="select" />
              </TableHead>
              <TableHead 
                style={{ width: widths.name }}
                className="cursor-pointer select-none relative"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Επωνυμία
                  <SortIcon field="name" />
                </div>
                <ResizeHandle colKey="name" />
              </TableHead>
              <TableHead 
                style={{ width: widths.contact }}
                className="cursor-pointer select-none relative"
                onClick={() => toggleSort('contact_email')}
              >
                <div className="flex items-center gap-2">
                  Επικοινωνία
                  <SortIcon field="contact_email" />
                </div>
                <ResizeHandle colKey="contact" />
              </TableHead>
              <TableHead style={{ width: widths.sector }} className="relative">
                Τομέας
                <ResizeHandle colKey="sector" />
              </TableHead>
              <TableHead style={{ width: widths.address }} className="relative">
                Διεύθυνση
                <ResizeHandle colKey="address" />
              </TableHead>
              <TableHead 
                style={{ width: widths.status }}
                className="cursor-pointer select-none relative"
                onClick={() => toggleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  <SortIcon field="status" />
                </div>
                <ResizeHandle colKey="status" />
              </TableHead>
              <TableHead 
                style={{ width: widths.projects }}
                className="cursor-pointer select-none relative"
                onClick={() => toggleSort('projectCount')}
              >
                <div className="flex items-center gap-2">
                  Έργα
                  <SortIcon field="projectCount" />
                </div>
                <ResizeHandle colKey="projects" />
              </TableHead>
              <TableHead 
                style={{ width: widths.date }}
                className="cursor-pointer select-none relative"
                onClick={() => toggleSort('created_at')}
              >
                <div className="flex items-center gap-2">
                  Ημ/νία
                  <SortIcon field="created_at" />
                </div>
                <ResizeHandle colKey="date" />
              </TableHead>
              <TableHead style={{ width: widths.actions }} className="text-right">
                Ενέργειες
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Δεν βρέθηκαν πελάτες
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map(client => {
                const statusKey = client.status || 'active';
                return (
                <TableRow 
                  key={client.id} 
                  className="group cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest('button, input, [role="menuitem"]')) {
                      navigate(`/clients/${client.id}`);
                    }
                  }}
                >
                  <TableCell style={{ width: widths.select }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.has(client.id)} 
                      onCheckedChange={() => toggleSelect(client.id)} 
                    />
                  </TableCell>
                  <TableCell style={{ width: widths.name }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{client.name}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                        </div>
                        {client.notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            {client.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: widths.contact }}>
                    <div className="space-y-1 min-w-0">
                      {client.contact_email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                          <Mail className="h-3.5 w-3.5 opacity-50 shrink-0" />
                          <span className="truncate">{client.contact_email}</span>
                        </div>
                      )}
                      {client.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                          <Phone className="h-3.5 w-3.5 opacity-50 shrink-0" />
                          <span className="truncate">{client.contact_phone}</span>
                        </div>
                      )}
                      {!client.contact_email && !client.contact_phone && (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell style={{ width: widths.sector }}>
                    {client.sector ? (
                      <Badge variant="outline">{sectorLabels[client.sector] || client.sector}</Badge>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell style={{ width: widths.address }}>
                    {client.address ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        <MapPin className="h-3.5 w-3.5 opacity-50 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell style={{ width: widths.status }}>
                    <Badge
                      variant="outline"
                      className={cn('border', statusClasses[statusKey] || '')}
                    >
                      {statusLabels[statusKey] || statusKey}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ width: widths.projects }}>
                    {client.projectCount !== undefined ? (
                      <Badge variant="secondary">{client.projectCount} έργα</Badge>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell style={{ width: widths.date }} className="text-muted-foreground text-sm">
                    {format(new Date(client.created_at), 'd MMM yyyy', { locale: el })}
                  </TableCell>
                  <TableCell style={{ width: widths.actions }} onClick={(e) => e.stopPropagation()}>
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
              );})
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
