import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const body = await req.json()
    const { token, pin } = body || {}

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'missing_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Step 1: validate (peek) — does not consume
    const { data: validation, error: valErr } = await adminClient.rpc('portal_validate_token', {
      _token: token,
      _pin: pin ?? null,
    })

    if (valErr) {
      console.error('validate rpc error:', valErr)
      return new Response(JSON.stringify({ error: 'validation_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const v: any = validation
    if (!v?.valid) {
      // Pre-PIN screen flow: token is fine but requires PIN
      if (v?.requires_pin && !pin) {
        return new Response(
          JSON.stringify({
            requires_pin: true,
            client_name: v.client_name,
            company_name: v.company_name,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: v?.error || 'invalid', locked_until: v?.locked_until }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: consume (mark used + reset attempts)
    await adminClient.rpc('portal_consume_token', { _token: token, _pin: pin ?? null })

    // Step 3: generate session for the user via magic link, then exchange the OTP server-side
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: v.email,
    })

    if (linkErr || !linkData) {
      console.error('generateLink error:', linkErr)
      return new Response(JSON.stringify({ error: 'link_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const otp = linkData.properties?.email_otp
    if (!otp) {
      return new Response(JSON.stringify({ error: 'otp_missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Exchange OTP for a session using anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: sessionData, error: verifyErr } = await anonClient.auth.verifyOtp({
      email: v.email,
      token: otp,
      type: 'magiclink',
    })

    if (verifyErr || !sessionData.session) {
      console.error('verifyOtp error:', verifyErr)
      return new Response(JSON.stringify({ error: 'session_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        client_name: v.client_name,
        company_name: v.company_name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
