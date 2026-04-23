// Context-aware AI Coach: generates an on-demand help/suggestion message
// based on the user's current page, role, and recent activity.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const pathname: string = body.pathname ?? '/';
    const userQuestion: string | undefined = body.question;

    const { data: roleRow } = await supabase
      .from('user_company_roles').select('role, access_scope, companies(name, industry, workspace_type)')
      .eq('user_id', user.id).maybeSingle();
    const role = roleRow?.role ?? 'member';
    const company: any = roleRow?.companies ?? null;

    const sys = `Είσαι ο "AI Coach" μέσα σε ένα SaaS εργαλείο διαχείρισης ομάδων/έργων.
- Απαντάς πάντα στα Ελληνικά, σύντομα (μέγιστο 4-5 προτάσεις), φιλικά και συγκεκριμένα.
- Λαμβάνεις υπόψη τη σελίδα όπου βρίσκεται ο χρήστης και το role του.
- Όταν προτείνεις ενέργειες, χρησιμοποίησε bullet points με 1 πρόταση το καθένα.
- Αν δεν δίνεται συγκεκριμένη ερώτηση, εξήγησε τι μπορεί να κάνει στη σελίδα και πρότεινε 2-3 βήματα.`;

    const userMsg = `Σελίδα: ${pathname}
Ρόλος: ${role}
Εταιρεία: ${company?.name ?? '—'} (${company?.industry ?? '—'}, preset: ${company?.workspace_type ?? '—'})
${userQuestion ? `Ερώτηση χρήστη: ${userQuestion}` : 'Δεν υπάρχει συγκεκριμένη ερώτηση — δώσε γενικό coaching για τη σελίδα.'}`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        stream: true,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    if (r.status === 429) return json({ error: 'rate_limited' }, 429);
    if (r.status === 402) return json({ error: 'payment_required' }, 402);
    if (!r.ok || !r.body) return json({ error: 'ai_error' }, 500);

    return new Response(r.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('coach-ai-suggest error', e);
    return json({ error: 'internal' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
