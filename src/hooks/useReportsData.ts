import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export type PeriodFilter = '3m' | '6m' | '12m' | 'all';

export interface ReportsFilters {
  period: PeriodFilter;
  clientId: string | null;
  projectId: string | null;
}

export interface ReportsData {
  projects: any[];
  invoices: any[];
  expenses: any[];
  tasks: any[];
  clients: any[];
  timeEntries: any[];
  profiles: any[];
  loading: boolean;
}

export function useReportsData(filters: ReportsFilters): ReportsData {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchAll = async () => {
      setLoading(true);
      const [projRes, invRes, expRes, taskRes, clientRes, timeRes, profRes] = await Promise.all([
        supabase.from('projects').select('*, clients(id, name)'),
        supabase.from('invoices').select('*, clients(id, name), projects(id, name)'),
        supabase.from('expenses').select('*, projects(id, name)'),
        supabase.from('tasks').select('*, projects(id, name)'),
        supabase.from('clients').select('*'),
        supabase.from('time_entries').select('*') as any,
        supabase.from('profiles').select('id, full_name, email, department, job_title'),
      ]);

      setProjects(projRes.data || []);
      setInvoices(invRes.data || []);
      setExpenses(expRes.data || []);
      setTasks(taskRes.data || []);
      setClients(clientRes.data || []);
      setTimeEntries(timeRes.data || []);
      setProfiles(profRes.data || []);
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const dateRange = useMemo(() => {
    if (filters.period === 'all') return null;
    const months = filters.period === '3m' ? 3 : filters.period === '6m' ? 6 : 12;
    const start = startOfMonth(subMonths(new Date(), months));
    const end = endOfMonth(new Date());
    return { start, end };
  }, [filters.period]);

  const inRange = (dateStr: string | null) => {
    if (!dateStr || !dateRange) return !dateRange;
    try {
      const d = parseISO(dateStr);
      return isWithinInterval(d, { start: dateRange.start, end: dateRange.end });
    } catch { return false; }
  };

  const filtered = useMemo(() => {
    const fp = projects.filter(p => {
      if (filters.clientId && p.client_id !== filters.clientId) return false;
      if (filters.projectId && p.id !== filters.projectId) return false;
      return inRange(p.created_at);
    });
    const projIds = new Set(fp.map(p => p.id));

    const fi = invoices.filter(i => {
      if (filters.clientId && i.client_id !== filters.clientId) return false;
      if (filters.projectId && i.project_id !== filters.projectId) return false;
      return inRange(i.issued_date);
    });

    const fe = expenses.filter(e => {
      if (filters.projectId && e.project_id !== filters.projectId) return false;
      if (filters.clientId) {
        const proj = projects.find(p => p.id === e.project_id);
        if (!proj || proj.client_id !== filters.clientId) return false;
      }
      return inRange(e.expense_date);
    });

    const ft = tasks.filter(t => {
      if (filters.projectId && t.project_id !== filters.projectId) return false;
      if (filters.clientId) {
        const proj = projects.find(p => p.id === t.project_id);
        if (!proj || proj.client_id !== filters.clientId) return false;
      }
      return inRange(t.created_at);
    });

    const fte = timeEntries.filter((te: any) => {
      if (filters.projectId && te.project_id !== filters.projectId) return false;
      return inRange(te.start_time);
    });

    return {
      projects: fp,
      invoices: fi,
      expenses: fe,
      tasks: ft,
      timeEntries: fte,
      clients,
      profiles,
    };
  }, [projects, invoices, expenses, tasks, timeEntries, clients, profiles, filters, dateRange]);

  return { ...filtered, loading };
}
