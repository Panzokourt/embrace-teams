import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface IntakeWorkflow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  auto_create_project: boolean;
  project_template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  published_version: number;
  is_draft: boolean;
  stages?: IntakeWorkflowStage[];
}

export interface IntakeWorkflowStage {
  id: string;
  workflow_id: string;
  name: string;
  sort_order: number;
  stage_type: string;
  required_fields: string[];
  approver_role: string | null;
  approver_user_id: string | null;
  sla_hours: number | null;
  notify_on_enter: boolean;
  auto_advance: boolean;
  position_x: number;
  position_y: number;
  on_enter_actions: unknown[];
  on_exit_actions: unknown[];
  created_at: string;
  // Extended fields
  responsible_roles: string[];
  min_approvals: number;
  sla_unit: string;
  sla_reason: string | null;
  field_set_type: string | null;
  custom_fields: unknown[];
  notification_config: Record<string, unknown>;
  linked_template_id: string | null;
}

export interface IntakeWorkflowConnection {
  id: string;
  workflow_id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  label: string | null;
  condition: Record<string, unknown>;
  sort_order: number;
  created_at: string;
}

export interface IntakeRequest {
  id: string;
  workflow_id: string;
  company_id: string;
  title: string;
  description: string | null;
  form_data: Record<string, unknown>;
  current_stage_id: string | null;
  status: string;
  requested_by: string;
  client_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeRequestHistory {
  id: string;
  request_id: string;
  stage_id: string | null;
  action: string;
  actor_id: string;
  comment: string | null;
  created_at: string;
}

// ─── Workflows Hook ───
export function useIntakeWorkflows() {
  const { company, user } = useAuth();
  const companyId = company?.id;
  const [workflows, setWorkflows] = useState<IntakeWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('intake_workflows')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' });
    else setWorkflows((data as unknown as IntakeWorkflow[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const createWorkflow = async (name: string, description?: string) => {
    if (!companyId || !user) return null;
    const { data, error } = await supabase
      .from('intake_workflows')
      .insert({ company_id: companyId, name, description: description || null, created_by: user.id } as any)
      .select().single();
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return null; }
    await fetchWorkflows();
    return data as unknown as IntakeWorkflow;
  };

  const updateWorkflow = async (id: string, updates: Partial<IntakeWorkflow>) => {
    const { error } = await supabase.from('intake_workflows').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return false; }
    await fetchWorkflows();
    return true;
  };

  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase.from('intake_workflows').delete().eq('id', id);
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return false; }
    await fetchWorkflows();
    return true;
  };

  return { workflows, loading, fetchWorkflows, createWorkflow, updateWorkflow, deleteWorkflow };
}

// ─── Stages Hook ───
export function useWorkflowStages(workflowId: string | null) {
  const [stages, setStages] = useState<IntakeWorkflowStage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStages = useCallback(async () => {
    if (!workflowId) { setStages([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('intake_workflow_stages')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('sort_order', { ascending: true });
    if (!error) setStages((data as unknown as IntakeWorkflowStage[]) || []);
    setLoading(false);
  }, [workflowId]);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const addStage = async (stage: Partial<IntakeWorkflowStage>) => {
    if (!workflowId) return null;
    const { data, error } = await supabase
      .from('intake_workflow_stages')
      .insert({ ...stage, workflow_id: workflowId } as any)
      .select().single();
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return null; }
    await fetchStages();
    return data as unknown as IntakeWorkflowStage;
  };

  const updateStage = async (id: string, updates: Partial<IntakeWorkflowStage>) => {
    const { error } = await supabase.from('intake_workflow_stages').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return false; }
    await fetchStages();
    return true;
  };

  const deleteStage = async (id: string) => {
    const { error } = await supabase.from('intake_workflow_stages').delete().eq('id', id);
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return false; }
    await fetchStages();
    return true;
  };

  const reorderStages = async (reordered: IntakeWorkflowStage[]) => {
    const updates = reordered.map((s, i) =>
      supabase.from('intake_workflow_stages').update({ sort_order: i } as any).eq('id', s.id)
    );
    await Promise.all(updates);
    await fetchStages();
  };

  return { stages, loading, fetchStages, addStage, updateStage, deleteStage, reorderStages };
}

// ─── Connections Hook ───
export function useWorkflowConnections(workflowId: string | null) {
  const [connections, setConnections] = useState<IntakeWorkflowConnection[]>([]);

  const fetchConnections = useCallback(async () => {
    if (!workflowId) { setConnections([]); return; }
    const { data } = await supabase
      .from('intake_workflow_connections')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('sort_order', { ascending: true });
    setConnections((data as unknown as IntakeWorkflowConnection[]) || []);
  }, [workflowId]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const addConnection = async (conn: Partial<IntakeWorkflowConnection>) => {
    if (!workflowId) return null;
    const { data, error } = await supabase
      .from('intake_workflow_connections')
      .insert({ ...conn, workflow_id: workflowId } as any)
      .select().single();
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return null; }
    await fetchConnections();
    return data as unknown as IntakeWorkflowConnection;
  };

  const updateConnection = async (id: string, updates: Partial<IntakeWorkflowConnection>) => {
    const { error } = await supabase.from('intake_workflow_connections').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return false; }
    await fetchConnections();
    return true;
  };

  const deleteConnection = async (id: string) => {
    const { error } = await supabase.from('intake_workflow_connections').delete().eq('id', id);
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return false; }
    await fetchConnections();
    return true;
  };

  return { connections, fetchConnections, addConnection, updateConnection, deleteConnection };
}

// ─── Requests Hook ───
export function useIntakeRequests() {
  const { company, user } = useAuth();
  const companyId = company?.id;
  const [requests, setRequests] = useState<IntakeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('intake_requests')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (!error) setRequests((data as unknown as IntakeRequest[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const createRequest = async (req: Partial<IntakeRequest>) => {
    if (!companyId || !user) return null;
    const { data, error } = await supabase
      .from('intake_requests')
      .insert({ ...req, company_id: companyId, requested_by: user.id } as any)
      .select().single();
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return null; }
    await fetchRequests();
    return data as unknown as IntakeRequest;
  };

  const updateRequest = async (id: string, updates: Partial<IntakeRequest>) => {
    const { error } = await supabase.from('intake_requests').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return false; }
    await fetchRequests();
    return true;
  };

  const addHistory = async (entry: Partial<IntakeRequestHistory>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('intake_request_history')
      .insert({ ...entry, actor_id: user.id } as any)
      .select().single();
    if (error) { toast({ title: 'Σφάλμα', description: error.message, variant: 'destructive' }); return null; }
    return data as unknown as IntakeRequestHistory;
  };

  const fetchHistory = async (requestId: string) => {
    const { data } = await supabase
      .from('intake_request_history')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    return (data as unknown as IntakeRequestHistory[]) || [];
  };

  return { requests, loading, fetchRequests, createRequest, updateRequest, addHistory, fetchHistory };
}
