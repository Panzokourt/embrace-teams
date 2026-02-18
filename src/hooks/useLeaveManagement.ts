import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaveType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  color: string;
  default_days: number;
  requires_approval: boolean;
  is_active: boolean;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  leave_type?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  company_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
  user?: { full_name: string | null; email: string; avatar_url: string | null };
  reviewer?: { full_name: string | null } | null;
}

export function useLeaveManagement(targetUserId?: string) {
  const { user, company, isAdmin, isManager } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const userId = targetUserId || user?.id;

  const fetchLeaveTypes = useCallback(async () => {
    const { data } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setLeaveTypes((data || []) as LeaveType[]);
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', currentYear);
    setBalances((data || []) as LeaveBalance[]);
  }, [userId, currentYear]);

  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    const query = supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // If viewing a specific user, filter by user
    if (targetUserId) {
      query.eq('user_id', targetUserId);
    } else if (!isAdmin && !isManager) {
      query.eq('user_id', userId);
    }

    const { data } = await query;
    setRequests((data || []) as LeaveRequest[]);
  }, [userId, targetUserId, isAdmin, isManager]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!isAdmin && !isManager) return;
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    // Enrich with user info
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      const enriched = data.map(r => ({
        ...r,
        user: profileMap.get(r.user_id)
      }));
      setPendingApprovals(enriched as LeaveRequest[]);
    } else {
      setPendingApprovals([]);
    }
  }, [isAdmin, isManager]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchLeaveTypes(), fetchBalances(), fetchRequests(), fetchPendingApprovals()]);
    setLoading(false);
  }, [fetchLeaveTypes, fetchBalances, fetchRequests, fetchPendingApprovals]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createRequest = useCallback(async (data: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_count: number;
    half_day: boolean;
    reason?: string;
  }) => {
    if (!user || !company) return;
    
    const { error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: user.id,
        company_id: company.id,
        leave_type_id: data.leave_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        days_count: data.days_count,
        half_day: data.half_day,
        reason: data.reason || null,
        status: 'pending',
      });

    if (error) {
      toast.error('Σφάλμα κατά τη δημιουργία αίτησης');
      console.error(error);
      return;
    }

    // Update pending_days in balance
    const balance = balances.find(b => b.leave_type_id === data.leave_type_id && b.year === currentYear);
    if (balance) {
      await supabase
        .from('leave_balances')
        .update({ pending_days: balance.pending_days + data.days_count })
        .eq('id', balance.id);
    } else {
      // Create balance entry
      const lt = leaveTypes.find(t => t.id === data.leave_type_id);
      await supabase.from('leave_balances').insert({
        user_id: user.id,
        company_id: company.id,
        leave_type_id: data.leave_type_id,
        year: currentYear,
        entitled_days: lt?.default_days || 0,
        pending_days: data.days_count,
      });
    }

    toast.success('Η αίτηση υποβλήθηκε');
    fetchAll();
  }, [user, company, balances, leaveTypes, currentYear, fetchAll]);

  const approveRequest = useCallback(async (requestId: string, notes?: string) => {
    if (!user) return;
    const request = [...requests, ...pendingApprovals].find(r => r.id === requestId);
    if (!request) return;

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes || null,
      })
      .eq('id', requestId);

    if (error) {
      toast.error('Σφάλμα κατά την έγκριση');
      return;
    }

    // Update balance: move from pending to used
    const { data: balanceData } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', request.user_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', currentYear)
      .single();

    if (balanceData) {
      await supabase
        .from('leave_balances')
        .update({
          pending_days: Math.max(0, balanceData.pending_days - request.days_count),
          used_days: balanceData.used_days + request.days_count,
        })
        .eq('id', balanceData.id);
    }

    toast.success('Η αίτηση εγκρίθηκε');
    fetchAll();
  }, [user, requests, pendingApprovals, currentYear, fetchAll]);

  const rejectRequest = useCallback(async (requestId: string, notes?: string) => {
    if (!user) return;
    const request = [...requests, ...pendingApprovals].find(r => r.id === requestId);
    if (!request) return;

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes || null,
      })
      .eq('id', requestId);

    if (error) {
      toast.error('Σφάλμα κατά την απόρριψη');
      return;
    }

    // Remove from pending
    const { data: balanceData } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', request.user_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', currentYear)
      .single();

    if (balanceData) {
      await supabase
        .from('leave_balances')
        .update({
          pending_days: Math.max(0, balanceData.pending_days - request.days_count),
        })
        .eq('id', balanceData.id);
    }

    toast.success('Η αίτηση απορρίφθηκε');
    fetchAll();
  }, [user, requests, pendingApprovals, currentYear, fetchAll]);

  const cancelRequest = useCallback(async (requestId: string) => {
    if (!user) return;
    const request = requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return;

    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    if (error) {
      toast.error('Σφάλμα κατά την ακύρωση');
      return;
    }

    // Remove from pending
    const { data: balanceData } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', request.user_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', currentYear)
      .single();

    if (balanceData) {
      await supabase
        .from('leave_balances')
        .update({
          pending_days: Math.max(0, balanceData.pending_days - request.days_count),
        })
        .eq('id', balanceData.id);
    }

    toast.success('Η αίτηση ακυρώθηκε');
    fetchAll();
  }, [user, requests, currentYear, fetchAll]);

  // Enrich balances with leave type info
  const enrichedBalances = balances.map(b => ({
    ...b,
    leave_type: leaveTypes.find(t => t.id === b.leave_type_id),
  }));

  // Enrich requests with leave type info
  const enrichedRequests = requests.map(r => ({
    ...r,
    leave_type: leaveTypes.find(t => t.id === r.leave_type_id),
  }));

  return {
    leaveTypes,
    balances: enrichedBalances,
    requests: enrichedRequests,
    pendingApprovals,
    loading,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    refresh: fetchAll,
  };
}
