import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// New role types
export type CompanyRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'billing';
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
  allCompanyRoles: UserCompanyRole[];
  allCompanies: Company[];
  permissions: PermissionType[];
  loading: boolean;
  
  // Role checks
  isOwner: boolean;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isManager: boolean;
  isMember: boolean;
  isViewer: boolean;
  isBillingRole: boolean;
  isApproved: boolean;
  
  // Platform-level
  isPlatformAdmin: boolean;
  
  // Legacy compatibility
  isAdmin: boolean;
  isEmployee: boolean;
  isClient: boolean;
  roles: string[];
  
  // Permission check helper
  hasPermission: (permission: PermissionType) => boolean;
  
  // Auth functions
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  
  // Multi-org
  switchCompany: (companyId: string) => void;
  refreshUserData: () => Promise<void>;
  
  // Post-login routing
  postLoginRoute: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyRole, setCompanyRole] = useState<UserCompanyRole | null>(null);
  const [allCompanyRoles, setAllCompanyRoles] = useState<UserCompanyRole[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [legacyRoles, setLegacyRoles] = useState<string[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [postLoginRoute, setPostLoginRoute] = useState<string | null>(null);

  const applySession = (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    userRef.current = nextSession?.user ?? null;
    if (nextSession?.user) {
      setLoading(true);
    }
  };

  // Keep refs in sync
  useEffect(() => { profileRef.current = profile; }, [profile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // On token refresh or re-authentication of the same user, silently update session
        // without remounting the app -- this prevents tab-switch reloads
        if (event === 'TOKEN_REFRESHED' || (event === 'SIGNED_IN' && session?.user?.id === userRef.current?.id && profileRef.current !== null)) {
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }
        applySession(session);
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          resetState();
          setLoading(false);
        }
      }
    );

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
    setAllCompanyRoles([]);
    setAllCompanies([]);
    setPermissions([]);
    setLegacyRoles([]);
    setPostLoginRoute(null);
  };

  const fetchUserData = async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile({
          id: profileData.id,
          email: profileData.email,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          status: profileData.status as UserStatus
        });
      }

      // Fetch ALL company roles (multi-org support)
      const { data: companyRolesData } = await supabase
        .from('user_company_roles')
        .select('*, companies(*)')
        .eq('user_id', userId);

      const roles: UserCompanyRole[] = [];
      const companies: Company[] = [];

      (companyRolesData || []).forEach((cr: any) => {
        // Map legacy role names
        let role = cr.role as CompanyRole;
        if (role === 'super_admin' as any) role = 'owner';
        if (role === 'standard' as any) role = 'member';

        roles.push({
          id: cr.id,
          user_id: cr.user_id,
          company_id: cr.company_id,
          role,
          status: cr.status as UserStatus,
          access_scope: cr.access_scope as AccessScope,
          last_login_at: cr.last_login_at
        });

        if (cr.companies) {
          const c = cr.companies as any;
          companies.push({
            id: c.id,
            name: c.name,
            domain: c.domain,
            logo_url: c.logo_url
          });
        }
      });

      setAllCompanyRoles(roles);
      setAllCompanies(companies);

      // Determine post-login route
      const activeRoles = roles.filter(r => r.status === 'active');
      if (activeRoles.length === 0) {
        // Check if there's a pending invitation for this user's email
        const userEmail = profileData?.email;
        if (userEmail) {
          const { data: pendingInvitations } = await supabase
            .from('invitations')
            .select('id, token')
            .eq('email', userEmail)
            .eq('status', 'pending')
            .limit(1);

          if (pendingInvitations && pendingInvitations.length > 0) {
            // Route to accept-invite with the token
            setPostLoginRoute(`/accept-invite/${pendingInvitations[0].token}`);
            setCompanyRole(null);
            setCompany(null);
          } else {
            setPostLoginRoute('/onboarding');
            setCompanyRole(null);
            setCompany(null);
          }
        } else {
          setPostLoginRoute('/onboarding');
          setCompanyRole(null);
          setCompany(null);
        }
      } else if (activeRoles.length === 1) {
        const needsOnboarding = profileData && !profileData.onboarding_completed;
        setPostLoginRoute(needsOnboarding ? '/onboarding' : '/');
        selectCompany(activeRoles[0], companies);
      } else {
        const savedCompanyId = localStorage.getItem('activeCompanyId');
        const savedRole = savedCompanyId ? activeRoles.find(r => r.company_id === savedCompanyId) : null;
        const needsOnboarding = profileData && !profileData.onboarding_completed;
        if (savedRole) {
          setPostLoginRoute(needsOnboarding ? '/onboarding' : '/');
          selectCompany(savedRole, companies);
        } else {
          setPostLoginRoute(needsOnboarding ? '/onboarding' : '/select-workspace');
          selectCompany(activeRoles[0], companies);
        }
      }

      // Fetch permissions — company-scoped
      const activeRole = roles.find(r => r.status === 'active');
      if (activeRole) {
        const { data: permissionsData } = await supabase
          .from('user_permissions')
          .select('permission, granted')
          .eq('user_id', userId)
          .eq('company_id', activeRole.company_id)
          .eq('granted', true);

        if (permissionsData) {
          setPermissions(permissionsData.map(p => p.permission as PermissionType));
        }
      } else {
        setPermissions([]);
      }

      // DEPRECATED: Legacy user_roles — kept for backward compat only, NOT used for authorization
      // TODO: Remove this fetch entirely once all legacy references are cleaned up
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        setLegacyRoles(rolesData.map(r => r.role));
      }

      // Check platform admin status
      const { data: platformAdminCheck } = await supabase.rpc('is_platform_admin', { _user_id: userId });
      setIsPlatformAdmin(!!platformAdminCheck);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  const selectCompany = (role: UserCompanyRole, companies: Company[]) => {
    setCompanyRole(role);
    const comp = companies.find(c => c.id === role.company_id);
    setCompany(comp || null);
    localStorage.setItem('activeCompanyId', role.company_id);

    // Update last login
    supabase
      .from('user_company_roles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', role.id)
      .then(() => {});
  };

  const switchCompany = async (companyId: string) => {
    const role = allCompanyRoles.find(r => r.company_id === companyId);
    if (role) {
      selectCompany(role, allCompanies);
      // Re-fetch permissions for the new company context
      if (user) {
        const { data: permissionsData } = await supabase
          .from('user_permissions')
          .select('permission, granted')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('granted', true);

        if (permissionsData) {
          setPermissions(permissionsData.map(p => p.permission as PermissionType));
        } else {
          setPermissions([]);
        }
      }
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
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      applySession(data.session ?? null);
      if (data.user?.id) {
        setTimeout(() => fetchUserData(data.user!.id), 0);
      }
    } else {
      setLoading(false);
    }
    return { error };
  };

  const signOut = async () => {
    // Set work status to offline before signing out
    if (user) {
      await supabase.from('profiles').update({ work_status: 'offline' }).eq('id', user.id);
    }
    localStorage.removeItem('activeCompanyId');
    await supabase.auth.signOut();
    resetState();
  };

  const hasPermission = (permission: PermissionType): boolean => {
    const role = companyRole?.role;
    if (role === 'owner') return true;
    if (role === 'admin' && !permission.startsWith('settings.billing') && !permission.startsWith('settings.security')) return true;
    if (role === 'billing' && (permission === 'settings.billing' || permission === 'financials.view')) return true;
    if (role === 'viewer' && permission.endsWith('.view')) return true;
    return permissions.includes(permission);
  };

  const role = companyRole?.role;
  const isOwner = role === 'owner';
  const isSuperAdmin = role === 'owner'; // backward compat
  const isCompanyAdmin = role === 'owner' || role === 'admin';
  const isManager = role === 'manager';
  const isMember = role === 'member';
  const isViewer = role === 'viewer';
  const isBillingRole = role === 'billing';
  const isApproved = companyRole?.status === 'active' || profile?.status === 'active';
  
  // Legacy compatibility — now derived solely from company role, NOT from user_roles table
  // DEPRECATED: These will be removed in a future version. Use companyRole checks instead.
  const isAdmin = isOwner || role === 'admin';
  const isEmployee = isMember || isManager;
  const isClient = role === 'billing'; // closest legacy mapping

  return (
    <AuthContext.Provider value={{
      user, session, profile, company, companyRole, allCompanyRoles, allCompanies,
      permissions, loading,
      isOwner, isSuperAdmin, isCompanyAdmin, isManager, isMember, isViewer, isBillingRole, isApproved,
      isPlatformAdmin,
      isAdmin, isEmployee, isClient,
      roles: legacyRoles,
      hasPermission, signUp, signIn, signOut, switchCompany, refreshUserData, postLoginRoute
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
