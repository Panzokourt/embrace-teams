import { useState, useMemo, useRef } from 'react';
import { StickyHorizontalScroll, type StickyHorizontalScrollHandle } from '@/components/shared/StickyHorizontalScroll';
import { HorizontalScrollButtons } from '@/components/shared/HorizontalScrollButtons';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  MoreHorizontal, Pencil, Trash2, UserCog, Ban, UserCheck, 
  CheckCircle2, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { CompanyUser } from '@/hooks/useRBAC';
import { CompanyRole, UserStatus } from '@/contexts/AuthContext';
import { exportToCSV } from '@/utils/exportUtils';
import { useColumnLayout, type ColumnDef } from '@/hooks/useColumnLayout';
import { SortableTableHead } from '@/components/shared/SortableTableHead';

interface UsersTableViewProps {
  users: CompanyUser[];
  currentUserId?: string;
  onEdit: (user: CompanyUser) => void;
  onEditPermissions: (user: CompanyUser) => void;
  onDelete: (user: CompanyUser) => void;
  onChangeRole: (userId: string, role: CompanyRole) => void;
  onChangeStatus: (userId: string, status: UserStatus) => void;
  canManage: boolean;
}

const roleLabels: Record<CompanyRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
  billing: 'Billing'
};

const statusLabels: Record<UserStatus, string> = {
  invited: 'Προσκεκλημένος',
  pending: 'Αναμονή',
  active: 'Ενεργός',
  suspended: 'Ανεσταλμένος',
  deactivated: 'Απενεργοποιημένος'
};

const roleColors: Record<CompanyRole, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  billing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
};

const statusColors: Record<UserStatus, string> = {
  invited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  deactivated: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
};

type ColKey = 'select' | 'user' | 'role' | 'status' | 'scope' | 'last_login' | 'actions';

const COLUMNS: ColumnDef<ColKey>[] = [
  { key: 'select', label: '', width: 40, locked: true },
  { key: 'user', label: 'Χρήστης', width: 280, sortField: 'user' },
  { key: 'role', label: 'Ρόλος', width: 130, sortField: 'role' },
  { key: 'status', label: 'Κατάσταση', width: 150, sortField: 'status' },
  { key: 'scope', label: 'Scope', width: 140 },
  { key: 'last_login', label: 'Τελ. Σύνδεση', width: 140, sortField: 'last_login_at' },
  { key: 'actions', label: 'Ενέργειες', width: 80, locked: true },
];

