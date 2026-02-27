
# Brain - AI Intelligence Hub με NLP & Neuromarketing

## Concept

Το Brain αναλύει τα δεδομένα της εταιρείας (projects, clients, tasks, financials, team) και παράγει τεκμηριωμένα insights χρησιμοποιώντας:

- **NLP μεθόδους**: Sentiment analysis σε σχόλια/notes πελατών, keyword extraction από briefs/deliverables, topic clustering για αναγνώριση patterns, intent detection σε επικοινωνίες
- **Neuromarketing τακτικές**: Framing effects (παρουσίαση δεδομένων με loss aversion), anchoring (σύγκριση με benchmarks), social proof (τι κάνουν παρόμοιοι πελάτες), scarcity/urgency triggers (deadlines, budget windows), reciprocity (upsell βασισμένο σε αξία που ήδη δόθηκε)
- **Perplexity** (ήδη συνδεδεμένο): Market intelligence, industry trends, competitor analysis
- **Firecrawl**: Scraping client websites/social για context enrichment

## Database

### Νέος πίνακας: `brain_insights`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| company_id | uuid FK | Εταιρεία |
| category | text | strategic / sales / productivity / market / alert / neuro |
| subcategory | text | upsell / cross_sell / retention / framing / anchoring / sentiment |
| priority | text | high / medium / low |
| title | text | Τίτλος insight |
| body | text | Πλήρες κείμενο (markdown) |
| evidence | jsonb | Array links: [{type, id, name, url}] |
| nlp_metadata | jsonb | Sentiment scores, keywords, topics |
| neuro_tactic | text | Ποια neuromarketing τακτική εφαρμόζεται |
| neuro_rationale | text | Γιατί αυτή η τακτική λειτουργεί εδώ |
| market_context | text | External data (Perplexity/Firecrawl) |
| citations | jsonb | URLs πηγών |
| is_dismissed | boolean | Ο χρήστης το απέρριψε |
| is_actioned | boolean | Ο χρήστης ενήργησε |
| created_at | timestamptz | |

RLS: Μόνο active users της ίδιας εταιρείας βλέπουν τα insights.

## Edge Function: `brain-analyze`

Η κεντρική λογική ανάλυσης:

### Βήμα 1: Data Aggregation
Fetch από τη βάση (με service role):
- Projects: status, budget, progress, overdue tasks, margins
- Clients: services, revenue, activity frequency, last contact
- Tasks: overdue count, workload per user, completion rates
- Financials: revenue trends, expense ratios, profitability per client
- Comments/Notes: raw text για NLP analysis

### Βήμα 2: NLP Processing (μέσω Gemini tool calling)
Το AI θα εκτελεί NLP ανάλυση μέσω structured tool calls:
- **Sentiment Analysis**: Αξιολόγηση sentiment σε client communications/notes
- **Keyword Extraction**: Αναγνώριση key topics από project descriptions/briefs
- **Pattern Recognition**: Εντοπισμός μοτίβων (π.χ. πελάτης που μειώνει engagement)
- **Intent Detection**: Τι "θέλει" πραγματικά ο πελάτης βάσει ιστορικού

### Βήμα 3: Market Intelligence
- **Perplexity**: Industry trends, competitor moves, market opportunities σχετικά με τους κλάδους των πελατών
- **Firecrawl** (αν συνδεθεί): Scrape client websites για changes, new content, competitor activity

### Βήμα 4: Neuromarketing-driven Insight Generation
Το AI χρησιμοποιεί tool calling για structured output, εφαρμόζοντας:

```text
Neuromarketing Tactics στα insights:
1. Loss Aversion: "Ο πελάτης X χάνει ~€5K/μήνα χωρίς SEO" αντί "Θα κερδίσει €5K"
2. Anchoring: "Παρόμοιοι πελάτες ξοδεύουν 3x περισσότερο σε digital"
3. Social Proof: "Το 80% των πελατών σας στο retail έχουν και influencer campaigns"
4. Scarcity: "Η προσφορά Google Ads Q1 λήγει σε 2 εβδομάδες"
5. Reciprocity: "Μετά το +30% ROI στο Social, ιδανική στιγμή για upsell"
6. Peak-End Rule: Πρόταση follow-up μετά από successful project delivery
7. Decoy Effect: Παρουσίαση 3 πακέτων (Basic/Pro/Enterprise) στο upsell
```

