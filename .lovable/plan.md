

# Inline Editing + Πλήρη Στοιχεία + AI Enrichment στη Σελίδα Πελάτη

## Τι λείπει σήμερα

Από τα DB πεδία (`tax_id`, `contact_phone`, `secondary_phone`, `address`, `contact_email`, `tags`, `notes`) **καμία** δεν εμφανίζεται στη σελίδα του πελάτη. Όλα κρύβονται πίσω από το dialog "Επεξεργασία". Δεν υπάρχει inline editing — κάθε αλλαγή (όνομα, website, sector, status) απαιτεί άνοιγμα ολόκληρης της φόρμας.

## Λύση — Τρία τμήματα

### 1. Inline editing παντού

Φτιάχνω **`<InlineEditField>`** ως universal component (text/email/phone/url/textarea/select), και το χρησιμοποιώ:

| Σημείο | Πεδία που γίνονται inline-editable |
|--------|-------------------------------------|
| `ClientSmartHeader` | `name` (click-to-edit στον τίτλο), `sector`, `status` (badges → dropdown on click), `logo_url` (click στο avatar → upload) |
| **Νέο** `ClientBusinessInfoCard` | `tax_id`, `contact_email`, `contact_phone`, `secondary_phone`, `address`, `tags` |
| `ClientWebsitesCard` | `website` (primary) + `additional_websites[]` editable inline (add/remove rows) |
| `ClientStrategyCard` | strategy fields ήδη υπάρχουν → γίνονται inline |

UX: hover δείχνει pencil icon, click ανοίγει field, `Enter` save / `Esc` cancel, `blur` save. Optimistic update + Supabase patch + toast. Permission check: μόνο `isAdmin || isManager`.

Το παλιό `ClientForm` dialog **μένει** ως "Πλήρης επεξεργασία" fallback (κουμπί στο header), γιατί καλύπτει αρχικό setup και bulk JSONB πεδία.

### 2. Νέα κάρτα "Στοιχεία Επιχείρησης"

Πάνω αριστερά στο grid (πάνω από Websites). Δείχνει:

```text
ΑΦΜ          [123456789]    🔮 AI Enrich
Email        [info@…]
Τηλέφωνο     [+30 …]
Δευτ. Τηλ    [—]
Διεύθυνση    [—]
Tags         [marketing] [b2b] [+]
```

Όλα inline-editable. Όπου κενό → placeholder "Προσθήκη…".

### 3. AI Client Enrichment

Νέο edge function **`enrich-client`** (Lovable AI Gateway, default `google/gemini-3-flash-preview`).

**Trigger points** (Sparkles button δίπλα στο πεδίο):
- δίπλα στο **Website** στο `ClientWebsitesCard`
- δίπλα στο **ΑΦΜ** στο νέο `ClientBusinessInfoCard`
- "Enrich with AI" button στο SmartHeader (έξυπνη πρόταση που κάνει και τα δύο)

**Flow**:
```text
Click "Enrich"
  ↓
enrich-client edge function:
  1. Αν υπάρχει website → Firecrawl scrape (markdown + branding format)
     → AI extract: company description, sector, address, phone, emails, social, logo URL
  2. Αν υπάρχει ΑΦΜ (ΕΛ) → AI lookup μέσω web search (Perplexity sonar)
     → company name, address, sector, website (cross-validate)
  3. Επιστρέφει structured JSON με προτεινόμενα πεδία + confidence + sources
  ↓
Modal "AI Suggestions" — checkbox-list με τις προτάσεις
  ↓
User επιλέγει τι θέλει να εφαρμοστεί → bulk update
  ↓
Logo: αν Firecrawl branding έδωσε logo URL → fetch + upload σε `project-files` storage
  → set `clients.logo_url`
```

**Ασφάλεια & κόστος**:
- Rate-limit: max 10 enrichments/μέρα/εταιρεία
- `FIRECRAWL_API_KEY`, `PERPLEXITY_API_KEY`, `LOVABLE_API_KEY` ήδη στα secrets ✓
- Όλα τα suggestions περνούν από user approval — **καμία αυτόματη εγγραφή**

## Αρχιτεκτονική

```text
ClientDetail.tsx (refactor: optimistic update handler)
    ├── ClientSmartHeader (inline name/status/sector/avatar)
    ├── ClientBusinessInfoCard ◄── NEW
    │       └── AIEnrichButton (target: tax_id)
    ├── ClientWebsitesCard (inline + AIEnrichButton target: website)
    ├── ClientSocialCard (inline)
    ├── ClientAdAccountsCard (inline)
    └── ClientStrategyCard (inline)

src/components/clients/
    ├── InlineEditField.tsx ◄── NEW (universal)
    ├── AIEnrichButton.tsx ◄── NEW
    ├── AIEnrichDialog.tsx ◄── NEW (review suggestions)
    └── detail/ClientBusinessInfoCard.tsx ◄── NEW

src/hooks/useClientUpdate.ts ◄── NEW (mutation με optimistic + invalidation)

supabase/functions/enrich-client/ ◄── NEW
    └── index.ts (Firecrawl + Perplexity + Lovable AI orchestration)
```

## Τι ΔΕΝ αλλάζει

- DB schema (όλα τα πεδία υπάρχουν ήδη)
- `ClientForm` dialog — μένει ως fallback πλήρους επεξεργασίας
- RLS, permissions
- Άλλα subcomponents (Projects, Tasks, Files, Briefs, Team)

## Ερωτήσεις πριν προχωρήσω

<lov-actions>
<lov-suggestion message="Συνέχισε με όλα τα 3 βήματα μαζί όπως είναι (inline editing + Business Info card + AI enrichment με Firecrawl & Perplexity).">Όλα μαζί, ως έχει</lov-suggestion>
<lov-suggestion message="Ξεκίνα μόνο με inline editing + Business Info card. Το AI enrichment θα το κάνουμε σε δεύτερη φάση.">Πρώτα inline + Business Info</lov-suggestion>
<lov-suggestion message="Για το ΑΦΜ lookup χρησιμοποίησε ΜΟΝΟ Perplexity (όχι Firecrawl για website) — απλούστερη και φθηνότερη υλοποίηση.">Μόνο Perplexity για AI</lov-suggestion>
<lov-suggestion message="Πρόσθεσε και πεδίο ΓΕΜΗ, ΔΟΥ, νόμιμος εκπρόσωπος στην κάρτα Στοιχεία Επιχείρησης (χρειάζεται migration).">Επέκτεινε με ΓΕΜΗ/ΔΟΥ</lov-suggestion>
</lov-actions>
