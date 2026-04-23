// Generates a personalized "Next 5 Steps" checklist for the onboarding Ready screen.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface NextStep {
  title: string;
  description: string;
  href: string;
  icon: 'users' | 'folder' | 'message' | 'book' | 'briefcase' | 'sparkles' | 'mail' | 'settings';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: roleRow } = await supabase
      .from('user_company_roles').select('*, companies(*)').eq('user_id', user.id).maybeSingle();

    const company: any = roleRow?.companies ?? null;
    const role = roleRow?.role ?? 'member';
    const preset = company?.workspace_type ?? 'general';

    const sysPrompt = `You generate a personalized "next 5 steps" checklist for a SaaS onboarding finish screen.
Output ONLY via the function tool — no prose. Each step must include:
- title (Greek, max 6 words, action-oriented)
- description (Greek, 1 short sentence why)
- href (one of: /hr, /clients, /work/projects, /knowledge, /inbox, /settings, /financials, /calendar, /files)
- icon (one of: users, folder, message, book, briefcase, sparkles, mail, settings)

Tailor to role + workspace preset. Owner/Admin → invite team & connect tools first. Member → focus on personal setup. Marketing/Agency presets → emphasize clients/campaigns. Studio → projects/files. Generic → balanced.`;

    const userPrompt = `Role: ${role}
Workspace preset: ${preset}
Company: ${company?.name ?? 'unknown'}
Industry: ${company?.industry ?? 'unknown'}
User name: ${profile?.full_name ?? 'unknown'}
Generate exactly 5 steps.`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'emit_next_steps',
            description: 'Emit the personalized 5-step checklist.',
            parameters: {
              type: 'object',
              properties: {
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      href: { type: 'string' },
                      icon: { type: 'string', enum: ['users','folder','message','book','briefcase','sparkles','mail','settings'] },
                    },
                    required: ['title','description','href','icon'],
                    additionalProperties: false,
                  },
                  minItems: 5,
                  maxItems: 5,
                },
              },
              required: ['steps'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'emit_next_steps' } },
      }),
    });

    if (r.status === 429) return json({ error: 'rate_limited' }, 429);
    if (r.status === 402) return json({ error: 'payment_required' }, 402);
    if (!r.ok) return json({ error: 'ai_error' }, 500);

    const data = await r.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    const steps: NextStep[] = parsed?.steps ?? FALLBACK_STEPS;

    return json({ steps });
  } catch (e) {
    console.error('onboarding-personalize error', e);
    return json({ steps: FALLBACK_STEPS });
  }
});

const FALLBACK_STEPS: NextStep[] = [
  { title: 'Καλέστε την ομάδα σας', description: 'Προσθέστε συναδέλφους με ρόλους.', href: '/hr', icon: 'users' },
  { title: 'Δημιουργήστε πρώτο έργο', description: 'Ξεκινήστε από template ή από κενό.', href: '/work/projects', icon: 'folder' },
  { title: 'Συνδέστε email', description: 'Μετατρέψτε briefs σε projects.', href: '/inbox', icon: 'mail' },
  { title: 'Εξερευνήστε τη Βιβλιοθήκη', description: 'Δείτε AI suggestions για άρθρα.', href: '/knowledge', icon: 'book' },
  { title: 'Ρωτήστε τον Secretary', description: 'AI βοηθός για κάθε ερώτηση.', href: '/', icon: 'sparkles' },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
