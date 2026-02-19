import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PeriodFilter, ReportsFilters } from '@/hooks/useReportsData';

interface Props {
  filters: ReportsFilters;
  onChange: (f: ReportsFilters) => void;
  clients: any[];
  projects: any[];
  departments: any[];
  profiles: any[];
}

export function ReportFilters({ filters, onChange, clients, projects, departments, profiles }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={filters.period} onValueChange={(v) => onChange({ ...filters, period: v as PeriodFilter })}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Περίοδος" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3m">3 μήνες</SelectItem>
          <SelectItem value="6m">6 μήνες</SelectItem>
          <SelectItem value="12m">12 μήνες</SelectItem>
          <SelectItem value="all">Όλα</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.clientId || 'all'} onValueChange={(v) => onChange({ ...filters, clientId: v === 'all' ? null : v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Πελάτης" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Όλοι οι πελάτες</SelectItem>
          {clients.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.projectId || 'all'} onValueChange={(v) => onChange({ ...filters, projectId: v === 'all' ? null : v })}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Έργο" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Όλα τα έργα</SelectItem>
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.departmentId || 'all'} onValueChange={(v) => onChange({ ...filters, departmentId: v === 'all' ? null : v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Τμήμα" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Όλα τα τμήματα</SelectItem>
          {departments.map(d => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.userId || 'all'} onValueChange={(v) => onChange({ ...filters, userId: v === 'all' ? null : v })}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Άτομο" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Όλα τα μέλη</SelectItem>
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
