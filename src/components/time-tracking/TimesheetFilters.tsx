import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, CalendarIcon, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

export type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_week' | 'last_month' | 'custom';
export type GroupBy = 'project' | 'person' | 'task' | 'status';
export type AggregationLevel = 'day' | 'month' | 'year';

interface TimesheetFiltersProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  aggregation: AggregationLevel;
  onAggregationChange: (a: AggregationLevel) => void;
  filterProject: string;
  onFilterProjectChange: (v: string) => void;
  filterUser: string;
  onFilterUserChange: (v: string) => void;
  projects: { id: string; name: string }[];
  users: { id: string; full_name: string | null }[];
  showUserFilter: boolean;
  totalMinutes: number;
}

const presetLabels: Record<DatePreset, string> = {
  today: 'Σήμερα',
  this_week: 'Αυτή την εβδομάδα',
  this_month: 'Αυτόν τον μήνα',
  last_week: 'Προηγούμενη εβδομάδα',
  last_month: 'Προηγούμενος μήνας',
  custom: 'Προσαρμοσμένο',
};

export function TimesheetFilters({
  datePreset, onDatePresetChange, dateRange, onDateRangeChange,
  groupBy, onGroupByChange, aggregation, onAggregationChange,
  filterProject, onFilterProjectChange,
  filterUser, onFilterUserChange, projects, users, showUserFilter, totalMinutes
}: TimesheetFiltersProps) {
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  const navigatePrev = () => {
    if (datePreset === 'today') {
      onDateRangeChange({ start: subDays(dateRange.start, 1), end: subDays(dateRange.end, 1) });
    } else if (datePreset === 'this_week' || datePreset === 'last_week') {
      const s = subWeeks(dateRange.start, 1);
      onDateRangeChange({ start: startOfWeek(s, { weekStartsOn: 1 }), end: endOfWeek(s, { weekStartsOn: 1 }) });
    } else {
      const s = subMonths(dateRange.start, 1);
      onDateRangeChange({ start: startOfMonth(s), end: endOfMonth(s) });
    }
    onDatePresetChange('custom');
  };

  const navigateNext = () => {
    if (datePreset === 'today') {
      onDateRangeChange({ start: addDays(dateRange.start, 1), end: addDays(dateRange.end, 1) });
    } else if (datePreset === 'this_week' || datePreset === 'last_week') {
      const s = addWeeks(dateRange.start, 1);
      onDateRangeChange({ start: startOfWeek(s, { weekStartsOn: 1 }), end: endOfWeek(s, { weekStartsOn: 1 }) });
    } else {
      const s = addMonths(dateRange.start, 1);
      onDateRangeChange({ start: startOfMonth(s), end: endOfMonth(s) });
    }
    onDatePresetChange('custom');
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Date navigation */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[180px] text-center">
          {format(dateRange.start, 'dd MMM', { locale: el })} – {format(dateRange.end, 'dd MMM yyyy', { locale: el })}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Preset select */}
      <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(presetLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Group by */}
      <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="project">Ανά Έργο</SelectItem>
          <SelectItem value="person">Ανά Άτομο</SelectItem>
          <SelectItem value="task">Ανά Task</SelectItem>
          <SelectItem value="status">Ανά Status</SelectItem>
        </SelectContent>
      </Select>

      {/* Aggregation level */}
      <Select value={aggregation} onValueChange={(v) => onAggregationChange(v as AggregationLevel)}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Ανά Ημέρα</SelectItem>
          <SelectItem value="month">Ανά Μήνα</SelectItem>
          <SelectItem value="year">Ανά Έτος</SelectItem>
        </SelectContent>
      </Select>

      {/* Project filter */}
      <Select value={filterProject} onValueChange={onFilterProjectChange}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Όλα τα έργα" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Όλα τα έργα</SelectItem>
          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* User filter */}
      {showUserFilter && users.length > 0 && (
        <Select value={filterUser} onValueChange={onFilterUserChange}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Όλοι" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλοι</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || 'Χωρίς όνομα'}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {/* Custom date range picker */}
      {datePreset === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              Επιλογή ημερομηνιών
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <Calendar
              mode="range"
              locale={el}
              selected={{ from: dateRange.start, to: dateRange.end }}
              onSelect={(range: DateRange | undefined) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ start: range.from, end: range.to });
                } else if (range?.from) {
                  onDateRangeChange({ start: range.from, end: range.from });
                }
              }}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Total */}
      <Badge variant="secondary" className="text-sm gap-1.5 py-1.5 px-3 ml-auto">
        <Clock className="h-3.5 w-3.5" />
        Σύνολο: {totalHours}ω {totalMins}λ
      </Badge>
    </div>
  );
}