### Βήμα 5: Firecrawl Integration
Αν υπάρχει Firecrawl connector:
- Scrape client websites για αλλαγές
- Ανάλυση competitor presence
- Εντοπισμός gaps στο digital footprint πελάτη

Αν δεν υπάρχει: graceful skip, μόνο Perplexity + internal data.

## Frontend Components

### `src/pages/Brain.tsx`
Κεντρική σελίδα με:
- Animated brain pulse visualization (neural network aesthetic)
- Summary stats bar (πόσα insights, κατηγορίες)
- Category filter chips
- Scrollable insight cards feed
- "Analyze Now" button

### `src/components/brain/BrainPulse.tsx`
Animated SVG component:
- Κεντρικό brain icon με concentric pulse rings
- Glow effect κατά τη διάρκεια analysis
- Status text ("Αναλύω 12 projects...")

### `src/components/brain/BrainInsightCard.tsx`
Κάθε insight card περιλαμβάνει:
- Category badge + Neuro tactic badge
- Priority indicator (color-coded)
- Title + body (markdown rendered)
- Evidence links (clickable, navigate εντός app)
- Neuromarketing rationale (expandable tooltip)
- Market citations (external links)
- Action buttons: "Dismiss" / "Take Action" / "Share"

### `src/components/brain/BrainCategoryFilter.tsx`
Filter chips: All | Strategic | Sales | Productivity | Market | Alerts | Neuro

## Sidebar & Routing

- Route: `/brain` (αντικαθιστά `/intelligence/ai-insights`)
- Sidebar: Νέο entry "Brain" στην Intelligence category με Brain icon
- Redirect: `/intelligence/ai-insights` -> `/brain`

## Edge Functions & Config

### Νέα function: `brain-analyze`
- Χρησιμοποιεί LOVABLE_API_KEY (Gemini) + PERPLEXITY_API_KEY
- Tool calling για structured insight output
- NLP + neuromarketing logic ενσωματωμένα στο system prompt
- Αποθήκευση insights στη βάση

### Firecrawl
Θα ελέγξουμε αν υπάρχει Firecrawl connector. Αν όχι, θα ζητήσουμε σύνδεση. Αν ο χρήστης δεν θέλει, η λειτουργία θα δουλέψει μόνο με Perplexity + internal data.

### config.toml update
```text
[functions.brain-analyze]
verify_jwt = false
```

## Αρχεία

| Ενέργεια | Αρχείο |
|----------|--------|
| Migration | `brain_insights` table + RLS |
| Νέο | `supabase/functions/brain-analyze/index.ts` |
| Νέο | `src/pages/Brain.tsx` |
| Νέο | `src/components/brain/BrainPulse.tsx` |
| Νέο | `src/components/brain/BrainInsightCard.tsx` |
| Νέο | `src/components/brain/BrainCategoryFilter.tsx` |
| Τροποποίηση | `src/App.tsx` - route /brain |
| Τροποποίηση | `src/components/layout/AppSidebar.tsx` - Brain entry |

## Ροή Χρήστη

```text
1. Πατάει "Brain" στο sidebar (Intelligence section)
2. Βλέπει animated brain + τελευταία insights (αν υπάρχουν)
3. Πατάει "Analyze Now" -> brain pulse animation starts
4. Edge function τρέχει (~10-15 sec):
   - Aggregates data
   - NLP analysis (sentiment, keywords, patterns)
   - Perplexity market search
   - Firecrawl client website check (αν υπάρχει)
   - Generates insights με neuromarketing framing
5. Insights εμφανίζονται progressively
6. Κάθε card έχει:
   - Τεκμηριωμένη πρόταση
   - Clickable links σε clients/projects/users
   - Neuro tactic explanation (γιατί αυτή η προσέγγιση)
   - Market citations (εξωτερικές πηγές)
7. Dismiss / Take Action / Share
```
