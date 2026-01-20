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
  deliverables: Array<{ id: string; name: string }>;
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

    const { projectId, projectName, projectBudget, deliverables } = await req.json() as GenerateRequest;

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
      console.error("User does not have access to project:", projectId);
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // ============================================
    // Input Validation
    // ============================================
    if (!deliverables || deliverables.length === 0) {
      return new Response(
        JSON.stringify({ error: "No deliverables provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!projectBudget || projectBudget <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid project budget is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating media plan for project:", projectName, "Budget:", projectBudget);

    // ============================================
    // AI Processing
    // ============================================
    const systemPrompt = `You are a media planning expert. Based on the project details and deliverables provided, generate a comprehensive media plan with specific placements, budgets, and timelines.

Return ONLY valid JSON in this exact format:
{
  "mediaPlanItems": [
    {
      "medium": "Facebook|Instagram|Google Ads|LinkedIn|Twitter/X|TikTok|YouTube|TV|Radio|Print|OOH (Out of Home)|Programmatic|Email Marketing|Influencer|Άλλο",
      "placement": "specific placement like Feed, Stories, Banner 300x250, etc",
      "campaign_name": "descriptive campaign name",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD", 
      "budget": number,
      "target_audience": "demographic and interest targeting description",
      "notes": "additional notes or recommendations",
      "deliverable_id": "UUID of the associated deliverable if applicable"
    }
  ]
}

Guidelines:
- Distribute the budget intelligently across different media channels
- Consider the project goals when selecting media types
- Include a mix of awareness and conversion-focused placements
- Be realistic with budget allocations
- Use Greek for campaign names and notes when the project name is in Greek`;

    const userPrompt = `Create a media plan for:

Project: ${projectName}
Total Budget: €${projectBudget}

Deliverables:
${deliverables.map(d => `- ${d.name} (ID: ${d.id})`).join('\n')}

Generate appropriate media placements that would help achieve these deliverables. Distribute the budget wisely across channels. Link each media item to relevant deliverables where applicable.`;

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
