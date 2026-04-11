import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProjectSuggestion {
  deliverables: Array<{ name: string; description: string; due_date?: string; budget?: number }>;
  tasks: Array<{ title: string; description: string; due_date?: string; deliverable_index?: number }>;
  invoices: Array<{ description: string; amount: number; due_date?: string }>;
  projectSummary: string;
  suggestedProjectDetails?: { description?: string; start_date?: string; end_date?: string; budget?: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { fileContents, projectName, projectBudget, projectId, additionalContext, focusArea, focusInstructions, isReanalysis, requestQuestions } = await req.json();

    if (projectId) {
      const { data: hasAccess, error: accessError } = await supabase.rpc('has_new_project_access', { _user_id: userId, _project_id: projectId });
      if (accessError || !hasAccess) {
        return new Response(JSON.stringify({ error: 'Unauthorized access to project' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (!fileContents || fileContents.length === 0) {
      return new Response(JSON.stringify({ error: "No file contents provided" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const maxSingleFileLength = 250000;
    const processedFiles = fileContents.map((f: any) => {
      let content = f.content || '';
      if (content.length > maxSingleFileLength) content = content.substring(0, maxSingleFileLength) + '\n\n[... Truncated ...]';
      return { ...f, content };
    });

    const totalContentLength = processedFiles.reduce((acc: number, f: any) => acc + (f.content?.length || 0), 0);
    if (totalContentLength > 500000) {
      return new Response(JSON.stringify({ error: "Total file content too large." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let focusPromptSection = focusInstructions ? `\n\nΕΙΔΙΚΗ ΕΣΤΙΑΣΗ: ${focusInstructions}` : '';
    let reanalysisSection = isReanalysis && additionalContext ? `\n\nΕΠΑΝΑΝΑΛΥΣΗ:\n${additionalContext}` : '';
    let questionsSection = requestQuestions ? `\n\nΔημιούργησε ερωτήσεις επιβεβαίωσης για τον χρήστη.` : '';

    const systemPrompt = `Είσαι ειδικός αναλυτής εγγράφων για δημόσιους διαγωνισμούς και έργα επικοινωνίας/marketing. 
ΣΤΟΧΟΣ: Ανάλυσε το έγγραφο και εξάγε ΟΛΑ τα παραδοτέα, προθεσμίες, ποσά και τεχνικές απαιτήσεις.
Μετατροπή ημερομηνιών σε YYYY-MM-DD. Εντόπισε ΣΥΝΟΛΙΚΟ ΠΡΟΫΠΟΛΟΓΙΣΜΟ.
Για κάθε παραδοτέο, πρότεινε 2-4 tasks. Ψάξε για πληρωμές/δόσεις.
ΣΗΜΑΝΤΙΚΟ: Επέστρεψε ΜΟΝΟ ό,τι υπάρχει στο έγγραφο. ΜΗΝ φαντάζεσαι δεδομένα.${focusPromptSection}${reanalysisSection}${questionsSection}`;

    const userPrompt = `Έργο: ${projectName}
${projectBudget ? `Γνωστός Προϋπολογισμός: €${projectBudget}` : 'Προϋπολογισμός: Να εξαχθεί από τα αρχεία'}

ΠΕΡΙΕΧΟΜΕΝΑ ΑΡΧΕΙΩΝ:
${processedFiles.map((f: any, i: number) => `=== Αρχείο ${i + 1}: ${f.fileName} ===\n${f.content}`).join('\n\n')}

ΑΝΑΛΥΣΕ τα παραπάνω και εξάγε deliverables, tasks, invoices, project details.`;

    const jsonSchema = {
      type: "object" as const,
      properties: {
        deliverables: { type: "array" as const, items: { type: "object" as const, properties: { name: { type: "string" as const }, description: { type: "string" as const }, due_date: { type: "string" as const }, budget: { type: "number" as const } }, required: ["name", "description"] } },
        tasks: { type: "array" as const, items: { type: "object" as const, properties: { title: { type: "string" as const }, description: { type: "string" as const }, due_date: { type: "string" as const }, deliverable_index: { type: "number" as const } }, required: ["title", "description"] } },
        invoices: { type: "array" as const, items: { type: "object" as const, properties: { description: { type: "string" as const }, amount: { type: "number" as const }, due_date: { type: "string" as const } }, required: ["description", "amount"] } },
        suggestedProjectDetails: { type: "object" as const, properties: { description: { type: "string" as const }, start_date: { type: "string" as const }, end_date: { type: "string" as const }, budget: { type: "number" as const } } },
        projectSummary: { type: "string" as const },
        analysisConfidence: { type: "object" as const, properties: { deliverables: { type: "string" as const }, tasks: { type: "string" as const }, invoices: { type: "string" as const }, dates: { type: "string" as const } } },
        aiQuestions: { type: "array" as const, items: { type: "object" as const, properties: { type: { type: "string" as const }, question: { type: "string" as const }, context: { type: "string" as const } }, required: ["type", "question"] } },
        missingInfo: { type: "array" as const, items: { type: "string" as const } },
      },
      required: ["deliverables", "tasks", "invoices", "projectSummary"],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_project_structure",
            description: "Επιστρέφει δομημένες προτάσεις για παραδοτέα, tasks, τιμολόγια και στοιχεία έργου.",
            parameters: jsonSchema,
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_project_structure" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    let suggestions: ProjectSuggestion;
    if (toolCall?.function?.arguments) {
      suggestions = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const textContent = aiResponse.choices?.[0]?.message?.content;
      if (textContent) {
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
        else throw new Error("No structured data in AI response");
      } else {
        throw new Error("No content in AI response");
      }
    }

    console.log(`Analysis complete: ${suggestions.deliverables?.length || 0} deliverables, ${suggestions.tasks?.length || 0} tasks, ${suggestions.invoices?.length || 0} invoices`);

    return new Response(JSON.stringify({ success: true, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error in analyze-project-files:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
