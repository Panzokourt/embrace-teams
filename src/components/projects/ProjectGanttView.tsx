import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, CalendarDays, GanttChartSquare, Filter,
} from 'lucide-react';
import {
  format, addWeeks, addMonths, eachWeekOfInterval, eachMonthOfInterval,
  isBefore, isAfter, parseISO,
} from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ProjectStatus = 'lead' | 'proposal' | 'negotiation' | 'won' | 'active' | 'completed' | 'cancelled' | 'lost' | 'tender';

interface GanttProject {
  id: string;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  progress?: number | null;
  client?: { name: string; sector?: string | null } | null;
  client_id: string | null;
}

interface ProjectGanttViewProps {
  projects: GanttProject[];
  onProjectUpdated?: () => void;
}

type Granularity = 'weeks' | 'months';

const STATUS_CONFIG: Record<string, { label: string; barColor: string }> = {
  lead: { label: 'Lead', barColor: 'hsl(210 80% 55%)' },
  proposal: { label: 'Πρόταση', barColor: 'hsl(45 93% 47%)' },
  negotiation: { label: 'Διαπραγμάτευση', barColor: 'hsl(30 80% 55%)' },
  won: { label: 'Κερδήθηκε', barColor: 'hsl(142 71% 45%)' },
  active: { label: 'Ενεργό', barColor: 'hsl(142 71% 45%)' },
  completed: { label: 'Ολοκληρωμένο', barColor: '#888' },
  cancelled: { label: 'Ακυρωμένο', barColor: '#ef4444' },
  lost: { label: 'Χάθηκε', barColor: '#ef4444' },
  tender: { label: 'Διαγωνισμός', barColor: 'hsl(45 93% 47%)' },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));

function getBarPosition(start: Date | null, end: Date | null, tlStart: Date, tlEnd: Date) {
  const totalMs = tlEnd.getTime() - tlStart.getTime();
  if (totalMs <= 0) return null;
  const s = start ?? end;
  const e = end ?? start;
  if (!s || !e) return null;
  const cs = isBefore(s, tlStart) ? tlStart : s;
  const ce = isAfter(e, tlEnd) ? tlEnd : e;
  const leftPct = ((cs.getTime() - tlStart.getTime()) / totalMs) * 100;
  const widthPct = Math.max(0.5, ((ce.getTime() - cs.getTime()) / totalMs) * 100);
  return { leftPct, widthPct };
}

