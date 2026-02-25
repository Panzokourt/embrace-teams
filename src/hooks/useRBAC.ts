import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, CompanyRole, UserStatus, AccessScope, PermissionType } from '@/contexts/AuthContext';

export interface CompanyUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: CompanyRole;
  status: UserStatus;
  access_scope: AccessScope;
  last_login_at: string | null;
  created_at: string;
  permissions: PermissionType[];
  client_ids: string[];
  project_ids: string[];
}

export interface Invitation {
  id: string;
  email: string;
  role: CompanyRole;
  access_scope: AccessScope;
  permissions: PermissionType[];
  client_ids: string[];
  project_ids: string[];
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  invited_by: string;
  inviter_name?: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  target_user_id: string | null;
  target_user_name?: string;
  target_type: string;
  old_value: any;
  new_value: any;
  created_at: string;
}

export const ALL_PERMISSIONS: PermissionType[] = [
  'users.view', 'users.invite', 'users.edit', 'users.suspend', 'users.delete',
  'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
  'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
  'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
  'deliverables.view', 'deliverables.create', 'deliverables.edit', 'deliverables.delete', 'deliverables.approve',
  'financials.view', 'financials.create', 'financials.edit', 'financials.delete',
  'reports.view', 'reports.export',
  'tenders.view', 'tenders.create', 'tenders.edit', 'tenders.delete',
  'files.view', 'files.upload', 'files.delete',
  'comments.view', 'comments.create', 'comments.edit', 'comments.delete',
  'settings.company', 'settings.billing', 'settings.security', 'settings.integrations',
  'audit.view'
];

export const PERMISSION_CATEGORIES = {
  'Users': ['users.view', 'users.invite', 'users.edit', 'users.suspend', 'users.delete'],
  'Clients': ['clients.view', 'clients.create', 'clients.edit', 'clients.delete'],
  'Projects': ['projects.view', 'projects.create', 'projects.edit', 'projects.delete'],
  'Tasks': ['tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign'],
  'Deliverables': ['deliverables.view', 'deliverables.create', 'deliverables.edit', 'deliverables.delete', 'deliverables.approve'],
  'Financials': ['financials.view', 'financials.create', 'financials.edit', 'financials.delete'],
  'Reports': ['reports.view', 'reports.export'],
  'Tenders': ['tenders.view', 'tenders.create', 'tenders.edit', 'tenders.delete'],
  'Files': ['files.view', 'files.upload', 'files.delete'],
  'Comments': ['comments.view', 'comments.create', 'comments.edit', 'comments.delete'],
  'Settings': ['settings.company', 'settings.billing', 'settings.security', 'settings.integrations'],
  'Audit': ['audit.view']
} as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<CompanyRole, PermissionType[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter(p => !p.startsWith('settings.billing') && !p.startsWith('settings.security')),
  manager: [
    'clients.view', 'projects.view', 'projects.edit',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
    'deliverables.view', 'deliverables.create', 'deliverables.edit', 'deliverables.delete',
    'files.view', 'files.upload', 'files.delete',
    'comments.view', 'comments.create', 'comments.edit', 'comments.delete',
    'reports.view'
  ],
  member: [
    'clients.view', 'projects.view',
    'tasks.view', 'tasks.create', 'tasks.edit',
    'deliverables.view',
    'files.view', 'files.upload',
    'comments.view', 'comments.create', 'comments.edit'
  ],
  viewer: [
    'clients.view', 'projects.view', 'tasks.view', 'deliverables.view',
    'files.view', 'comments.view', 'reports.view'
  ],
  billing: [
    'settings.billing', 'financials.view', 'financials.create', 'financials.edit'
  ]
};

