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
    deliverable_index?: number;
  }>;
  invoices: Array<{
    description: string;
    amount: number;
    due_date?: string;
  }>;
  projectSummary: string;
  suggestedProjectDetails?: {
    description?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
  };
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

    const systemPrompt = `Είσαι ειδικός αναλυτής έργων για ένα agency που διαχειρίζεται διαγωνισμούς, συμβάσεις και έργα. Αναλύεις αρχεία (προκηρύξεις, συμβάσεις, RFPs, τεχνικές προδιαγραφές κλπ) και εξάγεις δομημένα δεδομένα.

ΟΔΗΓΙΕΣ ΑΝΑΛΥΣΗΣ:

1. ΠΑΡΑΔΟΤΕΑ (Deliverables):
   - Αναζήτησε ενότητες με τίτλους όπως: "Παραδοτέα", "Deliverables", "Φάσεις", "Work Packages", "Πακέτα Εργασίας"
   - Κάθε παραδοτέο πρέπει να έχει σαφή περιγραφή
   - Αν υπάρχουν προθεσμίες ανά παραδοτέο, εξάγε τις
   - Αν υπάρχουν κόστη/budgets ανά παραδοτέο, εξάγε τα
   - Τυπικά παραδοτέα: Μελέτες, Εκθέσεις, Λογισμικό, Εκπαίδευση, Πιλοτικές Εφαρμογές

2. ΕΡΓΑΣΙΕΣ (Tasks):
   - Εξάγε συγκεκριμένες εργασίες από κάθε παραδοτέο
   - Σύνδεσε κάθε task με το αντίστοιχο παραδοτέο (deliverable_index)
   - Πρότεινε λογικές ημερομηνίες αν δεν υπάρχουν

3. ΤΙΜΟΛΟΓΙΑ (Invoices):
   - Αναζήτησε ενότητες για πληρωμές, τιμολόγηση, δόσεις
   - Συνήθεις δομές: Προκαταβολή, Ενδιάμεσες πληρωμές, Τελική πληρωμή
   - Αν δεν υπάρχουν συγκεκριμένες πληρωμές, πρότεινε: 30% προκαταβολή, 40% ενδιάμεσα, 30% τέλος

4. ΣΤΟΙΧΕΙΑ ΕΡΓΟΥ (Project Details):
   - ΠΡΟΫΠΟΛΟΓΙΣΜΟΣ: Ψάξε για ποσά, budget, τιμή, κόστος, αμοιβή
   - ΗΜΕΡΟΜΗΝΙΕΣ: Ψάξε για ημερομηνία έναρξης, λήξης, διάρκεια, χρονοδιάγραμμα
   - ΠΕΡΙΓΡΑΦΗ: Σύνοψη του αντικειμένου του έργου

ΜΟΡΦΗ ΗΜΕΡΟΜΗΝΙΩΝ: YYYY-MM-DD (π.χ. 2026-06-30)
ΜΟΡΦΗ ΠΟΣΩΝ: Αριθμός χωρίς σύμβολα (π.χ. 50000)

Αν κάποια πληροφορία δεν υπάρχει στα αρχεία, ΜΗΝ την συμπεριλάβεις - άφησε το πεδίο κενό.`;

    const userPrompt = `Έργο: ${projectName}
${projectBudget ? `Γνωστός Προϋπολογισμός: €${projectBudget}` : 'Προϋπολογισμός: Να εξαχθεί από τα αρχεία'}

=== ΠΕΡΙΕΧΟΜΕΝΑ ΑΡΧΕΙΩΝ ===
${fileContents.map((f: any, i: number) => `
--- Αρχείο ${i + 1}: ${f.fileName} ---
${f.content}
`).join('\n')}
=== ΤΕΛΟΣ ΑΡΧΕΙΩΝ ===

Ανάλυσε προσεκτικά τα παραπάνω αρχεία και εξάγε:
1. Όλα τα παραδοτέα με τις προθεσμίες και τα budgets τους
2. Tasks για κάθε παραδοτέο
3. Πρόγραμμα πληρωμών/τιμολογίων
4. Γενικά στοιχεία του έργου (budget, ημερομηνίες, περιγραφή)`;

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
              description: "Επιστρέφει δομημένες προτάσεις για παραδοτέα, tasks, τιμολόγια και στοιχεία έργου.",
              parameters: {
                type: "object",
                properties: {
                  deliverables: {
                    type: "array",
                    description: "Λίστα παραδοτέων του έργου",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Όνομα/τίτλος παραδοτέου (π.χ. 'Π1 - Μελέτη Εφαρμογής')" },
                        description: { type: "string", description: "Αναλυτική περιγραφή του παραδοτέου" },
                        due_date: { type: "string", description: "Προθεσμία παράδοσης (YYYY-MM-DD)" },
                        budget: { type: "number", description: "Εκτιμώμενο κόστος σε ευρώ" }
                      },
                      required: ["name", "description"]
                    }
                  },
                  tasks: {
                    type: "array",
                    description: "Λίστα εργασιών για την υλοποίηση",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Τίτλος εργασίας" },
                        description: { type: "string", description: "Περιγραφή της εργασίας" },
                        due_date: { type: "string", description: "Προθεσμία (YYYY-MM-DD)" },
                        deliverable_index: { type: "number", description: "Index του σχετικού παραδοτέου (0-based), αν υπάρχει" }
                      },
                      required: ["title", "description"]
                    }
                  },
                  invoices: {
                    type: "array",
                    description: "Πρόγραμμα πληρωμών/τιμολογίων",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string", description: "Περιγραφή τιμολογίου (π.χ. 'Προκαταβολή 30%')" },
                        amount: { type: "number", description: "Ποσό σε ευρώ" },
                        due_date: { type: "string", description: "Ημ/νία λήξης πληρωμής (YYYY-MM-DD)" }
                      },
                      required: ["description", "amount"]
                    }
                  },
                  suggestedProjectDetails: {
                    type: "object",
                    description: "Προτεινόμενα στοιχεία για τη φόρμα του έργου",
                    properties: {
                      description: { type: "string", description: "Σύντομη περιγραφή του έργου (2-3 προτάσεις)" },
                      start_date: { type: "string", description: "Ημ/νία έναρξης (YYYY-MM-DD)" },
                      end_date: { type: "string", description: "Ημ/νία λήξης (YYYY-MM-DD)" },
                      budget: { type: "number", description: "Συνολικός προϋπολογισμός σε ευρώ" }
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
