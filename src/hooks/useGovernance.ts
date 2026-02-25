import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Helper to bypass strict typing for new tables not yet in generated types
const db = supabase as any;

// ─── Types ───

export interface GovPlatform {
  id: string;
  company_id: string;
  name: string;
  category: string;
  icon_name: string | null;
  created_at: string;
}

export interface GovAsset {
  id: string;
  company_id: string;
  client_id: string | null;
  platform_id: string;
  asset_type: string;
  asset_name: string;
  asset_external_id: string | null;
  url: string | null;
  status: string;
  owner_entity: string | null;
  billing_owner: string | null;
  created_by_person: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  platform?: GovPlatform;
  client?: { id: string; name: string } | null;
  security_controls?: GovSecurityControl | null;
}

export interface GovAccessRole {
  id: string;
  company_id: string;
  platform_id: string;
  role_name: string;
  permissions_description: string | null;
}

export interface GovAccessGrant {
  id: string;
  company_id: string;
  asset_id: string;
  person_name: string;
  person_email: string | null;
  person_type: string;
  role_id: string | null;
  role_name_override: string | null;
  granted_on: string | null;
  granted_by: string | null;
  removal_date: string | null;
  status: string;
  last_review_date: string | null;
  review_cycle_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  asset?: GovAsset;
  role?: GovAccessRole | null;
}

export interface GovSecurityControl {
  id: string;
  company_id: string;
  asset_id: string;
  mfa_enabled: boolean;
  mfa_method: string;
  backup_admin_present: boolean;
  personal_login_used: boolean;
  recovery_email: string | null;
  recovery_phone: string | null;
  last_password_change_date: string | null;
  password_rotation_policy: string;
  risk_level: string;
  risk_score: number;
  created_at: string;
  updated_at: string;
}

export interface GovVaultReference {
  id: string;
  company_id: string;
  asset_id: string;
  vault_provider: string;
  vault_location: string | null;
  vault_entry_name: string | null;
  last_verified_date: string | null;
  created_at: string;
}

export interface GovAuditEvent {
  id: string;
  company_id: string;
  client_id: string | null;
  asset_id: string | null;
  actor_name: string;
  event_type: string;
  before_state: any;
  after_state: any;
  notes: string | null;
  created_at: string;
}

export interface GovReviewTask {
  id: string;
  company_id: string;
  asset_id: string;
  due_date: string;
  status: string;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  asset?: GovAsset;
}

export interface GovChecklist {
  id: string;
  company_id: string;
  template_type: string;
  title: string;
  items: any[];
  created_at: string;
  updated_at: string;
}

// ─── Risk calculation ───

export function calculateRisk(controls: Partial<GovSecurityControl>): { risk_level: string; risk_score: number } {
  let score = 1;
  if (controls.personal_login_used) return { risk_level: 'high', risk_score: 5 };
  if (!controls.mfa_enabled) score = Math.max(score, 4);
  if (!controls.backup_admin_present) score = Math.max(score, 3);
  const level = score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low';
  return { risk_level: level, risk_score: score };
}

// ─── Default platforms ───

const DEFAULT_PLATFORMS = [
  { name: 'Meta (Facebook)', category: 'social' },
  { name: 'Google', category: 'ads' },
  { name: 'LinkedIn', category: 'social' },
  { name: 'TikTok', category: 'social' },
  { name: 'X (Twitter)', category: 'social' },
  { name: 'YouTube', category: 'social' },
  { name: 'Mailchimp', category: 'crm' },
  { name: 'WordPress', category: 'cms' },
  { name: 'Shopify', category: 'cms' },
  { name: 'Cloudflare', category: 'infrastructure' },
  { name: 'GoDaddy', category: 'infrastructure' },
  { name: 'Papaki', category: 'infrastructure' },
];

// ─── Hook ───

