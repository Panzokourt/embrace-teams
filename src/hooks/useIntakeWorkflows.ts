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

export function useIntakeWorkflows() {
  const { companyId, user } = useAuth();
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

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setWorkflows((data as unknown as IntakeWorkflow[]) || []);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const createWorkflow = async (name: string, description?: string) => {
    if (!companyId || !user) return null;
    const { data, error } = await supabase
      .from('intake_workflows')
      .insert({ company_id: companyId, name, description: description || null, created_by: user.id } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    await fetchWorkflows();
    return data as unknown as IntakeWorkflow;
  };

  const updateWorkflow = async (id: string, updates: Partial<IntakeWorkflow>) => {
    const { error } = await supabase
      .from('intake_workflows')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchWorkflows();
    return true;
  };

  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase
      .from('intake_workflows')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchWorkflows();
    return true;
  };

  return { workflows, loading, fetchWorkflows, createWorkflow, updateWorkflow, deleteWorkflow };
}

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
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    await fetchStages();
    return data as unknown as IntakeWorkflowStage;
  };

  const updateStage = async (id: string, updates: Partial<IntakeWorkflowStage>) => {
    const { error } = await supabase
      .from('intake_workflow_stages')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchStages();
    return true;
  };

  const deleteStage = async (id: string) => {
    const { error } = await supabase
      .from('intake_workflow_stages')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
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

export function useIntakeRequests() {
  const { companyId, user } = useAuth();
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
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    await fetchRequests();
    return data as unknown as IntakeRequest;
  };

  const updateRequest = async (id: string, updates: Partial<IntakeRequest>) => {
    const { error } = await supabase
      .from('intake_requests')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchRequests();
    return true;
  };

  const addHistory = async (entry: Partial<IntakeRequestHistory>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('intake_request_history')
      .insert({ ...entry, actor_id: user.id } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
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
