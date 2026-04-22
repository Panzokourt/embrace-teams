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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
} from '@/components/ui/context-menu';
import { 
  MoreHorizontal, Pencil, Trash2, Building2, Mail, Phone, 
  MapPin, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, GripVertical,
  EyeOff, Eye, RotateCcw, Pin, Columns3
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

type ColKey = 'name' | 'contact' | 'sector' | 'address' | 'status' | 'projects' | 'date' | 'actions';

const SELECT_WIDTH = 40;

const DEFAULT_WIDTHS: Record<ColKey, number> = {
  name: 280,
  contact: 240,
  sector: 140,
  address: 220,
  status: 120,
  projects: 110,
  date: 120,
  actions: 80,
};

const DEFAULT_ORDER: ColKey[] = ['name', 'contact', 'sector', 'address', 'status', 'projects', 'date', 'actions'];

const MIN_WIDTH = 60;
const STORAGE_KEY = 'clients-table-col-widths-v1';
const ORDER_STORAGE_KEY = 'clients-table-col-order-v1';
const HIDDEN_STORAGE_KEY = 'clients-table-col-hidden-v1';

const COL_LABELS: Record<ColKey, string> = {
  name: 'Επωνυμία',
  contact: 'Επικοινωνία',
  sector: 'Τομέας',
  address: 'Διεύθυνση',
  status: 'Status',
  projects: 'Έργα',
  date: 'Ημ/νία',
  actions: 'Ενέργειες',
};

const SORTABLE_FIELD_BY_COL: Partial<Record<ColKey, SortField>> = {
  name: 'name',
  contact: 'contact_email',
  status: 'status',
  projects: 'projectCount',
  date: 'created_at',
};

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

  const [order, setOrder] = useState<ColKey[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_ORDER;
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ColKey[];
        // sanity-check: must contain all keys exactly once
        const ok = DEFAULT_ORDER.every(k => parsed.includes(k)) && parsed.length === DEFAULT_ORDER.length;
        if (ok) return parsed;
      }
    } catch {}
    return DEFAULT_ORDER;
  });

  const [hidden, setHidden] = useState<Set<ColKey>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw) as ColKey[]);
    } catch {}
    return new Set();
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(Array.from(hidden)));
    } catch {}
  }, [hidden]);

  const visibleOrder = useMemo(() => order.filter(k => !hidden.has(k)), [order, hidden]);

  const hideColumn = (key: ColKey) => setHidden(prev => new Set(prev).add(key));
  const showColumn = (key: ColKey) => setHidden(prev => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  });
  const resetColumnWidth = (key: ColKey) =>
    setWidths(prev => ({ ...prev, [key]: DEFAULT_WIDTHS[key] }));
  const resetAllColumns = () => {
    setWidths(DEFAULT_WIDTHS);
    setOrder(DEFAULT_ORDER);
    setHidden(new Set());
    toast.success('Οι στήλες επαναφέρθηκαν');
  };
  const sortAsc = (field: SortField) => { setSortField(field); setSortDirection('asc'); };
  const sortDesc = (field: SortField) => { setSortField(field); setSortDirection('desc'); };
  const clearSort = () => { setSortField(null); };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {}
  }, [widths]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch {}
  }, [order]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder(prev => {
      const oldIdx = prev.indexOf(active.id as ColKey);
      const newIdx = prev.indexOf(over.id as ColKey);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

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

  const ResizeHandle = ({ colKey }: { colKey: ColKey }) => (
    <span
      onMouseDown={onResizeStart(colKey)}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
      aria-hidden
    />
  );

  // Header content per column key
  const renderHeader = (key: ColKey) => {
    switch (key) {
      case 'name':
        return (
          <div
            className="flex items-center gap-2 cursor-pointer select-none flex-1"
            onClick={() => toggleSort('name')}
          >
            Επωνυμία <SortIcon field="name" />
          </div>
        );
      case 'contact':
        return (
          <div
            className="flex items-center gap-2 cursor-pointer select-none flex-1"
            onClick={() => toggleSort('contact_email')}
          >
            Επικοινωνία <SortIcon field="contact_email" />
          </div>
        );
      case 'sector':
        return <div className="flex-1">Τομέας</div>;
      case 'address':
        return <div className="flex-1">Διεύθυνση</div>;
      case 'status':
        return (
          <div
            className="flex items-center gap-2 cursor-pointer select-none flex-1"
            onClick={() => toggleSort('status')}
          >
            Status <SortIcon field="status" />
          </div>
        );
      case 'projects':
        return (
          <div
            className="flex items-center gap-2 cursor-pointer select-none flex-1"
            onClick={() => toggleSort('projectCount')}
          >
            Έργα <SortIcon field="projectCount" />
          </div>
        );
      case 'date':
        return (
          <div
            className="flex items-center gap-2 cursor-pointer select-none flex-1"
            onClick={() => toggleSort('created_at')}
          >
            Ημ/νία <SortIcon field="created_at" />
          </div>
        );
      case 'actions':
        return <div className="flex-1 text-right">Ενέργειες</div>;
    }
  };

  // Cell content per column key
  const renderCell = (key: ColKey, client: Client) => {
    switch (key) {
      case 'name':
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={client.name}
                  className="h-full w-full object-contain p-0.5"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
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
                <p className="text-xs text-muted-foreground truncate">{client.notes}</p>
              )}
            </div>
          </div>
        );
      case 'contact':
        return (
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
        );
      case 'sector':
        return client.sector ? (
          <Badge variant="outline">{sectorLabels[client.sector] || client.sector}</Badge>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        );
      case 'address':
        return client.address ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <MapPin className="h-3.5 w-3.5 opacity-50 shrink-0" />
            <span className="truncate">{client.address}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        );
      case 'status': {
        const statusKey = client.status || 'active';
        return (
          <Badge variant="outline" className={cn('border', statusClasses[statusKey] || '')}>
            {statusLabels[statusKey] || statusKey}
          </Badge>
        );
      }
      case 'projects':
        return client.projectCount !== undefined ? (
          <Badge variant="secondary">{client.projectCount} έργα</Badge>
        ) : (
          <span className="text-muted-foreground/50">-</span>
        );
      case 'date':
        return (
          <span className="text-muted-foreground text-sm">
            {format(new Date(client.created_at), 'd MMM yyyy', { locale: el })}
          </span>
        );
      case 'actions':
        return (
          <div className="text-right" onClick={(e) => e.stopPropagation()}>
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
                    <ExternalLink className="h-4 w-4 mr-2" /> Προβολή
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(client)}>
                    <Pencil className="h-4 w-4 mr-2" /> Επεξεργασία
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Διαγραφή
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
    }
  };

  const totalWidth = SELECT_WIDTH + order.reduce((s, k) => s + widths[k], 0);

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table style={{ width: totalWidth, tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead style={{ width: SELECT_WIDTH }}>
                  <Checkbox 
                    checked={selectedIds.size === clients.length && clients.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                  />
                </TableHead>
                <SortableContext items={order} strategy={horizontalListSortingStrategy}>
                  {order.map(key => (
                    <SortableHeaderCell
                      key={key}
                      colKey={key}
                      width={widths[key]}
                      content={renderHeader(key)}
                      resizeHandle={<ResizeHandle colKey={key} />}
                    />
                  ))}
                </SortableContext>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={order.length + 1} className="h-24 text-center text-muted-foreground">
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
                    <TableCell style={{ width: SELECT_WIDTH }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(client.id)}
                        onCheckedChange={() => toggleSelect(client.id)}
                      />
                    </TableCell>
                    {order.map(key => (
                      <TableCell key={key} style={{ width: widths[key] }} className="overflow-hidden">
                        {renderCell(key, client)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
}

interface SortableHeaderCellProps {
  colKey: ColKey;
  width: number;
  content: React.ReactNode;
  resizeHandle: React.ReactNode;
}

function SortableHeaderCell({ colKey, width, content, resizeHandle }: SortableHeaderCellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: colKey });

  const style: React.CSSProperties = {
    width,
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <TableHead ref={setNodeRef} style={style} className="relative">
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0 -ml-1"
          aria-label="Μετακίνηση στήλης"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {content}
      </div>
      {resizeHandle}
    </TableHead>
  );
}
