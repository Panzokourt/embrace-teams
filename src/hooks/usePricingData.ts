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

export interface ServicePackage {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  list_price: number;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  duration_type: string;
  duration_value: number;
  // Computed
  items?: PackageItem[];
  internal_cost?: number;
  final_price?: number;
  margin_eur?: number;
  margin_pct?: number;
}

export interface PackageItem {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  duration_months: number;
  unit_price: number;
  sort_order: number;
  // Joined
  service_name?: string;
  service_cost?: number;
}

export interface Proposal {
  id: string;
  company_id: string;
  client_id: string | null;
  name: string;
  status: string;
  version: number;
  notes: string | null;
  assumptions: string | null;
  discount_percent: number;
  valid_until: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client_name?: string;
  creator_name?: string;
  // Computed
  items?: ProposalItem[];
  total_revenue?: number;
  total_cost?: number;
  margin_eur?: number;
  margin_pct?: number;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  service_id: string | null;
  package_id: string | null;
  item_type: string;
  custom_name: string | null;
  custom_description: string | null;
  quantity: number;
  duration_months: number;
  unit_price: number;
  unit_cost: number;
  discount_percent: number;
  sort_order: number;
  // Joined
  display_name?: string;
}

export interface ProposalSnapshot {
  id: string;
  proposal_id: string;
  version: number;
  snapshot_data: any;
  created_at: string;
  created_by: string | null;
}

export function usePackages() {
  const { company } = useAuth();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data: pkgData } = await supabase
      .from('service_packages' as any)
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    const { data: itemsData } = await supabase
      .from('package_items' as any)
      .select('*')
      .in('package_id', (pkgData || []).map((p: any) => p.id));

    // Get services for cost lookup
    const { data: svcData } = await supabase
      .from('services')
      .select('id, name, list_price')
      .eq('company_id', company.id);

    const { data: costsData } = await supabase
      .from('service_role_costs' as any)
      .select('service_id, total_cost')
      .eq('company_id', company.id);

    const svcMap = new Map((svcData || []).map((s: any) => [s.id, s]));
    const costsByService = new Map<string, number>();
    ((costsData || []) as any[]).forEach(c => {
      costsByService.set(c.service_id, (costsByService.get(c.service_id) || 0) + (c.total_cost || 0));
    });

    const enriched = ((pkgData || []) as any[]).map(pkg => {
      const items = ((itemsData || []) as any[])
        .filter(i => i.package_id === pkg.id)
        .map(i => ({
          ...i,
          service_name: svcMap.get(i.service_id)?.name || 'Άγνωστη',
          service_cost: (costsByService.get(i.service_id) || 0) + ((svcMap.get(i.service_id) as any)?.external_cost || 0),
        }));

      const internalCost = items.reduce((s: number, i: any) => s + (i.service_cost || 0) * i.quantity * i.duration_months, 0);
      const finalPrice = pkg.list_price * (1 - (pkg.discount_percent || 0) / 100);
      const marginEur = finalPrice - internalCost;
      const marginPct = finalPrice > 0 ? (marginEur / finalPrice) * 100 : 0;

      return {
        ...pkg,
        items,
        internal_cost: internalCost,
        final_price: finalPrice,
        margin_eur: marginEur,
        margin_pct: marginPct,
      } as ServicePackage;
    });

    setPackages(enriched);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);
  return { packages, loading, refetch: fetchPackages };
}

export function useProposals() {
  const { company } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data: propData } = await supabase
      .from('proposals' as any)
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    // Get client names
    const clientIds = [...new Set(((propData || []) as any[]).map(p => p.client_id).filter(Boolean))];
    const { data: clientsData } = clientIds.length > 0
      ? await supabase.from('clients').select('id, name').in('id', clientIds)
      : { data: [] };
    const clientMap = new Map((clientsData || []).map((c: any) => [c.id, c.name]));

    // Get creator names
    const creatorIds = [...new Set(((propData || []) as any[]).map(p => p.created_by).filter(Boolean))];
    const { data: profilesData } = creatorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', creatorIds)
      : { data: [] };
    const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p.full_name]));

    // Get proposal items
    const propIds = ((propData || []) as any[]).map(p => p.id);
    const { data: itemsData } = propIds.length > 0
      ? await supabase.from('proposal_items' as any).select('*').in('proposal_id', propIds)
      : { data: [] };

    const enriched = ((propData || []) as any[]).map(p => {
      const items = ((itemsData || []) as any[]).filter(i => i.proposal_id === p.id);
      const totalRevenue = items.reduce((s: number, i: any) => {
        const linePrice = i.unit_price * i.quantity * i.duration_months * (1 - (i.discount_percent || 0) / 100);
        return s + linePrice;
      }, 0) * (1 - (p.discount_percent || 0) / 100);
      const totalCost = items.reduce((s: number, i: any) => s + i.unit_cost * i.quantity * i.duration_months, 0);
      const marginEur = totalRevenue - totalCost;
      const marginPct = totalRevenue > 0 ? (marginEur / totalRevenue) * 100 : 0;

      return {
        ...p,
        client_name: clientMap.get(p.client_id) || null,
        creator_name: profileMap.get(p.created_by) || null,
        items,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        margin_eur: marginEur,
        margin_pct: marginPct,
      } as Proposal;
    });

    setProposals(enriched);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);
  return { proposals, loading, refetch: fetchProposals };
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
