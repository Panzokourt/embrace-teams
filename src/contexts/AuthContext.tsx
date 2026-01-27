import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Legacy roles (for backwards compatibility)
type LegacyRole = 'admin' | 'manager' | 'employee' | 'client';

// New RBAC types
export type CompanyRole = 'super_admin' | 'admin' | 'manager' | 'standard' | 'client';
export type UserStatus = 'invited' | 'pending' | 'active' | 'suspended' | 'deactivated';
export type AccessScope = 'company' | 'department' | 'team' | 'assigned';

export type PermissionType = 
  | 'users.view' | 'users.invite' | 'users.edit' | 'users.suspend' | 'users.delete'
  | 'clients.view' | 'clients.create' | 'clients.edit' | 'clients.delete'
  | 'projects.view' | 'projects.create' | 'projects.edit' | 'projects.delete'
  | 'tasks.view' | 'tasks.create' | 'tasks.edit' | 'tasks.delete' | 'tasks.assign'
  | 'deliverables.view' | 'deliverables.create' | 'deliverables.edit' | 'deliverables.delete' | 'deliverables.approve'
  | 'financials.view' | 'financials.create' | 'financials.edit' | 'financials.delete'
  | 'reports.view' | 'reports.export'
  | 'tenders.view' | 'tenders.create' | 'tenders.edit' | 'tenders.delete'
  | 'files.view' | 'files.upload' | 'files.delete'
  | 'comments.view' | 'comments.create' | 'comments.edit' | 'comments.delete'
  | 'settings.company' | 'settings.billing' | 'settings.security' | 'settings.integrations'
  | 'audit.view';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
}

export interface UserCompanyRole {
  id: string;
  user_id: string;
  company_id: string;
  role: CompanyRole;
  status: UserStatus;
  access_scope: AccessScope;
  last_login_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  companyRole: UserCompanyRole | null;
  permissions: PermissionType[];
  loading: boolean;
  
  // Role checks (new RBAC)
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isManager: boolean;
  isStandard: boolean;
  isClientRole: boolean;
  isApproved: boolean;
  
  // Legacy role checks (backwards compatibility)
  isAdmin: boolean;
  isEmployee: boolean;
  isClient: boolean;
  roles: LegacyRole[];
  
  // Permission check helper
  hasPermission: (permission: PermissionType) => boolean;
  
  // Auth functions
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  
  // Refresh data
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyRole, setCompanyRole] = useState<UserCompanyRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [legacyRoles, setLegacyRoles] = useState<LegacyRole[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        applySession(session);
        
        // Defer fetching profile data
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          resetState();
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setProfile(null);
    setCompany(null);
    setCompanyRole(null);
    setPermissions([]);
    setLegacyRoles([]);
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          email: profileData.email,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          status: profileData.status as UserStatus
        });
      }

      // Fetch company role (new RBAC)
      const { data: companyRoleData, error: companyRoleError } = await supabase
        .from('user_company_roles')
        .select('*, companies(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyRoleError && companyRoleError.code !== 'PGRST116') {
        console.error('Error fetching company role:', companyRoleError);
      } else if (companyRoleData) {
        setCompanyRole({
          id: companyRoleData.id,
          user_id: companyRoleData.user_id,
          company_id: companyRoleData.company_id,
          role: companyRoleData.role as CompanyRole,
          status: companyRoleData.status as UserStatus,
          access_scope: companyRoleData.access_scope as AccessScope,
          last_login_at: companyRoleData.last_login_at
        });
        
        if (companyRoleData.companies) {
          const companyData = companyRoleData.companies as any;
          setCompany({
            id: companyData.id,
            name: companyData.name,
            domain: companyData.domain,
            logo_url: companyData.logo_url
          });
        }

        // Update last login
        await supabase
          .from('user_company_roles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', companyRoleData.id);
      }

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_permissions')
        .select('permission, granted')
        .eq('user_id', userId)
        .eq('granted', true);

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
      } else if (permissionsData) {
        setPermissions(permissionsData.map(p => p.permission as PermissionType));
      }

      // Fetch legacy roles (backwards compatibility)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching legacy roles:', rolesError);
      } else if (rolesData) {
        setLegacyRoles(rolesData.map(r => r.role as LegacyRole));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Prevent redirect races: while signing in, keep app in a loading state
    // so AppLayout won't bounce back to /auth before the session/user state lands.
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Ensure app state updates immediately even if auth state events are delayed.
    if (!error) {
      applySession(data.session ?? null);
      if (data.user?.id) {
        setTimeout(() => {
          fetchUserData(data.user!.id);
        }, 0);
      }
    } else {
      setLoading(false);
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    resetState();
  };

  // Permission check helper
  const hasPermission = (permission: PermissionType): boolean => {
    // Super admin has all permissions
    if (companyRole?.role === 'super_admin') return true;
    // Admin has most permissions except billing/security settings
    if (companyRole?.role === 'admin' && !permission.startsWith('settings.billing') && !permission.startsWith('settings.security')) {
      return true;
    }
    return permissions.includes(permission);
  };

  // New RBAC role checks
  const isSuperAdmin = companyRole?.role === 'super_admin';
  const isCompanyAdmin = companyRole?.role === 'super_admin' || companyRole?.role === 'admin';
  const isManager = companyRole?.role === 'manager';
  const isStandard = companyRole?.role === 'standard';
  const isClientRole = companyRole?.role === 'client';
  const isApproved = companyRole?.status === 'active' || profile?.status === 'active';

  // Legacy role checks (backwards compatibility)
  const isAdmin = legacyRoles.includes('admin') || isSuperAdmin || companyRole?.role === 'admin';
  const isLegacyManager = legacyRoles.includes('manager') || isManager;
  const isEmployee = legacyRoles.includes('employee') || isStandard;
  const isClient = legacyRoles.includes('client') || isClientRole;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      company,
      companyRole,
      permissions,
      loading,
      isSuperAdmin,
      isCompanyAdmin,
      isManager: isLegacyManager,
      isStandard,
      isClientRole,
      isApproved,
      isAdmin,
      isEmployee,
      isClient,
      roles: legacyRoles,
      hasPermission,
      signUp,
      signIn,
      signOut,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}