export function useRBAC() {
  const { company, companyRole, isSuperAdmin, isCompanyAdmin } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!company) return;
    
    try {
      // Fetch user company roles with profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch profiles for users
      const userIds = rolesData?.map(r => r.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds.length > 0 ? userIds : ['no-users']);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Fetch permissions for users
      const { data: permissionsData } = await supabase
        .from('user_permissions')
        .select('user_id, permission, granted')
        .eq('company_id', company.id)
        .eq('granted', true);

      const permissionsMap = new Map<string, PermissionType[]>();
      permissionsData?.forEach(p => {
        const existing = permissionsMap.get(p.user_id) || [];
        existing.push(p.permission as PermissionType);
        permissionsMap.set(p.user_id, existing);
      });

      // Fetch access assignments
      const { data: assignmentsData } = await supabase
        .from('user_access_assignments')
        .select('user_id, client_id, project_id')
        .eq('company_id', company.id);

      const clientAssignments = new Map<string, string[]>();
      const projectAssignments = new Map<string, string[]>();
      assignmentsData?.forEach(a => {
        if (a.client_id) {
          const existing = clientAssignments.get(a.user_id) || [];
          existing.push(a.client_id);
          clientAssignments.set(a.user_id, existing);
        }
        if (a.project_id) {
          const existing = projectAssignments.get(a.user_id) || [];
          existing.push(a.project_id);
          projectAssignments.set(a.user_id, existing);
        }
      });

      const companyUsers: CompanyUser[] = (rolesData || []).map(role => {
        const profile = profilesMap.get(role.user_id);
        return {
          id: role.id,
          user_id: role.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          role: role.role as CompanyRole,
          status: role.status as UserStatus,
          access_scope: role.access_scope as AccessScope,
          last_login_at: role.last_login_at,
          created_at: role.created_at,
          permissions: permissionsMap.get(role.user_id) || [],
          client_ids: clientAssignments.get(role.user_id) || [],
          project_ids: projectAssignments.get(role.user_id) || []
        };
      });

      setUsers(companyUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [company]);

  const fetchInvitations = useCallback(async () => {
    if (!company) return;

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch inviter names
      const inviterIds = [...new Set(data?.map(i => i.invited_by) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', inviterIds.length > 0 ? inviterIds : ['no-users']);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      setInvitations((data || []).map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role as CompanyRole,
        access_scope: inv.access_scope as AccessScope,
        permissions: (inv.permissions || []) as PermissionType[],
        client_ids: inv.client_ids || [],
        project_ids: inv.project_ids || [],
        status: inv.status as Invitation['status'],
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        invited_by: inv.invited_by,
        inviter_name: profilesMap.get(inv.invited_by) || undefined
      })));
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [company]);

  const fetchAuditLog = useCallback(async () => {
    if (!company || !isSuperAdmin) return;

    try {
      const { data, error } = await supabase
        .from('rbac_audit_log')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch actor and target names
      const userIds = [...new Set([
        ...(data?.map(l => l.actor_id) || []),
        ...(data?.filter(l => l.target_user_id).map(l => l.target_user_id!) || [])
      ])];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds.length > 0 ? userIds : ['no-users']);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      setAuditLog((data || []).map(log => ({
        id: log.id,
        actor_id: log.actor_id,
        actor_name: profilesMap.get(log.actor_id) || undefined,
        action: log.action,
        target_user_id: log.target_user_id,
        target_user_name: log.target_user_id ? profilesMap.get(log.target_user_id) || undefined : undefined,
        target_type: log.target_type,
        old_value: log.old_value,
        new_value: log.new_value,
        created_at: log.created_at
      })));
    } catch (error) {
      console.error('Error fetching audit log:', error);
    }
  }, [company, isSuperAdmin]);

  const createInvitation = async (invitation: {
    email: string;
    role: CompanyRole;
    access_scope: AccessScope;
    permissions: PermissionType[];
    client_ids: string[];
    project_ids: string[];
  }) => {
    if (!company) throw new Error('No company');

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        company_id: company.id,
        email: invitation.email,
        role: invitation.role,
        access_scope: invitation.access_scope,
        permissions: invitation.permissions,
        client_ids: invitation.client_ids,
        project_ids: invitation.project_ids,
        invited_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // Send invitation email via edge function
    try {
      await supabase.functions.invoke('send-invitation', {
        body: {
          invitation_id: data.id,
          app_url: window.location.origin,
        },
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't throw - invitation was created successfully, email is best-effort
    }

    await fetchInvitations();
    return data;
  };

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) throw error;
    await fetchInvitations();
  };

  const updateUserRole = async (userId: string, role: CompanyRole) => {
    if (!company) throw new Error('No company');

    // Prevent changing super_admin if not super_admin
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser?.role === 'owner' && !isSuperAdmin) {
      throw new Error('Cannot modify Owner');
    }

    const { error } = await supabase
      .from('user_company_roles')
      .update({ role })
      .eq('user_id', userId)
      .eq('company_id', company.id);

    if (error) throw error;

    // Log the action
    await supabase.from('rbac_audit_log').insert({
      company_id: company.id,
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'role_changed',
      target_user_id: userId,
      target_type: 'user',
      old_value: { role: targetUser?.role },
      new_value: { role }
    });

    await fetchUsers();
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    if (!company) throw new Error('No company');

    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser?.role === 'owner' && !isSuperAdmin) {
      throw new Error('Cannot modify Owner');
    }

    const { error } = await supabase
      .from('user_company_roles')
      .update({ status })
      .eq('user_id', userId)
      .eq('company_id', company.id);

    if (error) throw error;

    // Also update profile status
    await supabase
      .from('profiles')
      .update({ status } as any)
      .eq('id', userId);

    // Log the action
    await supabase.from('rbac_audit_log').insert({
      company_id: company.id,
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'status_changed',
      target_user_id: userId,
      target_type: 'user',
      old_value: { status: targetUser?.status },
      new_value: { status }
    });

    await fetchUsers();
  };

  const updateUserPermissions = async (userId: string, permissions: PermissionType[]) => {
    if (!company) throw new Error('No company');

    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser?.role === 'owner') {
      throw new Error('Cannot modify Owner permissions');
    }

    // Delete existing permissions
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', company.id);

    // Insert new permissions
    if (permissions.length > 0) {
      const { error } = await supabase
        .from('user_permissions')
        .insert(permissions.map(p => ({
          user_id: userId,
          company_id: company.id,
          permission: p,
          granted: true
        })));

      if (error) throw error;
    }

    // Log the action
    await supabase.from('rbac_audit_log').insert({
      company_id: company.id,
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'permissions_changed',
      target_user_id: userId,
      target_type: 'user',
      old_value: { permissions: targetUser?.permissions },
      new_value: { permissions }
    });

    await fetchUsers();
  };

  const updateUserAccessScope = async (userId: string, accessScope: AccessScope, clientIds: string[], projectIds: string[]) => {
    if (!company) throw new Error('No company');

    // Update access scope
    await supabase
      .from('user_company_roles')
      .update({ access_scope: accessScope })
      .eq('user_id', userId)
      .eq('company_id', company.id);

    // Delete existing assignments
    await supabase
      .from('user_access_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', company.id);

    // Insert new assignments
    const assignments: any[] = [];
    clientIds.forEach(clientId => {
      assignments.push({ user_id: userId, company_id: company.id, client_id: clientId });
    });
    projectIds.forEach(projectId => {
      assignments.push({ user_id: userId, company_id: company.id, project_id: projectId });
    });

    if (assignments.length > 0) {
      await supabase.from('user_access_assignments').insert(assignments);
    }

    await fetchUsers();
  };

  useEffect(() => {
    if (company && isCompanyAdmin) {
      setLoading(true);
      Promise.all([fetchUsers(), fetchInvitations(), fetchAuditLog()])
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [company, isCompanyAdmin, fetchUsers, fetchInvitations, fetchAuditLog]);

  return {
    users,
    invitations,
    auditLog,
    loading,
    createInvitation,
    cancelInvitation,
    updateUserRole,
    updateUserStatus,
    updateUserPermissions,
    updateUserAccessScope,
    refreshData: () => Promise.all([fetchUsers(), fetchInvitations(), fetchAuditLog()])
  };
}