export function useGovernance() {
  const { companyRole } = useAuth();
  const companyId = companyRole?.company_id;
  const qc = useQueryClient();

  // Platforms
  const platformsQuery = useQuery({
    queryKey: ['gov_platforms', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_platforms').select('*').eq('company_id', companyId).order('name');
      if (error) throw error;
      return (data || []) as GovPlatform[];
    },
    enabled: !!companyId,
  });

  const seedPlatforms = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company');
      const rows = DEFAULT_PLATFORMS.map(p => ({ ...p, company_id: companyId }));
      const { error } = await db.from('gov_platforms').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gov_platforms'] }); toast.success('Default platforms created'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Assets
  const assetsQuery = useQuery({
    queryKey: ['gov_assets', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_assets').select('*, gov_platforms(*), clients(id, name), gov_security_controls(*)').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d, platform: d.gov_platforms, client: d.clients,
        security_controls: Array.isArray(d.gov_security_controls) ? d.gov_security_controls[0] || null : d.gov_security_controls || null,
      })) as GovAsset[];
    },
    enabled: !!companyId,
  });

  const upsertAsset = useMutation({
    mutationFn: async (asset: Partial<GovAsset> & { company_id: string }) => {
      if (asset.id) {
        const { error } = await db.from('gov_assets').update(asset).eq('id', asset.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('gov_assets').insert(asset);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gov_assets'] }); toast.success('Asset saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Access Grants
  const grantsQuery = useQuery({
    queryKey: ['gov_access_grants', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_access_grants').select('*, gov_assets(id, asset_name, asset_type, platform_id, client_id, gov_platforms(name)), gov_access_roles(role_name)').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d, asset: d.gov_assets ? { ...d.gov_assets, platform: d.gov_assets.gov_platforms } : undefined, role: d.gov_access_roles,
      })) as GovAccessGrant[];
    },
    enabled: !!companyId,
  });

  const upsertGrant = useMutation({
    mutationFn: async (grant: Partial<GovAccessGrant> & { company_id: string }) => {
      if (grant.id) {
        const { error } = await db.from('gov_access_grants').update(grant).eq('id', grant.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('gov_access_grants').insert(grant);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gov_access_grants'] }); toast.success('Access grant saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Security Controls
  const upsertSecurityControls = useMutation({
    mutationFn: async (controls: Partial<GovSecurityControl> & { company_id: string; asset_id: string }) => {
      const risk = calculateRisk(controls);
      const payload = { ...controls, ...risk, updated_at: new Date().toISOString() };
      const { data: existing } = await db.from('gov_security_controls').select('id').eq('asset_id', controls.asset_id).maybeSingle();
      if (existing) {
        const { error } = await db.from('gov_security_controls').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('gov_security_controls').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gov_assets'] }); toast.success('Security controls updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Vault References
  const vaultQuery = useQuery({
    queryKey: ['gov_vault_references', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_vault_references').select('*, gov_assets(id, asset_name, asset_type, gov_platforms(name))').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as (GovVaultReference & { gov_assets?: any })[];
    },
    enabled: !!companyId,
  });

  const upsertVault = useMutation({
    mutationFn: async (ref: Partial<GovVaultReference> & { company_id: string }) => {
      if (ref.id) {
        const { error } = await db.from('gov_vault_references').update(ref).eq('id', ref.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('gov_vault_references').insert(ref);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gov_vault_references'] }); toast.success('Vault reference saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Audit Events
  const auditQuery = useQuery({
    queryKey: ['gov_audit_events', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_audit_events').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as GovAuditEvent[];
    },
    enabled: !!companyId,
  });

  const createAuditEvent = useMutation({
    mutationFn: async (event: Partial<GovAuditEvent> & { company_id: string; actor_name: string; event_type: string }) => {
      const { error } = await db.from('gov_audit_events').insert(event);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gov_audit_events'] }),
  });

  // Review Tasks
  const reviewTasksQuery = useQuery({
    queryKey: ['gov_review_tasks', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_review_tasks').select('*, gov_assets(id, asset_name, asset_type, gov_platforms(name))').eq('company_id', companyId).order('due_date');
      if (error) throw error;
      return (data || []).map((d: any) => ({ ...d, asset: d.gov_assets ? { ...d.gov_assets, platform: d.gov_assets.gov_platforms } : undefined })) as GovReviewTask[];
    },
    enabled: !!companyId,
  });

  // Checklists
  const checklistsQuery = useQuery({
    queryKey: ['gov_checklists', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_checklists').select('*').eq('company_id', companyId).order('created_at');
      if (error) throw error;
      return (data || []) as GovChecklist[];
    },
    enabled: !!companyId,
  });

  // Access Roles
  const rolesQuery = useQuery({
    queryKey: ['gov_access_roles', companyId],
    queryFn: async () => {
      const { data, error } = await db.from('gov_access_roles').select('*').eq('company_id', companyId).order('role_name');
      if (error) throw error;
      return (data || []) as GovAccessRole[];
    },
    enabled: !!companyId,
  });

  return {
    companyId,
    platforms: platformsQuery.data || [],
    platformsLoading: platformsQuery.isLoading,
    seedPlatforms,
    assets: assetsQuery.data || [],
    assetsLoading: assetsQuery.isLoading,
    upsertAsset,
    grants: grantsQuery.data || [],
    grantsLoading: grantsQuery.isLoading,
    upsertGrant,
    upsertSecurityControls,
    vaultRefs: vaultQuery.data || [],
    vaultLoading: vaultQuery.isLoading,
    upsertVault,
    auditEvents: auditQuery.data || [],
    auditLoading: auditQuery.isLoading,
    createAuditEvent,
    reviewTasks: reviewTasksQuery.data || [],
    reviewTasksLoading: reviewTasksQuery.isLoading,
    checklists: checklistsQuery.data || [],
    checklistsLoading: checklistsQuery.isLoading,
    roles: rolesQuery.data || [],
    rolesLoading: rolesQuery.isLoading,
  };
}
