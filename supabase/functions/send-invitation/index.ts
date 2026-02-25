import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { InvitationEmail } from './_templates/invitation.tsx'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Μέλος',
  viewer: 'Viewer',
  billing: 'Billing',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify JWT using getUser
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth verification failed:', userError?.message || 'No user')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Authenticated user: ${user.email} (${user.id})`)

    const { invitation_id, app_url } = await req.json()

    if (!invitation_id) {
      return new Response(JSON.stringify({ error: 'Missing invitation_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing invitation: ${invitation_id}`)

    // Use service role to read invitation details
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: invitation, error: invError } = await adminClient
      .from('invitations')
      .select('*, companies(name)')
      .eq('id', invitation_id)
      .single()

    if (invError || !invitation) {
      console.error('Invitation not found:', invError?.message)
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get inviter name
    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', invitation.invited_by)
      .single()

    const companyName = (invitation as any).companies?.name || 'Unknown'
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Κάποιος'
    const roleName = ROLE_LABELS[invitation.role] || invitation.role
    const baseUrl = app_url || 'https://embrace-teams.lovable.app'
    const acceptUrl = `${baseUrl}/accept-invite/${invitation.token}`

    console.log(`Sending invitation to ${invitation.email} for company "${companyName}" with link: ${acceptUrl}`)

    const expiresDate = new Date(invitation.expires_at)
    const expiresAt = expiresDate.toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Render email
    const html = await renderAsync(
      React.createElement(InvitationEmail, {
        companyName,
        roleName,
        inviterName,
        acceptUrl,
        expiresAt,
      })
    )

    // Send via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resend = new Resend(resendApiKey)
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: 'Olseny <noreply@olseny.com>',
      to: [invitation.email],
      subject: `Πρόσκληση στο ${companyName} — Olseny`,
      html,
    })

    if (sendError) {
      console.error('Resend error:', JSON.stringify(sendError))
      return new Response(JSON.stringify({ error: 'Failed to send email', details: sendError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`✅ Invitation email sent to ${invitation.email}, Resend ID: ${sendData?.id}`)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in send-invitation:', error.message, error.stack)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
