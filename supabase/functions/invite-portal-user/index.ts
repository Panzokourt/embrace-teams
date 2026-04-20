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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')

    // Verify caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, client_id, company_id, app_url } = body

    if (!email || !client_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, client_id, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Verify caller belongs to that company (and has a manageable role)
    const { data: callerRole, error: callerRoleErr } = await userClient
      .from('user_company_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .maybeSingle()

    if (callerRoleErr || !callerRole) {
      return new Response(JSON.stringify({ error: 'You do not belong to this company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allowedRoles = ['super_admin', 'owner', 'admin', 'manager']
    if (!allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    const baseUrl = app_url || 'https://app.olseny.com'
    const portalUrl = `${baseUrl}/portal`

    // 1) Find or create the auth user
    let userId: string | null = null

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingProfile) {
      userId = existingProfile.id
      console.log(`Using existing user ${userId} for ${normalizedEmail}`)
    } else {
      // Create new user via invite (they'll set password via magic link)
      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          redirectTo: portalUrl,
          data: {
            portal_invite: true,
            client_id,
            company_id,
            client_name: client.name,
          },
        }
      )

      if (inviteErr) {
        // Fallback: try createUser without password (passwordless), user will get magic link
        console.error('inviteUserByEmail failed, trying createUser:', inviteErr.message)
        const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          user_metadata: {
            portal_invite: true,
            client_id,
            company_id,
            client_name: client.name,
          },
        })
        if (createErr || !createdUser.user) {
          console.error('createUser also failed:', createErr?.message)
          return new Response(
            JSON.stringify({ error: createErr?.message || 'Failed to create user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        userId = createdUser.user.id
      } else {
        userId = invited.user?.id ?? null
      }

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Could not provision user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 2) Insert client_portal_users row (idempotent)
    const { error: portalErr } = await adminClient
      .from('client_portal_users')
      .upsert(
        {
          user_id: userId,
          client_id,
          company_id,
          invited_by: caller.id,
          is_active: true,
        },
        { onConflict: 'user_id,client_id', ignoreDuplicates: false }
      )

    if (portalErr) {
      console.error('Portal insert error:', portalErr)
      return new Response(JSON.stringify({ error: portalErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Generate magic link & send custom email (only if user is new or has no password)
    let magicLink = portalUrl
    try {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: { redirectTo: portalUrl },
      })
      if (linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link
      }
    } catch (e) {
      console.warn('generateLink failed, using portal url fallback:', e)
    }

    // 4) Send branded email via Resend
    if (resendKey) {
      try {
        const resend = new Resend(resendKey)
        const html = await renderAsync(
          React.createElement(PortalInvitationEmail, {
            companyName: company?.name || 'Olseny',
            clientName: client.name,
            inviterName: inviterProfile?.full_name || inviterProfile?.email || 'Η ομάδα',
            acceptUrl: magicLink,
          })
        )
        await resend.emails.send({
          from: 'Olseny <noreply@olseny.com>',
          to: [normalizedEmail],
          subject: `Πρόσκληση στο Client Portal — ${client.name}`,
          html,
        })
        console.log(`Portal invite email sent to ${normalizedEmail}`)
      } catch (e) {
        console.error('Resend send error:', e)
      }
    } else {
      console.warn('RESEND_API_KEY not set — skipping branded email (Supabase invite email will be used)')
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: normalizedEmail,
      }),
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
