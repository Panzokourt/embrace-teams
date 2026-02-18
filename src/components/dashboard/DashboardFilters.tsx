import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { DashboardFilters as Filters } from '@/hooks/useDashboardConfig';
import { cn } from '@/lib/utils';

interface Props {
  filters: Filters;
  onFiltersChange: (f: Partial<Filters>) => void;
}

const PERIODS = [
  { value: 'today', label: 'Σήμερα' },
  { value: 'week', label: 'Εβδομάδα' },
  { value: 'month', label: 'Μήνας' },
  { value: 'quarter', label: 'Τρίμηνο' },
  { value: 'year', label: 'Έτος' },
] as const;

export default function DashboardFilters({ filters, onFiltersChange }: Props) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      if (data) setClients(data);
    });
    supabase.from('projects').select('id, name').eq('status', 'active').order('name').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period toggle */}
      <div className="flex items-center rounded-lg border border-border/50 bg-card p-0.5 gap-0.5">
        {PERIODS.map(p => (
          <Button
            key={p.value}
            size="sm"
            variant={filters.period === p.value ? 'default' : 'ghost'}
            className={cn(
              "h-7 px-2.5 text-xs rounded-md",
              filters.period === p.value && "shadow-sm"
            )}
            onClick={() => onFiltersChange({ period: p.value })}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Client filter */}
      <Select
        value={filters.clientId || 'all'}
        onValueChange={v => onFiltersChange({ clientId: v === 'all' ? null : v })}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Πελάτης" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Όλοι οι πελάτες</SelectItem>
          {clients.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Project filter */}
      <Select
        value={filters.projectId || 'all'}
        onValueChange={v => onFiltersChange({ projectId: v === 'all' ? null : v })}
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Έργο" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Όλα τα έργα</SelectItem>
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
