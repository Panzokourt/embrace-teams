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
    // Get API Key and Request Data
    // ============================================
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    // Limit file content size (2MB total for all files)
    const maxTotalContentLength = 2000000; // 2MB
    const maxSingleFileLength = 500000; // 500KB per file - will truncate if larger
    
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
        JSON.stringify({ error: "Total file content too large. Maximum 2MB allowed across all files." }),
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

    const systemPrompt = `Είσαι ειδικός αναλυτής εγγράφων για εταιρεία ΕΠΙΚΟΙΝΩΝΙΑΣ / MARKETING / ΔΙΑΦΗΜΙΣΗΣ.

═══════════════════════════════════════════════════════════════════
⚠️ ΚΡΙΣΙΜΗ ΔΙΑΦΟΡΟΠΟΙΗΣΗ - ΔΙΑΒΑΣΕ ΠΟΛΥ ΠΡΟΣΕΚΤΙΚΑ
═══════════════════════════════════════════════════════════════════

ΤΟ ΕΓΓΡΑΦΟ ΠΕΡΙΓΡΑΦΕΙ ΣΥΝΗΘΩΣ ΔΥΟ ΔΙΑΦΟΡΕΤΙΚΑ ΠΡΑΓΜΑΤΑ:

1. ΤΟ ΕΡΓΟ/ΠΡΟΪΟΝ ΤΟΥ ΠΕΛΑΤΗ (ΝΑ ΤΟ ΑΓΝΟΗΣΕΙΣ ως παραδοτέα):
   - Τι είναι το έργο του πελάτη (π.χ. "Μεταπτυχιακό πρόγραμμα", "Δημόσια υπηρεσία", "Ερευνητικό πρόγραμμα")
   - Τα χαρακτηριστικά, στόχοι, ομάδες-στόχου του έργου
   - Τεχνικές προδιαγραφές του ίδιου του έργου
   - ΑΥΤΑ ΔΕΝ ΕΙΝΑΙ ΤΑ ΔΙΚΑ ΜΑΣ ΠΑΡΑΔΟΤΕΑ!

2. ΤΙ ΖΗΤΑΕΙ Ο ΠΕΛΑΤΗΣ ΑΠΟ ΕΜΑΣ (ΑΥΤΑ ΕΙΝΑΙ ΤΑ ΠΑΡΑΔΟΤΕΑ ΜΑΣ):
   - Υπηρεσίες επικοινωνίας, προώθησης, marketing
   - Δημιουργία περιεχομένου (videos, banners, posts)
   - Διαχείριση social media, διαφημιστικές καμπάνιες
   - Σχεδιασμός υλικών (λογότυπα, έντυπα, websites)
   - Οργάνωση εκδηλώσεων/events
   - Media buying, digital marketing
   - ΑΥΤΑ ΕΙΝΑΙ ΤΑ ΠΑΡΑΔΟΤΕΑ ΠΟΥ ΠΡΕΠΕΙ ΝΑ ΕΞΑΓΕΙΣ!

ΠΑΡΑΔΕΙΓΜΑ ΣΩΣΤΗΣ ΚΑΤΑΝΟΗΣΗΣ:
─────────────────────────────────────────────────────────────────
Έγγραφο: "Το Πανεπιστήμιο Χ προσφέρει Μεταπτυχιακό Πρόγραμμα στην
Πληροφορική με 5 εξάμηνα και 120 ECTS. Ζητείται ανάδοχος για την
προώθηση του προγράμματος με: Π1-Στρατηγική Επικοινωνίας, 
Π2-Δημιουργία Video Spot, Π3-Social Media Campaign."

✅ ΣΩΣΤΗ ΕΞΑΓΩΓΗ ΠΑΡΑΔΟΤΕΩΝ:
- Π1 - Στρατηγική Επικοινωνίας
- Π2 - Δημιουργία Video Spot  
- Π3 - Social Media Campaign

❌ ΛΑΘΟΣ ΕΞΑΓΩΓΗ (ΝΑ ΜΗΝ ΓΙΝΕΙ):
- Μεταπτυχιακό Πρόγραμμα (αυτό είναι το έργο του πελάτη!)
- Εξάμηνα σπουδών (δεν μας αφορά)
- ECTS (δεν είναι δικό μας παραδοτέο)
─────────────────────────────────────────────────────────────────

ΛΕΞΕΙΣ-ΚΛΕΙΔΙΑ ΓΙΑ ΤΑ ΔΙΚΑ ΜΑΣ ΠΑΡΑΔΟΤΕΑ (επικοινωνία/marketing):
- "Επικοινωνιακό πλάνο", "Στρατηγική επικοινωνίας", "Communication plan"
- "Καμπάνια", "Campaign", "Διαφημιστική ενέργεια"
- "Video spot", "Ραδιοφωνικό spot", "Banners", "Social media posts"
- "Σχεδιασμός logo", "Εταιρική ταυτότητα", "Branding"
- "Website", "Landing page", "Microsite"
- "Διαχείριση social media", "Community management"
- "Media plan", "Media buying", "Αγορά χρόνου"
- "Press kit", "Press release", "Δελτία τύπου"
- "Event", "Εκδήλωση", "Ημερίδα"
- "Έντυπα", "Brochure", "Φυλλάδια", "Αφίσες"
- "Digital campaign", "Google Ads", "Facebook Ads"
- "Influencer marketing", "KOL activation"
- "Content creation", "Δημιουργία περιεχομένου"

═══════════════════════════════════════════════════════════════════
ΚΑΝΟΝΕΣ ΑΝΑΓΝΩΡΙΣΗΣ ΠΑΡΑΔΟΤΕΩΝ (DELIVERABLES)
═══════════════════════════════════════════════════════════════════

ΨΑΞΕ ΓΙΑ SECTIONS ΠΟΥ ΠΕΡΙΓΡΑΦΟΥΝ ΤΙ ΖΗΤΑΕΙ Ο ΠΕΛΑΤΗΣ:
- "Ζητούμενες υπηρεσίες:", "Αντικείμενο ανάθεσης:"
- "Το έργο του αναδόχου περιλαμβάνει:"
- "Υπηρεσίες επικοινωνίας:", "Υπηρεσίες προβολής:"
- "Παραδοτέα του αναδόχου:", "Deliverables:"

PATTERNS ΑΡΙΘΜΗΣΗΣ ΠΑΡΑΔΟΤΕΩΝ:
- "Π1", "Π2", "Π.1", "Π.2", "P1", "P2", "D1", "D2", "WP1", "WP2"
- Πίνακες με στήλες: "Παραδοτέο", "Περιγραφή", "Προθεσμία"

ΕΞΑΓΩΓΗ:
- Αντέγραψε τον τίτλο ΑΚΡΙΒΩΣ όπως είναι στο έγγραφο
- Κράτα την αρίθμηση (Π1, Π2, κλπ)
- Η περιγραφή πρέπει να είναι από το έγγραφο, όχι δική σου

═══════════════════════════════════════════════════════════════════
ΚΑΝΟΝΕΣ ΓΙΑ ΗΜΕΡΟΜΗΝΙΕΣ & BUDGET
═══════════════════════════════════════════════════════════════════

ΗΜΕΡΟΜΗΝΙΕΣ (μετατροπή σε YYYY-MM-DD):
- "30/06/2026" → "2026-06-30"
- "Ιούνιος 2026" → "2026-06-30" (τελευταία μέρα μήνα)
- "εντός 3 μηνών" → υπολόγισε από σήμερα

BUDGET:
- "50.000€" → 50000 (αριθμός χωρίς σύμβολα)
- Χρησιμοποίησε το καθαρό ποσό (χωρίς ΦΠΑ) αν αναφέρεται

═══════════════════════════════════════════════════════════════════
TASKS - ΔΗΜΙΟΥΡΓΙΑ ΜΕ ΒΑΣΗ ΤΑ ΠΑΡΑΔΟΤΕΑ
═══════════════════════════════════════════════════════════════════

Για ΚΑΘΕ παραδοτέο επικοινωνίας, δημιούργησε 2-5 tasks:
- Π.χ. για "Video Spot": Briefing, Σενάριο, Γυρίσματα, Post-production
- Π.χ. για "Social Media Campaign": Στρατηγική, Content calendar, Creatives

═══════════════════════════════════════════════════════════════════
ΑΞΙΟΛΟΓΗΣΗ ΒΕΒΑΙΟΤΗΤΑΣ
═══════════════════════════════════════════════════════════════════

- HIGH: Βρήκα ΞΕΚΑΘΑΡΑ παραδοτέα επικοινωνίας στο έγγραφο
- MEDIUM: Συμπέρανα τα παραδοτέα από τις απαιτήσεις
- LOW: Δεν βρήκα σαφή αναφορά σε υπηρεσίες επικοινωνίας

═══════════════════════════════════════════════════════════════════

ΜΗΝ ΕΦΕΥΡΙΣΚΕΙΣ ΠΑΡΑΔΟΤΕΑ! Αν δεν βρεις ξεκάθαρα παραδοτέα ΕΠΙΚΟΙΝΩΝΙΑΣ/MARKETING, 
επέστρεψε άδεια λίστα και ρώτα τον χρήστη: "Ποιες υπηρεσίες επικοινωνίας αναλαμβάνετε;"${focusPromptSection}${reanalysisSection}${questionsSection}`;

    const userPrompt = `Έργο: ${projectName}
${projectBudget ? `Γνωστός Προϋπολογισμός: €${projectBudget}` : 'Προϋπολογισμός: Να εξαχθεί από τα αρχεία'}

=== ΠΕΡΙΕΧΟΜΕΝΑ ΑΡΧΕΙΩΝ ===
${filesToAnalyze.map((f: any, i: number) => `
--- Αρχείο ${i + 1}: ${f.fileName} ---
${f.content}
`).join('\n')}
=== ΤΕΛΟΣ ΑΡΧΕΙΩΝ ===

Ανάλυσε ΠΟΛΥ ΠΡΟΣΕΚΤΙΚΑ τα παραπάνω αρχεία και εξάγε:
1. Όλα τα παραδοτέα με τις προθεσμίες και τα budgets τους
2. Tasks για κάθε παραδοτέο
3. Πρόγραμμα πληρωμών/τιμολογίων
4. Γενικά στοιχεία του έργου (budget, ημερομηνίες, περιγραφή)
5. Βαθμό βεβαιότητας ανά κατηγορία
${requestQuestions ? '6. Ερωτήσεις επιβεβαίωσης για τον χρήστη' : ''}`;

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
                  },
                  analysisConfidence: {
                    type: "object",
                    description: "Βαθμός βεβαιότητας ανά κατηγορία",
                    properties: {
                      deliverables: { type: "string", enum: ["high", "medium", "low"], description: "Βεβαιότητα για παραδοτέα" },
                      tasks: { type: "string", enum: ["high", "medium", "low"], description: "Βεβαιότητα για tasks" },
                      invoices: { type: "string", enum: ["high", "medium", "low"], description: "Βεβαιότητα για τιμολόγια" },
                      dates: { type: "string", enum: ["high", "medium", "low"], description: "Βεβαιότητα για ημερομηνίες" }
                    }
                  },
                  aiQuestions: {
                    type: "array",
                    description: "Ερωτήσεις προς τον χρήστη για επιβεβαίωση/διευκρίνιση",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["confirmation", "clarification", "suggestion"], description: "Τύπος ερώτησης" },
                        question: { type: "string", description: "Η ερώτηση προς τον χρήστη" },
                        context: { type: "string", description: "Επιπλέον context για την ερώτηση" }
                      },
                      required: ["type", "question"]
                    }
                  },
                  missingInfo: {
                    type: "array",
                    description: "Λίστα πληροφοριών που δεν βρέθηκαν στα αρχεία",
                    items: { type: "string" }
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

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Try to extract from regular message content as fallback
      const messageContent = aiResponse.choices?.[0]?.message?.content;
      if (messageContent) {
        console.log("No tool call, trying to parse message content as JSON");
        try {
          // Try to extract JSON from the message
          const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const suggestions: ProjectSuggestion = JSON.parse(jsonMatch[0]);
            return new Response(
              JSON.stringify({ success: true, suggestions }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (parseError) {
          console.error("Failed to parse message content as JSON:", parseError);
        }
      }
      throw new Error("Η AI δεν επέστρεψε δομημένα δεδομένα. Δοκιμάστε ξανά.");
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