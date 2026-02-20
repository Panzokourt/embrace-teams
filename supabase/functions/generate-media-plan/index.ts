import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MediaPlanItem {
  medium: string;
  placement?: string;
  campaign_name?: string;
  start_date?: string;
  end_date?: string;
  budget: number;
  target_audience?: string;
  notes?: string;
  deliverable_id?: string;
}

interface GenerateRequest {
  projectId: string;
  projectName: string;
  projectBudget: number;
  agencyFeePercentage?: number;
  deliverables: Array<{ id: string; name: string }>;
  campaignObjective?: string;
  targetAudience?: string;
  campaignDuration?: { start: string; end: string };
  selectedChannels?: string[];
  budgetAllocation?: Record<string, number>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // SECURITY: Authentication Check
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // ============================================
    // Get API Key and Request Data
    // ============================================
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { 
      projectId, projectName, projectBudget, agencyFeePercentage = 0,
      deliverables, campaignObjective, targetAudience, campaignDuration, 
      selectedChannels, budgetAllocation 
    } = await req.json() as GenerateRequest;

    // ============================================
    // SECURITY: Authorization Check
    // ============================================
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: hasAccess, error: accessError } = await supabase.rpc(
      'has_new_project_access',
      { _user_id: userId, _project_id: projectId }
    );

    if (accessError || !hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    if (!deliverables || deliverables.length === 0) {
      return new Response(
        JSON.stringify({ error: "No deliverables provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const netBudget = projectBudget * (1 - agencyFeePercentage / 100);
    const channelList = selectedChannels?.length ? selectedChannels.join(', ') : 'TV, Radio, Digital (Social & Search), OOH, Print, Influencers';
    const allocationText = budgetAllocation && Object.keys(budgetAllocation).length > 0
      ? Object.entries(budgetAllocation).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}%`).join(', ')
      : 'Distribute intelligently based on campaign objective';

    const systemPrompt = `You are a senior media planning expert at an advertising agency. Generate comprehensive, realistic media plans with detailed channel strategy.

Return ONLY valid JSON in this exact format:
{
  "mediaPlanItems": [
    {
      "medium": "TV|Radio|Facebook|Instagram|TikTok|Google Ads (Search)|Google Ads (Display)|YouTube|OOH (Billboards)|DOOH (Digital OOH)|Programmatic|Influencer|Ambassador|PR|Εφημερίδες|Περιοδικά|Advertorial|Native Content|Email Marketing|SMS Marketing|Sponsorship|Events|Άλλο",
      "placement": "specific placement e.g. Feed, Stories, Banner 300x250, Spot 30sec",
      "campaign_name": "descriptive campaign name",
      "format": "creative format e.g. Video 15sec, Carousel, Static 300x250, Spot 30sec",
      "phase": "campaign phase e.g. Φάση 1 - Launching, Φάση 2 - Sustaining",
      "objective": "awareness|consideration|conversion|retention|launch|engagement",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "budget": number,
      "reach": number (estimated unique reach),
      "impressions": number (estimated impressions),
      "target_audience": "demographic description",
      "notes": "strategic rationale and recommendations",
      "deliverable_id": "UUID of associated deliverable if applicable or null"
    }
  ]
}

Guidelines:
- Create 6-12 diverse media items across the selected channels
- Distribute budget intelligently with realistic allocations
- Use campaign phases (Φάση 1, Φάση 2 etc.) to show campaign timeline
- Match each item's objective to the campaign goal
- Provide realistic reach/impressions estimates for Greek market
- Include strategic rationale in notes
- Use Greek for campaign names and notes when project name is in Greek`;

    const userPrompt = `Create a detailed media plan for:

Project: ${projectName}
Total Budget: €${projectBudget}
Net Budget (after ${agencyFeePercentage}% agency fee): €${Math.round(netBudget)}
Campaign Objective: ${campaignObjective || 'Brand Awareness'}
Target Audience: ${targetAudience || 'General audience'}
Campaign Duration: ${campaignDuration?.start || 'TBD'} to ${campaignDuration?.end || 'TBD'}
Selected Channels: ${channelList}
Budget Allocation preferences: ${allocationText}

Project Deliverables:
${deliverables.map(d => `- ${d.name} (ID: ${d.id})`).join('\n')}

Create a comprehensive media plan that:
1. Distributes the NET budget (€${Math.round(netBudget)}) across the selected channels
2. Respects the budget allocation preferences
3. Organizes placements in logical campaign phases
4. Links media items to relevant deliverables where applicable
5. Provides realistic Greek market estimates for reach and impressions`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    console.log("Successfully generated media plan with", result.mediaPlanItems?.length || 0, "items");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-media-plan:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
