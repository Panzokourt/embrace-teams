const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MappingRequest {
  entity: 'clients' | 'projects' | 'tasks';
  headers: string[];
  sampleRows: Record<string, unknown>[];
  fields: { key: string; label: string; type: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const { entity, headers, sampleRows, fields } = (await req.json()) as MappingRequest;

    if (!Array.isArray(headers) || !Array.isArray(fields)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fieldKeys = fields.map((f) => f.key);

    const systemPrompt = `You are a data-mapping assistant. Given file column headers and sample rows, map each header to one of the allowed target field keys (or omit it if no good match). Reply only via the suggest_mapping tool. Headers are in Greek or English. Use semantic matching.`;

    const userPrompt = JSON.stringify({
      entity,
      target_fields: fields,
      headers,
      sample_rows: sampleRows.slice(0, 3),
    });

    const properties: Record<string, any> = {};
    headers.forEach((h) => {
      properties[h] = {
        type: 'string',
        enum: [...fieldKeys, '__ignore__'],
      };
    });

    const body = {
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_mapping',
            description: 'Map each file column header to a target field key.',
            parameters: {
              type: 'object',
              properties,
              required: headers,
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'suggest_mapping' } },
    };

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (r.status === 429 || r.status === 402) {
      return new Response(
        JSON.stringify({ error: r.status === 429 ? 'Rate limit' : 'Credits exhausted' }),
        { status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!r.ok) {
      const t = await r.text();
      console.error('AI gateway error:', r.status, t);
      throw new Error('AI gateway request failed');
    }

    const data = await r.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let mapping: Record<string, string> = {};
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      mapping = Object.fromEntries(
        Object.entries(parsed).filter(([_, v]) => v && v !== '__ignore__') as [string, string][]
      );
    }

    return new Response(JSON.stringify({ mapping }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ai-suggest-mapping error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