export function UsersTableView({
  users,
  currentUserId,
  onEdit,
  onEditPermissions,
  onDelete,
  onChangeRole,
  onChangeStatus,
  canManage
}: UsersTableViewProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const layout = useColumnLayout<ColKey>({ storageKey: 'users-table', columns: COLUMNS });
  const scrollRef = useRef<StickyHorizontalScrollHandle>(null);

  const sortedUsers = useMemo(() => {
    if (!layout.sortField) return users;
    const f = layout.sortField;
    const dir = layout.sortDirection;
    return [...users].sort((a: any, b: any) => {
      let valA: any, valB: any;
      switch (f) {
        case 'user': valA = a.full_name || a.email; valB = b.full_name || b.email; break;
        case 'role': valA = a.role; valB = b.role; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'last_login_at': valA = a.last_login_at || ''; valB = b.last_login_at || ''; break;
        default: return 0;
      }
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, layout.sortField, layout.sortDirection]);

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map(u => u.user_id)));
  };

  const toggleSelect = (userId: string) => {
    const next = new Set(selectedIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedIds(next);
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const handleExport = () => {
    const exportColumns = [
      { key: 'full_name', label: 'Ονοματεπώνυμο' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Ρόλος', format: (v: string) => roleLabels[v as CompanyRole] || v },
      { key: 'status', label: 'Κατάσταση', format: (v: string) => statusLabels[v as UserStatus] || v },
    ];
    exportToCSV(users, exportColumns, 'users');
    toast.success('Εξαγωγή ολοκληρώθηκε');
  };

  const totalWidth = layout.visibleOrder.reduce((s, k) => s + layout.widths[k], 0);

  const renderCell = (key: ColKey, user: CompanyUser) => {
    const isCurrentUser = user.user_id === currentUserId;
    switch (key) {
      case 'select':
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(user.user_id)}
              onCheckedChange={() => toggleSelect(user.user_id)}
              disabled={isCurrentUser}
            />
          </div>
        );
      case 'user':
        return (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{user.full_name || 'Χωρίς όνομα'}</span>
                {isCurrentUser && <Badge variant="secondary" className="text-xs shrink-0">Εσείς</Badge>}
                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
              </div>
              <span className="text-sm text-muted-foreground truncate block">{user.email}</span>
            </div>
          </div>
        );
      case 'role':
        return <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>;
      case 'status':
        return <Badge className={statusColors[user.status]}>{statusLabels[user.status]}</Badge>;
      case 'scope':
        return (
          <span className="text-sm text-muted-foreground">
            {user.access_scope === 'company' ? 'Company-wide' : 'Assigned'}
          </span>
        );
      case 'last_login':
        return (
          <span className="text-sm text-muted-foreground">
            {user.last_login_at ? format(new Date(user.last_login_at), 'd MMM yyyy', { locale: el }) : '-'}
          </span>
        );
      case 'actions':
        return canManage ? (
          <div className="text-right" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ενέργειες</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(user)}>
                  <Pencil className="h-4 w-4 mr-2" /> Επεξεργασία
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditPermissions(user)}>
                  <UserCog className="h-4 w-4 mr-2" /> Δικαιώματα
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Αλλαγή Ρόλου</DropdownMenuLabel>
                {(['admin', 'manager', 'member', 'viewer', 'billing'] as CompanyRole[]).map(role => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => onChangeRole(user.user_id, role)}
                    disabled={user.role === role || isCurrentUser}
                  >
                    {roleLabels[role]}
                    {user.role === role && <CheckCircle2 className="h-4 w-4 ml-auto text-success" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {user.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onChangeStatus(user.user_id, 'suspended')} disabled={isCurrentUser}>
                    <Ban className="h-4 w-4 mr-2" /> Αναστολή
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onChangeStatus(user.user_id, 'active')}>
                    <UserCheck className="h-4 w-4 mr-2" /> Ενεργοποίηση
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive" disabled={isCurrentUser}>
                  <Trash2 className="h-4 w-4 mr-2" /> Διαγραφή
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null;
    }
  };

  // Special handling for select column header (checkbox instead of label)
  const renderHeaderContent = (key: ColKey) => {
    if (key === 'select') {
      return (
        <Checkbox
          checked={selectedIds.size === users.length && users.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      );
    }
    return COLUMNS.find(c => c.key === key)?.label;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>Εξαγωγή CSV</Button>
      </div>
      <div className="rounded-xl border border-border/50 bg-card overflow-x-auto">
        <layout.DndContext
          sensors={layout.sensors}
          collisionDetection={layout.closestCenter}
          onDragEnd={layout.handleDragEnd}
        >
          <Table style={{ width: totalWidth, tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow>
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
                      {renderHeaderContent(key)}
                    </SortableTableHead>
                  ))}
                </layout.SortableContext>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={layout.visibleOrder.length} className="h-24 text-center text-muted-foreground">
                    Δεν βρέθηκαν χρήστες
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map(user => (
                  <TableRow
                    key={user.id}
                    className="group cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button, input, [role="menuitem"]')) {
                        navigate(`/users/${user.user_id}`);
                      }
                    }}
                  >
                    {layout.visibleOrder.map(key => (
                      <TableCell key={key} style={{ width: layout.widths[key] }} className="overflow-hidden">
                        {renderCell(key, user)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </layout.DndContext>
      </div>
    </div>
  );
}
