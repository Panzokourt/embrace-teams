import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServiceRoleCost {
  id: string;
  service_id: string;
  company_id: string;
  role_title: string;
  level: string | null;
  department_id: string | null;
  estimated_hours: number;
  hourly_cost: number;
  cost_source: string;
  employee_id: string | null;
  total_cost: number;
  created_at: string;
}

export interface RoleDefaultCost {
  id: string;
  company_id: string;
  role_title: string;
  level: string | null;
  hourly_cost: number;
  created_at: string;
}

export interface EmployeeCostOverride {
  id: string;
  company_id: string;
  employee_id: string;
  hourly_cost: number;
  effective_from: string;
  created_at: string;
}

export interface ServiceWithCosts {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  department_id: string | null;
  pricing_model: string;
  pricing_unit: string;
  list_price: number;
  internal_cost: number | null;
  external_cost: number | null;
  target_margin: number | null;
  deliverables: string[] | null;
  notes: string | null;
  estimated_turnaround: string | null;
  is_active: boolean;
  archived_at: string | null;
  sort_order: number;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  role_costs?: ServiceRoleCost[];
  labor_cost?: number;
  total_cost?: number;
  margin_eur?: number;
  margin_pct?: number;
}

export function useServices() {
  const { company } = useAuth();
  const [services, setServices] = useState<ServiceWithCosts[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    
    const { data: svcData, error: svcErr } = await supabase
      .from('services')
      .select('*')
      .eq('company_id', company.id)
      .order('sort_order');
    
    if (svcErr) { toast.error('Σφάλμα φόρτωσης υπηρεσιών'); setLoading(false); return; }
    
    const { data: costsData } = await supabase
      .from('service_role_costs' as any)
      .select('*')
      .eq('company_id', company.id);
    
    const costs = (costsData || []) as unknown as ServiceRoleCost[];
    
    const enriched = (svcData || []).map((s: any) => {
      const roleCosts = costs.filter(c => c.service_id === s.id);
      const laborCost = roleCosts.reduce((sum, c) => sum + (c.total_cost || 0), 0);
      const externalCost = s.external_cost || 0;
      const totalCost = laborCost + externalCost;
      const marginEur = s.list_price - totalCost;
      const marginPct = s.list_price > 0 ? (marginEur / s.list_price) * 100 : 0;
      
      return {
        ...s,
        role_costs: roleCosts,
        labor_cost: laborCost,
        total_cost: totalCost,
        margin_eur: marginEur,
        margin_pct: marginPct,
      } as ServiceWithCosts;
    });
    
    setServices(enriched);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  return { services, loading, refetch: fetchServices };
}

export function useRoleCosts(serviceId?: string) {
  const { company } = useAuth();
  const [roleCosts, setRoleCosts] = useState<ServiceRoleCost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoleCosts = useCallback(async () => {
    if (!company?.id || !serviceId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('service_role_costs' as any)
      .select('*')
      .eq('service_id', serviceId)
      .eq('company_id', company.id);
    if (!error) setRoleCosts((data || []) as unknown as ServiceRoleCost[]);
    setLoading(false);
  }, [company?.id, serviceId]);

  useEffect(() => { fetchRoleCosts(); }, [fetchRoleCosts]);

  return { roleCosts, loading, refetch: fetchRoleCosts };
}

export function useRoleDefaults() {
  const { company } = useAuth();
  const [defaults, setDefaults] = useState<RoleDefaultCost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDefaults = useCallback(async () => {
    if (!company?.id) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('role_default_costs' as any)
      .select('*')
      .eq('company_id', company.id)
      .order('role_title');
    if (!error) setDefaults((data || []) as unknown as RoleDefaultCost[]);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchDefaults(); }, [fetchDefaults]);

  return { defaults, loading, refetch: fetchDefaults };
}

export function useEmployeeOverrides() {
  const { company } = useAuth();
  const [overrides, setOverrides] = useState<EmployeeCostOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverrides = useCallback(async () => {
    if (!company?.id) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('employee_cost_overrides' as any)
      .select('*')
      .eq('company_id', company.id)
      .order('created_at');
    if (!error) setOverrides((data || []) as unknown as EmployeeCostOverride[]);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  return { overrides, loading, refetch: fetchOverrides };
}

export async function resolveHourlyCost(
  companyId: string,
  roleTitle: string,
  level: string | null,
  employeeId: string | null
): Promise<{ cost: number; source: string }> {
  // Priority 1: Employee override
  if (employeeId) {
    const { data } = await supabase
      .from('employee_cost_overrides' as any)
      .select('hourly_cost')
      .eq('company_id', companyId)
      .eq('employee_id', employeeId)
      .maybeSingle();
    if (data) return { cost: (data as any).hourly_cost, source: 'employee' };
  }
  
  // Priority 2: Role default
  let query = supabase
    .from('role_default_costs' as any)
    .select('hourly_cost')
    .eq('company_id', companyId)
    .eq('role_title', roleTitle);
  
  if (level) query = query.eq('level', level);
  else query = query.is('level', null);
  
  const { data: roleData } = await query.maybeSingle();
  if (roleData) return { cost: (roleData as any).hourly_cost, source: 'role_default' };
  
  // Priority 3: Manual
  return { cost: 0, source: 'manual' };
}
