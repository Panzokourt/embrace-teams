import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the auth token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they are admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !currentUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or manager
    const { data: roleData, error: roleError } = await userClient
      .from('user_company_roles')
      .select('role, company_id')
      .eq('user_id', currentUser.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'User has no company role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only admins and managers can create users.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, password, full_name, role, job_title, department, phone, reports_to, hire_date, access_scope, permissions, client_ids, project_ids } = body;

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, full_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Creating user with email:', email);

    // Create user in auth.users using admin API
    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name }
    });

    if (createError) {
      console.error('Create user error:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newAuthUser.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newAuthUser.user.id;
    console.log('User created with ID:', userId);

    // Update profile with additional info
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name,
        job_title: job_title || null,
        department: department || null,
        phone: phone || null,
        reports_to: reports_to || null,
        hire_date: hire_date || null,
        status: 'active'
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't fail, profile will be created by trigger
    }

    // Create user_company_roles entry
    const { error: roleCreateError } = await adminClient
      .from('user_company_roles')
      .insert({
        user_id: userId,
        company_id: roleData.company_id,
        role: role || 'standard',
        status: 'active',
        access_scope: access_scope || 'assigned'
      });

    if (roleCreateError) {
      console.error('Company role create error:', roleCreateError);
      // Cleanup: delete the user if company role creation fails
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to assign company role: ' + roleCreateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create permissions if provided
    if (permissions && permissions.length > 0) {
      const permissionInserts = permissions.map((p: string) => ({
        user_id: userId,
        company_id: roleData.company_id,
        permission: p,
        granted: true
      }));

      const { error: permError } = await adminClient
        .from('user_permissions')
        .insert(permissionInserts);

      if (permError) {
        console.error('Permissions insert error:', permError);
      }
    }

    // Create access assignments if provided
    const accessAssignments: any[] = [];
    if (client_ids && client_ids.length > 0) {
      client_ids.forEach((clientId: string) => {
        accessAssignments.push({
          user_id: userId,
          company_id: roleData.company_id,
          client_id: clientId
        });
      });
    }
    if (project_ids && project_ids.length > 0) {
      project_ids.forEach((projectId: string) => {
        accessAssignments.push({
          user_id: userId,
          company_id: roleData.company_id,
          project_id: projectId
        });
      });
    }

    if (accessAssignments.length > 0) {
      const { error: assignError } = await adminClient
        .from('user_access_assignments')
        .insert(accessAssignments);

      if (assignError) {
        console.error('Access assignments insert error:', assignError);
      }
    }

    // Log the action in audit log
    await adminClient.from('rbac_audit_log').insert({
      company_id: roleData.company_id,
      actor_id: currentUser.id,
      action: 'user_created',
      target_user_id: userId,
      target_type: 'user',
      new_value: { email, role: role || 'standard', full_name }
    });

    console.log('User creation complete for:', email);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email,
          full_name,
          role: role || 'standard'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
