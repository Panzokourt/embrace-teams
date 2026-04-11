import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Phase {
  name: string;
  start: string;
  end: string;
}

interface GenerateRequest {
  projectId: string;
  projectName: string;
  projectBudget: number;
  agencyFeePercentage?: number;
  deliverables: Array<{ id: string; name: string }>;
  campaignObjective?: string;
  campaignObjectives?: string[];
  targetAudience?: string;
  campaignDuration?: { start: string; end: string };
  phases?: Phase[];
  selectedChannels?: string[];
  budgetAllocation?: Record<string, number>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json() as GenerateRequest;
    const { projectId, projectName, projectBudget, agencyFeePercentage = 0, deliverables, campaignObjective, campaignObjectives, targetAudience, campaignDuration, phases, selectedChannels, budgetAllocation } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: hasAccess, error: accessError } = await supabase.rpc('has_new_project_access', { _user_id: userId, _project_id: projectId });
    if (accessError || !hasAccess) {
      return new Response(JSON.stringify({ error: 'Unauthorized access to project' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!deliverables || deliverables.length === 0) {
      return new Response(JSON.stringify({ error: "No deliverables provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resolvedObjectives: string[] = campaignObjectives && campaignObjectives.length > 0 ? campaignObjectives : (campaignObjective ? [campaignObjective] : ['awareness']);
    const netBudget = projectBudget * (1 - agencyFeePercentage / 100);
    const channelList = selectedChannels?.length ? selectedChannels.join(', ') : 'TV, Radio, Digital (Social & Search), OOH, Print, Influencers';
    const allocationText = budgetAllocation && Object.keys(budgetAllocation).length > 0
      ? Object.entries(budgetAllocation).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}%`).join(', ')
      : 'Distribute intelligently based on campaign objectives';

    let phasesText = '';
    if (phases && phases.length > 0) {
      phasesText = phases.map(p => `- ${p.name}${p.start ? ` (${p.start}` : ''}${p.end ? ` → ${p.end})` : (p.start ? ')' : '')}`).join('\n');
    } else if (campaignDuration?.start || campaignDuration?.end) {
      phasesText = `- Main Campaign: ${campaignDuration?.start || 'TBD'} → ${campaignDuration?.end || 'TBD'}`;
    } else {
      phasesText = '- Φάση 1 - Launching\n- Φάση 2 - Sustaining';
    }

    const systemPrompt = `You are a senior media planning expert at an advertising agency in Greece. Generate comprehensive, realistic media plans.

Return ONLY valid JSON in this exact format:
{
  "mediaPlanItems": [
    {
      "medium": "TV|Radio|Facebook|Instagram|TikTok|Google Ads (Search)|Google Ads (Display)|YouTube|OOH (Billboards)|DOOH (Digital OOH)|Programmatic|Influencer|Ambassador|PR|Εφημερίδες|Περιοδικά|Advertorial|Native Content|Email Marketing|SMS Marketing|Sponsorship|Events|Άλλο",
      "placement": "specific placement",
      "campaign_name": "descriptive campaign name in Greek or English",
      "format": "creative format",
      "phase": "one of the campaign phases exactly as provided",
      "objective": "one of: awareness|consideration|conversion|retention|launch|engagement|leads",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "budget": <number - must be NET budget excluding agency fee>,
      "reach": <estimated unique reach as integer>,
      "impressions": <estimated impressions as integer>,
      "target_audience": "demographic description",
      "notes": "strategic rationale in Greek",
      "deliverable_id": "UUID of associated deliverable or null"
    }
  ]
}

CRITICAL RULES:
- The SUM of ALL budget values MUST equal EXACTLY €${Math.round(netBudget)}.
- Create 6-14 diverse media items across the selected channels
- Each item MUST align its "phase" with one of the campaign phases provided
- Use Greek for campaign names and notes
- Provide realistic reach/impressions for the Greek market`;

    const userPrompt = `Create a detailed media plan for:

Project: ${projectName}
Total Project Budget: €${projectBudget.toLocaleString()}
Agency Fee: ${agencyFeePercentage}%
NET Budget (available for media): €${Math.round(netBudget).toLocaleString()}
Campaign Objectives: ${resolvedObjectives.join(', ')}
Target Audience: ${targetAudience || 'General audience'}
Selected Channels: ${channelList}
Budget Allocation Preferences: ${allocationText}

Campaign Phases:
${phasesText}

Project Deliverables:
${deliverables.map(d => `- ${d.name} (ID: ${d.id})`).join('\n')}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error("No JSON found in response");
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // Budget normalization
    if (result.mediaPlanItems && Array.isArray(result.mediaPlanItems)) {
      const totalAI = result.mediaPlanItems.reduce((s: number, i: { budget?: number }) => s + (i.budget || 0), 0);
      if (totalAI > netBudget * 1.01) {
        const scale = netBudget / totalAI;
        result.mediaPlanItems = result.mediaPlanItems.map((i: { budget?: number; [key: string]: unknown }) => ({
          ...i,
          budget: Math.round((i.budget || 0) * scale),
        }));
      }
    }

    console.log("Successfully generated media plan with", result.mediaPlanItems?.length || 0, "items");

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error in generate-media-plan:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