export function ProjectGanttView({ projects, onProjectUpdated }: ProjectGanttViewProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [granularity, setGranularity] = useState<Granularity>('months');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [editingProject, setEditingProject] = useState<GanttProject | null>(null);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [editStatus, setEditStatus] = useState<string>('');

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => { if (p.client?.name && p.client_id) map.set(p.client_id, p.client.name); });
    return Array.from(map.entries()).map(([v, l]) => ({ value: v, label: l }));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (clientFilter !== 'all' && p.client_id !== clientFilter) return false;
      return true;
    });
  }, [projects, statusFilter, clientFilter]);

  const projectsWithDates = useMemo(() =>
    filteredProjects.filter(p => p.start_date || p.end_date),
    [filteredProjects]
  );

  const groupedByClient = useMemo(() => {
    const map = new Map<string, { name: string; projects: GanttProject[] }>();
    for (const p of projectsWithDates) {
      const key = p.client_id || '_none';
      if (!map.has(key)) map.set(key, { name: p.client?.name || 'Χωρίς Πελάτη', projects: [] });
      map.get(key)!.projects.push(p);
    }
    return Array.from(map.values());
  }, [projectsWithDates]);

  const { timelineStart, timelineEnd } = useMemo(() => {
    const allDates: Date[] = [];
    for (const p of projectsWithDates) {
      if (p.start_date) allDates.push(parseISO(p.start_date));
      if (p.end_date) allDates.push(parseISO(p.end_date));
    }
    const today = new Date();
    if (allDates.length === 0) return { timelineStart: addMonths(today, -1), timelineEnd: addMonths(today, 6) };
    const min = allDates.reduce((a, b) => (isBefore(a, b) ? a : b));
    const max = allDates.reduce((a, b) => (isAfter(a, b) ? a : b));
    return { timelineStart: addWeeks(min, -2), timelineEnd: addWeeks(max, 4) };
  }, [projectsWithDates]);

  const ticks = granularity === 'weeks'
    ? eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 1 })
    : eachMonthOfInterval({ start: timelineStart, end: timelineEnd });

  const todayPct = (() => {
    const today = new Date();
    if (isBefore(today, timelineStart) || isAfter(today, timelineEnd)) return null;
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    return ((today.getTime() - timelineStart.getTime()) / totalMs) * 100;
  })();

  const scrollToToday = useCallback(() => {
    if (!scrollRef.current || todayPct === null) return;
    const sw = scrollRef.current.scrollWidth;
    const cw = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = (todayPct / 100) * sw - cw / 2;
  }, [todayPct]);

  useEffect(() => { setTimeout(scrollToToday, 100); }, [scrollToToday]);

  const handleBarClick = (project: GanttProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditStartDate(project.start_date ? parseISO(project.start_date) : undefined);
    setEditEndDate(project.end_date ? parseISO(project.end_date) : undefined);
    setEditStatus(project.status);
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    const updates: Record<string, any> = {};
    if (editStartDate) updates.start_date = format(editStartDate, 'yyyy-MM-dd');
    if (editEndDate) updates.end_date = format(editEndDate, 'yyyy-MM-dd');
    if (editStatus && editStatus !== editingProject.status) updates.status = editStatus;
    if (Object.keys(updates).length === 0) { setEditingProject(null); return; }
    const { error } = await supabase.from('projects').update(updates).eq('id', editingProject.id);
    if (error) { toast.error('Σφάλμα ενημέρωσης'); return; }
    toast.success('Έργο ενημερώθηκε');
    setEditingProject(null);
    onProjectUpdated?.();
  };

  const hasActiveFilters = statusFilter !== 'all' || clientFilter !== 'all';
  const LABEL_WIDTH = 260;

  if (projectsWithDates.length === 0 && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="p-4 rounded-full bg-muted"><GanttChartSquare className="h-8 w-8 text-muted-foreground" /></div>
        <p className="text-lg font-medium">Δεν υπάρχουν ημερομηνίες</p>
        <p className="text-sm text-muted-foreground max-w-sm">Προσθέστε ημερομηνίες στα έργα για να εμφανιστεί το Gantt.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={scrollToToday}><CalendarDays className="h-3.5 w-3.5 mr-1" />Σήμερα</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className={cn("h-3.5 w-3.5", hasActiveFilters ? "text-primary" : "text-muted-foreground")} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue placeholder="Κατάσταση" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες</SelectItem>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {clientOptions.length > 1 && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Πελάτης" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλοι</SelectItem>
                {clientOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setStatusFilter('all'); setClientFilter('all'); }}>Καθαρισμός</Button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
          <Button variant={granularity === 'weeks' ? 'default' : 'ghost'} size="sm" className="h-6 px-2.5 text-xs" onClick={() => setGranularity('weeks')}>Εβδομάδες</Button>
          <Button variant={granularity === 'months' ? 'default' : 'ghost'} size="sm" className="h-6 px-2.5 text-xs" onClick={() => setGranularity('months')}>Μήνες</Button>
        </div>
      </div>

      {projectsWithDates.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {hasActiveFilters ? 'Κανένα έργο δεν ταιριάζει στα φίλτρα ή δεν έχει ημερομηνίες.' : 'Κανένα έργο με ημερομηνίες.'}
        </div>
      ) : (
        <div className="flex overflow-hidden">
          <div className="shrink-0 border-r bg-card" style={{ width: LABEL_WIDTH }}>
            <div className="h-10 flex items-center px-3 border-b bg-muted/40 text-xs font-semibold text-muted-foreground">Έργο</div>
            {groupedByClient.map(group => (
              <div key={group.name}>
                <div className="h-8 flex items-center px-3 border-b bg-muted/20">
                  <span className="text-xs font-semibold text-foreground truncate">{group.name}</span>
                  <Badge variant="secondary" className="ml-2 text-[10px] h-4">{group.projects.length}</Badge>
                </div>
                {group.projects.map(project => {
                  const isOverdue = project.end_date && isBefore(parseISO(project.end_date), new Date()) && project.status !== 'completed';
                  return (
                    <div key={project.id} className="h-9 flex items-center gap-2 px-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/projects/${project.id}`)}>
                      <span className={cn('text-xs truncate flex-1', project.status === 'completed' && 'line-through text-muted-foreground', isOverdue && 'text-destructive')}>{project.name}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ minWidth: Math.max(ticks.length * (granularity === 'weeks' ? 80 : 120), 600) }}>
              <div className="h-10 flex items-end border-b bg-muted/40 relative">
                {ticks.map((tick, i) => {
                  const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                  return (
                    <div key={i} className="absolute top-0 bottom-0 flex items-center border-l border-border/30" style={{ left: `${leftPct}%` }}>
                      <span className="text-[10px] text-muted-foreground px-1.5 whitespace-nowrap">
                        {granularity === 'weeks' ? format(tick, 'd MMM', { locale: el }) : format(tick, 'MMM yyyy', { locale: el })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {groupedByClient.map(group => (
                <div key={group.name}>
                  <div className="h-8 relative border-b bg-muted/10">
                    {ticks.map((tick, i) => {
                      const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                      return <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20" style={{ left: `${leftPct}%` }} />;
                    })}
                  </div>
                  {group.projects.map(project => {
                    const start = project.start_date ? parseISO(project.start_date) : null;
                    const end = project.end_date ? parseISO(project.end_date) : null;
                    const pos = getBarPosition(start, end, timelineStart, timelineEnd);
                    const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
                    const isOverdue = end && isBefore(end, new Date()) && project.status !== 'completed';
                    const progress = project.progress ?? 0;

                    return (
                      <div key={project.id} className="h-9 relative border-b border-border/20">
                        {ticks.map((tick, i) => {
                          const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                          return <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20" style={{ left: `${leftPct}%` }} />;
                        })}
                        {todayPct !== null && <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/50 z-10" style={{ left: `${todayPct}%` }} />}
                        {pos && (
                          <Popover open={editingProject?.id === project.id} onOpenChange={(open) => { if (!open) setEditingProject(null); }}>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <PopoverTrigger asChild>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="absolute top-1.5 h-6 rounded-md cursor-pointer z-20 transition-all hover:brightness-110 hover:shadow-md overflow-hidden"
                                      style={{ left: `${pos.leftPct}%`, width: `${Math.max(pos.widthPct, 1)}%`, backgroundColor: isOverdue ? '#ef4444' : cfg.barColor, opacity: 0.85 }}
                                      onClick={(e) => handleBarClick(project, e)}
                                    >
                                      {progress > 0 && <div className="absolute inset-0 opacity-30 bg-background" style={{ width: `${100 - progress}%`, right: 0, left: 'auto' }} />}
                                      <div className="px-1.5 flex items-center h-full">
                                        <span className="text-[10px] font-medium text-white truncate drop-shadow-sm">{pos.widthPct > 3 ? project.name : ''}</span>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                </PopoverTrigger>
                                <TooltipContent side="top" className="text-xs max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-semibold">{project.name}</p>
                                    {project.client?.name && <p className="text-muted-foreground">{project.client.name}</p>}
                                    <p>{cfg.label} · {progress}%</p>
                                    <p>{start ? format(start, 'd MMM yyyy', { locale: el }) : '—'} → {end ? format(end, 'd MMM yyyy', { locale: el }) : '—'}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <PopoverContent className="w-72 p-3" align="start" side="bottom">
                              <div className="space-y-3">
                                <p className="text-sm font-semibold truncate">{project.name}</p>
                                <div className="space-y-2">
                                  <label className="text-xs text-muted-foreground">Κατάσταση</label>
                                  <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Έναρξη</label>
                                    <Popover>
                                      <PopoverTrigger asChild><Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">{editStartDate ? format(editStartDate, 'd MMM', { locale: el }) : 'Επιλογή'}</Button></PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editStartDate} onSelect={setEditStartDate} initialFocus /></PopoverContent>
                                    </Popover>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Λήξη</label>
                                    <Popover>
                                      <PopoverTrigger asChild><Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">{editEndDate ? format(editEndDate, 'd MMM', { locale: el }) : 'Επιλογή'}</Button></PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editEndDate} onSelect={setEditEndDate} initialFocus /></PopoverContent>
                                    </Popover>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingProject(null)}>Ακύρωση</Button>
                                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>Αποθήκευση</Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
