import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectSuggestion {
  deliverables: Array<{
    name: string;
    description: string;
    due_date?: string;
    budget?: number;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    due_date?: string;
  }>;
  invoices: Array<{
    description: string;
    amount: number;
    due_date?: string;
  }>;
  projectSummary: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileContents, projectName, projectBudget } = await req.json();

    if (!fileContents || fileContents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No file contents provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${fileContents.length} files for project: ${projectName}`);

    const systemPrompt = `Είσαι ειδικός αναλυτής έργων για ένα agency. Αναλύεις αρχεία (προκηρύξεις, συμβάσεις, RFPs, κλπ) και προτείνεις δομημένα δεδομένα για τη διαχείριση του έργου.

Με βάση τα αρχεία που θα λάβεις, πρέπει να εξάγεις:
1. Παραδοτέα (deliverables) - τι πρέπει να παραδοθεί
2. Tasks - συγκεκριμένες εργασίες για κάθε παραδοτέο
3. Προτεινόμενα τιμολόγια - πότε και πόσο να τιμολογηθεί
4. Σύντομη περίληψη του έργου

Βασίσου στο περιεχόμενο των αρχείων για ημερομηνίες και ποσά. Αν δεν υπάρχουν συγκεκριμένες ημερομηνίες, πρότεινε λογικές προθεσμίες.`;

    const userPrompt = `Έργο: ${projectName}
Προϋπολογισμός: €${projectBudget || 'Μη καθορισμένο'}

Περιεχόμενα αρχείων:
${fileContents.map((f: any, i: number) => `--- Αρχείο ${i + 1}: ${f.fileName} ---\n${f.content}\n`).join('\n')}

Ανάλυσε τα παραπάνω και δώσε προτάσεις.`;

    // Use tool calling for structured output
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
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_project_structure",
              description: "Επιστρέφει δομημένες προτάσεις για παραδοτέα, tasks και τιμολόγια.",
              parameters: {
                type: "object",
                properties: {
                  deliverables: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Όνομα παραδοτέου" },
                        description: { type: "string", description: "Περιγραφή" },
                        due_date: { type: "string", description: "Προθεσμία (YYYY-MM-DD)" },
                        budget: { type: "number", description: "Εκτιμώμενο κόστος" }
                      },
                      required: ["name", "description"]
                    }
                  },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Τίτλος task" },
                        description: { type: "string", description: "Περιγραφή" },
                        due_date: { type: "string", description: "Προθεσμία (YYYY-MM-DD)" },
                        deliverable_index: { type: "number", description: "Index παραδοτέου (0-based)" }
                      },
                      required: ["title", "description"]
                    }
                  },
                  invoices: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string", description: "Περιγραφή τιμολογίου" },
                        amount: { type: "number", description: "Ποσό" },
                        due_date: { type: "string", description: "Ημ/νία λήξης (YYYY-MM-DD)" }
                      },
                      required: ["description", "amount"]
                    }
                  },
                  projectSummary: { 
                    type: "string", 
                    description: "Σύντομη περίληψη του έργου (2-3 προτάσεις)" 
                  }
                },
                required: ["deliverables", "tasks", "invoices", "projectSummary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_project_structure" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const suggestions: ProjectSuggestion = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-project-files:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
