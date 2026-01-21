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
    // Get API Key - USE ONLY GEMINI (no Perplexity for document analysis)
    // Perplexity does web search instead of analyzing documents
    // ============================================
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    console.log("Using AI provider: Gemini (google/gemini-2.5-flash) for document analysis");

    const { 
      fileContents, 
      projectName, 
      projectBudget, 
      projectId,
      additionalContext,
      focusArea,
      focusInstructions,
      isReanalysis,
      requestQuestions
    } = await req.json();

    // ============================================
    // SECURITY: Authorization Check (if projectId provided)
    // ============================================
    if (projectId) {
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
    }

    // ============================================
    // Input Validation
    // ============================================
    if (!fileContents || fileContents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No file contents provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gemini has much larger context - allow up to 500KB
    const maxTotalContentLength = 500000;
    const maxSingleFileLength = 250000;
    
    // Truncate large files and calculate total size
    const processedFiles = fileContents.map((f: any) => {
      let content = f.content || '';
      if (content.length > maxSingleFileLength) {
        console.log(`Truncating large file: ${f.fileName} (${content.length} -> ${maxSingleFileLength} chars)`);
        content = content.substring(0, maxSingleFileLength) + '\n\n[... Truncated - file too large ...]';
      }
      return { ...f, content };
    });
    
    const totalContentLength = processedFiles.reduce((acc: number, f: any) => acc + (f.content?.length || 0), 0);
    if (totalContentLength > maxTotalContentLength) {
      return new Response(
        JSON.stringify({ error: "Total file content too large. Maximum 500KB allowed across all files." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use processed files from here on
    const filesToAnalyze = processedFiles;

    console.log(`Analyzing ${filesToAnalyze.length} files for project: ${projectName}, total size: ${totalContentLength} chars, focus: ${focusArea || 'all'}, reanalysis: ${isReanalysis || false}`);

    // Build dynamic system prompt based on focus area and reanalysis mode
    let focusPromptSection = '';
    if (focusInstructions) {
      focusPromptSection = `\n\nΕΙΔΙΚΗ ΕΣΤΙΑΣΗ: ${focusInstructions}`;
    }

    let reanalysisSection = '';
    if (isReanalysis && additionalContext) {
      reanalysisSection = `\n\nΠΡΟΣΟΧΗ - ΕΠΑΝΑΝAΛΥΣΗ:\n${additionalContext}`;
    }

    let questionsSection = '';
    if (requestQuestions) {
      questionsSection = `\n\nΕΡΩΤΗΣΕΙΣ ΕΠΙΒΕΒΑΙΩΣΗΣ:
Μετά την ανάλυση, δημιούργησε ερωτήσεις για τον χρήστη:
- Ρώτα αν τα αποτελέσματα είναι σωστά
- Αν λείπουν σημαντικές πληροφορίες (budget, ημερομηνίες), ρώτα
- Πρότεινε βελτιώσεις αν χρειάζεται (π.χ. περισσότερα tasks)`;
    }

    const systemPrompt = `Είσαι ειδικός αναλυτής εγγράφων για δημόσιους διαγωνισμούς και έργα επικοινωνίας/marketing. 

ΣΤΟΧΟΣ: Ανάλυσε το έγγραφο και εξάγε ΟΛΑ τα παραδοτέα, προθεσμίες, ποσά και τεχνικές απαιτήσεις.

═══════════════════════════════════════════════════════════════════
ΠΑΡΑΔΟΤΕΑ (DELIVERABLES)
═══════════════════════════════════════════════════════════════════

Ψάξε για ΟΤΙΔΗΠΟΤΕ μοιάζει με παραδοτέο ή φάση εργασίας:
- Αριθμημένα: "Π1", "Π2", "Π.1", "P1", "D1", "WP1", "Φάση 1"
- Ενότητες: "Ενότητα 1", "Πακέτο Εργασίας", "Work Package"
- Τίτλοι σε πίνακες με στήλες: Περιγραφή, Προθεσμία, Κόστος, Βαρύτητα
- Οτιδήποτε έχει deadline ή budget

ΕΞΑΓΩΓΗ:
- Αντέγραψε τον τίτλο ΑΚΡΙΒΩΣ όπως γράφεται στο έγγραφο
- Κράτα την αρίθμηση (Π1, WP2, κλπ)
- Πρόσθεσε αναλυτική περιγραφή
- due_date σε μορφή YYYY-MM-DD
- budget σε αριθμό χωρίς €

═══════════════════════════════════════════════════════════════════
ΗΜΕΡΟΜΗΝΙΕΣ
═══════════════════════════════════════════════════════════════════

Μετατροπή σε YYYY-MM-DD:
- "30/06/2026" → "2026-06-30"
- "Ιούνιος 2026" → "2026-06-30"
- "30.06.2026" → "2026-06-30"
- "20 Μαΐου 2026" → "2026-05-20"

Ψάξε για:
- Καταληκτική ημερομηνία υποβολής προσφορών
- Διάρκεια σύμβασης
- Χρονοδιάγραμμα παραδοτέων

═══════════════════════════════════════════════════════════════════
ΠΟΣΑ / BUDGET
═══════════════════════════════════════════════════════════════════

ΚΡΙΣΙΜΟ: Εντόπισε τον ΣΥΝΟΛΙΚΟ ΠΡΟΫΠΟΛΟΓΙΣΜΟ του έργου.
- Συνήθως αναφέρεται σε: "Εκτιμώμενη αξία", "Προϋπολογισμός", "Budget"
- Χρησιμοποίησε ποσά ΧΩΡΙΣ ΦΠΑ αν διευκρινίζεται
- Αναγνώρισε και αριθμούς με λέξεις: "εκατόν είκοσι τέσσερις χιλιάδες" = 124000

═══════════════════════════════════════════════════════════════════
ΚΡΙΤΗΡΙΑ ΑΞΙΟΛΟΓΗΣΗΣ
═══════════════════════════════════════════════════════════════════

Ψάξε για πίνακα κριτηρίων με:
- Κωδικό (Κ1, Κ2, Κ3)
- Περιγραφή κριτηρίου
- Βαρύτητα/Συντελεστή (%)
- Μέγιστη βαθμολογία

═══════════════════════════════════════════════════════════════════
TASKS
═══════════════════════════════════════════════════════════════════

Για κάθε παραδοτέο, πρότεινε 2-4 συγκεκριμένες εργασίες υλοποίησης.
Αν το έγγραφο αναφέρει ενέργειες, χρησιμοποίησέ τες ακριβώς.

═══════════════════════════════════════════════════════════════════
ΤΙΜΟΛΟΓΙΑ / ΠΛΗΡΩΜΕΣ
═══════════════════════════════════════════════════════════════════

Ψάξε για:
- "Τρόπος πληρωμής", "Δόσεις", "Προκαταβολή"
- Πληρωμές συνδεδεμένες με παραδοτέα
- Αν δεν αναφέρεται: 30% προκαταβολή, 40% ενδιάμεσα, 30% τελική

═══════════════════════════════════════════════════════════════════
CONFIDENCE & QUALITY
═══════════════════════════════════════════════════════════════════

ΒΑΘΜΟΣ ΒΕΒΑΙΟΤΗΤΑΣ:
- HIGH: Βρέθηκε ακριβώς στο κείμενο
- MEDIUM: Συμπέρασμα από το context
- LOW: Υπόθεση

ΣΗΜΑΝΤΙΚΟ: 
- Επέστρεψε ΜΟΝΟ ό,τι υπάρχει στο έγγραφο
- ΜΗΝ φαντάζεσαι παραδοτέα ή ποσά
- Αν δεν βρεις κάτι, άφησε κενή λίστα${focusPromptSection}${reanalysisSection}${questionsSection}`;

    const userPrompt = `Έργο: ${projectName}
${projectBudget ? `Γνωστός Προϋπολογισμός: €${projectBudget}` : 'Προϋπολογισμός: Να εξαχθεί από τα αρχεία'}

═══════════════════════════════════════════════════════════════════
ΠΕΡΙΕΧΟΜΕΝΑ ΑΡΧΕΙΩΝ ΓΙΑ ΑΝΑΛΥΣΗ
═══════════════════════════════════════════════════════════════════
${filesToAnalyze.map((f: any, i: number) => `
╔══════════════════════════════════════════════════════════════════╗
║ Αρχείο ${i + 1}: ${f.fileName}
╚══════════════════════════════════════════════════════════════════╝
${f.content}
`).join('\n')}
═══════════════════════════════════════════════════════════════════
ΤΕΛΟΣ ΑΡΧΕΙΩΝ
═══════════════════════════════════════════════════════════════════

ΑΝΑΛΥΣΕ ΠΟΛΥ ΠΡΟΣΕΚΤΙΚΑ τα παραπάνω και εξάγε:
1. ΟΛΑ τα παραδοτέα με τίτλους, περιγραφές, προθεσμίες, budgets
2. Tasks για κάθε παραδοτέο
3. Πρόγραμμα πληρωμών (invoices)
4. Στοιχεία έργου: συνολικό budget, ημερομηνίες, περιγραφή
5. Βαθμό βεβαιότητας ανά κατηγορία
${requestQuestions ? '6. Ερωτήσεις επιβεβαίωσης για τον χρήστη' : ''}`;

    // Define the JSON schema for structured output
    const jsonSchema = {
      type: "object",
      properties: {
        deliverables: {
          type: "array",
          description: "Λίστα παραδοτέων",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Ακριβής τίτλος παραδοτέου (π.χ. 'Π1 - Branding')" },
              description: { type: "string", description: "Αναλυτική περιγραφή" },
              due_date: { type: "string", description: "Προθεσμία (YYYY-MM-DD)" },
              budget: { type: "number", description: "Κόστος σε ευρώ" }
            },
            required: ["name", "description"]
          }
        },
        tasks: {
          type: "array",
          description: "Λίστα εργασιών",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Τίτλος εργασίας" },
              description: { type: "string", description: "Περιγραφή" },
              due_date: { type: "string", description: "Προθεσμία (YYYY-MM-DD)" },
              deliverable_index: { type: "number", description: "Index σχετικού παραδοτέου (0-based)" }
            },
            required: ["title", "description"]
          }
        },
        invoices: {
          type: "array",
          description: "Πρόγραμμα πληρωμών",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Περιγραφή πληρωμής" },
              amount: { type: "number", description: "Ποσό σε ευρώ" },
              due_date: { type: "string", description: "Ημ/νία (YYYY-MM-DD)" }
            },
            required: ["description", "amount"]
          }
        },
        suggestedProjectDetails: {
          type: "object",
          properties: {
            description: { type: "string", description: "Σύντομη περιγραφή έργου" },
            start_date: { type: "string", description: "Ημ/νία έναρξης (YYYY-MM-DD)" },
            end_date: { type: "string", description: "Ημ/νία λήξης (YYYY-MM-DD)" },
            budget: { type: "number", description: "Συνολικός προϋπολογισμός" }
          }
        },
        projectSummary: { type: "string", description: "Σύντομη περίληψη" },
        analysisConfidence: {
          type: "object",
          properties: {
            deliverables: { type: "string", enum: ["high", "medium", "low"] },
            tasks: { type: "string", enum: ["high", "medium", "low"] },
            invoices: { type: "string", enum: ["high", "medium", "low"] },
            dates: { type: "string", enum: ["high", "medium", "low"] }
          }
        },
        aiQuestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["confirmation", "clarification", "suggestion"] },
              question: { type: "string" },
              context: { type: "string" }
            },
            required: ["type", "question"]
          }
        },
        missingInfo: { type: "array", items: { type: "string" } }
      },
      required: ["deliverables", "tasks", "invoices", "projectSummary"]
    };

    // Use Gemini exclusively for document analysis
    console.log("Calling Lovable AI Gateway (Gemini 2.5 Flash)...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
              parameters: jsonSchema
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_project_structure" } },
        temperature: 0.1,
        max_tokens: 16384
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
    console.log("AI Response received, parsing...");

    // Check if the AI provider returned an error in the response body
    if (aiResponse.error) {
      console.error("AI provider error:", aiResponse.error);
      const errorCode = aiResponse.error.code || 500;
      const errorMessage = aiResponse.error.message || "AI provider error";
      const providerName = aiResponse.error.metadata?.provider_name || "AI";
      
      // Handle timeout errors (524)
      if (errorCode === 524) {
        return new Response(
          JSON.stringify({ 
            error: "Η ανάλυση έληξε λόγω μεγάλου μεγέθους αρχείου. Δοκιμάστε με μικρότερο αρχείο ή λιγότερα αρχεία." 
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `${providerName} error: ${errorMessage}` }),
        { status: errorCode >= 400 && errorCode < 600 ? errorCode : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract structured data from the response
    let suggestions: ProjectSuggestion;
    
    const messageContent = aiResponse.choices?.[0]?.message?.content;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      // Gemini returns via tool call
      console.log("Parsing Gemini tool call response...");
      try {
        suggestions = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
        console.log("Raw arguments:", toolCall.function.arguments);
        throw new Error("Αποτυχία ανάλυσης απόκρισης AI. Δοκιμάστε ξανά.");
      }
    } else if (messageContent) {
      // Fallback: try to extract JSON from message content
      console.log("No tool call, trying to parse message content as JSON");
      try {
        // Try direct parse first
        suggestions = JSON.parse(messageContent);
      } catch {
        // Try to extract JSON from markdown code block
        const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                          messageContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          suggestions = JSON.parse(jsonStr);
        } else {
          console.error("No JSON found in response:", messageContent.substring(0, 500));
          throw new Error("Η AI δεν επέστρεψε δομημένα δεδομένα. Δοκιμάστε ξανά.");
        }
      }
    } else {
      console.error("No content in AI response:", JSON.stringify(aiResponse, null, 2));
      throw new Error("Η AI δεν επέστρεψε δομημένα δεδομένα. Δοκιμάστε ξανά.");
    }
    
    // Log summary of what was found
    console.log(`Analysis complete: ${suggestions.deliverables?.length || 0} deliverables, ${suggestions.tasks?.length || 0} tasks, ${suggestions.invoices?.length || 0} invoices`);
    
    if (suggestions.suggestedProjectDetails) {
      console.log(`Project details: budget=${suggestions.suggestedProjectDetails.budget}, end_date=${suggestions.suggestedProjectDetails.end_date}`);
    }

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
