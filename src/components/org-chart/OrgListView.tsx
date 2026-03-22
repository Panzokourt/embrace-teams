import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserPlus, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OrgPosition } from './types';
import { naturalCompare } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const PAGE_SIZE = 25;

interface OrgListViewProps {
  positions: OrgPosition[];
  onNodeClick: (node: OrgPosition) => void;
}

type SortKey = 'name' | 'title' | 'department' | 'level';

const getInitials = (name: string | null | undefined, email?: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return email?.slice(0, 2).toUpperCase() || '?';
};

export function OrgListView({ positions, onNodeClick }: OrgListViewProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('level');
  const [sortAsc, setSortAsc] = useState(true);

  const pagination = usePagination(PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    pagination.reset();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let items = positions.filter(p => {
      const name = p.user?.full_name?.toLowerCase() || '';
      const email = p.user?.email?.toLowerCase() || '';
      const title = p.position_title.toLowerCase();
      const dept = p.department?.toLowerCase() || '';
      return name.includes(q) || email.includes(q) || title.includes(q) || dept.includes(q);
    });

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = naturalCompare(a.user?.full_name || 'zzz', b.user?.full_name || 'zzz'); break;
        case 'title': cmp = naturalCompare(a.position_title, b.position_title); break;
        case 'department': cmp = naturalCompare(a.department || 'zzz', b.department || 'zzz'); break;
        case 'level': cmp = a.level - b.level; break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return items;
  }, [positions, search, sortKey, sortAsc]);

  if (pagination.totalCount !== filtered.length) pagination.setTotalCount(filtered.length);
  const pagedItems = filtered.slice(pagination.from, pagination.to + 1);

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium hover:bg-transparent" onClick={() => toggleSort(k)}>
      {label}
      <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />
    </Button>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Αναζήτηση ατόμου, θέσης, τμήματος..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); pagination.reset(); }}
          className="pl-9"
        />
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]"><SortBtn label="Όνομα" k="name" /></TableHead>
              <TableHead><SortBtn label="Θέση" k="title" /></TableHead>
              <TableHead><SortBtn label="Τμήμα" k="department" /></TableHead>
              <TableHead className="w-[80px]"><SortBtn label="Level" k="level" /></TableHead>
              <TableHead className="w-[100px]">Κατάσταση</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedItems.map(pos => (
              <TableRow
                key={pos.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onNodeClick(pos)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {pos.user ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={pos.user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs" style={{ backgroundColor: pos.color + '18', color: pos.color }}>
                          {getInitials(pos.user.full_name, pos.user.email)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: pos.color + '50' }}>
                        <UserPlus className="h-3.5 w-3.5" style={{ color: pos.color + '70' }} />
                      </div>
                    )}
                    <span className={`font-medium ${!pos.user ? 'text-muted-foreground italic' : ''}`}>
                      {pos.user?.full_name || 'Κενή θέση'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: pos.color + '50', color: pos.color }}>
                    {pos.position_title}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{pos.department || '—'}</TableCell>
                <TableCell className="text-center">{pos.level}</TableCell>
                <TableCell>
                  {pos.user ? (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">Στελεχωμένη</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">Κενή</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pagedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Δεν βρέθηκαν αποτελέσματα
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-4">
          <PaginationControls pagination={pagination} />
        </div>
      </div>
    </div>
  );
}
