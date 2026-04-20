import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PortalInvitationEmail } from './_templates/portal-invitation.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Generate a URL-safe random token (~43 chars from 32 bytes)
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Generate a 6-digit numeric PIN
function generatePin(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 1000000).padStart(6, '0')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, client_id, company_id, app_url, require_pin = false, full_name } = body

    if (!email || !client_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, client_id, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Verify caller belongs to the company with manage permissions
    const { data: callerRole } = await userClient
      .from('user_company_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .maybeSingle()

    const allowedRoles = ['super_admin', 'owner', 'admin', 'manager']
    if (!callerRole || !allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get client + company info
    const { data: client } = await adminClient
      .from('clients')
      .select('name, company_id')
      .eq('id', client_id)
      .single()

    if (!client || client.company_id !== company_id) {
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: company } = await adminClient
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single()

    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', caller.id)
      .single()

    // ALWAYS use the production Olseny domain so links never go through Lovable preview/login.
    // The optional `app_url` from the client is intentionally ignored to prevent preview URLs
    // (e.g. *.lovable.app or *.lovable.dev) from being embedded in invitation emails.
    const baseUrl = 'https://app.olseny.com'

    const cleanName = (full_name && String(full_name).trim()) || null

    // 1) Find or create the auth user (passwordless — they sign in via portal token)
    let userId: string | null = null

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingProfile) {
      userId = existingProfile.id
      // Backfill name if profile is missing one and we now have it
      if (cleanName && !existingProfile.full_name) {
        await adminClient
          .from('profiles')
          .update({ full_name: cleanName })
          .eq('id', userId)
      }
    } else {
      // Create user directly without sending Supabase email (we send our own)
      const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          portal_invite: true,
          client_id,
          company_id,
          client_name: client.name,
          full_name: cleanName,
        },
      })
      if (createErr || !createdUser.user) {
        console.error('createUser failed:', createErr?.message)
        return new Response(
          JSON.stringify({ error: createErr?.message || 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userId = createdUser.user.id

      // Ensure the profile row has the name + email (handle_new_user trigger may set empty name)
      await adminClient
        .from('profiles')
        .update({
          email: normalizedEmail,
          full_name: cleanName || normalizedEmail,
        })
        .eq('id', userId)
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Could not provision user' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Upsert client_portal_users
    const { error: portalErr } = await adminClient
      .from('client_portal_users')
      .upsert(
        { user_id: userId, client_id, company_id, invited_by: caller.id, is_active: true },
        { onConflict: 'user_id,client_id', ignoreDuplicates: false }
      )
    if (portalErr) {
      console.error('Portal insert error:', portalErr)
      return new Response(JSON.stringify({ error: portalErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Create custom access token (+optional PIN)
    const token = generateToken()
    const pin = require_pin ? generatePin() : null

    const { error: tokenErr } = await adminClient.rpc('portal_create_token', {
      _client_id: client_id,
      _company_id: company_id,
      _email: normalizedEmail,
      _user_id: userId,
      _token: token,
      _pin: pin,
      _expires_in_days: 30,
    })
    if (tokenErr) {
      console.error('Token create error:', tokenErr)
      return new Response(JSON.stringify({ error: tokenErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessUrl = `${baseUrl}/portal/access?token=${encodeURIComponent(token)}`

    // 4) Send branded email via Resend
    if (resendKey) {
      try {
        const resend = new Resend(resendKey)
        const html = await renderAsync(
          React.createElement(PortalInvitationEmail, {
            companyName: company?.name || 'Olseny',
            clientName: client.name,
            inviterName: inviterProfile?.full_name || inviterProfile?.email || 'Η ομάδα',
            acceptUrl: accessUrl,
            pin: pin || undefined,
          })
        )
        await resend.emails.send({
          from: 'Olseny <noreply@olseny.com>',
          to: [normalizedEmail],
          subject: `Πρόσκληση στο Client Portal — ${client.name}`,
          html,
        })
      } catch (e) {
        console.error('Resend send error:', e)
      }
    } else {
      console.warn('RESEND_API_KEY not set — email not sent')
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email: normalizedEmail, has_pin: !!pin }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
