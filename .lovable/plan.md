
# Ολοκληρωμένο Media Plan System — Πλήρης Ανασχεδιασμός

## Τι υπάρχει ήδη & Τι Λείπει

**Υπάρχει**: Ένα βασικό component (`ProjectMediaPlan.tsx`) με table/grid view, AI generation, και CSV export. Η βάση (`media_plan_items`) έχει: `medium`, `placement`, `campaign_name`, `budget`, `actual_cost`, `impressions`, `clicks`, `CTR/CPM/CPC` (computed), `status`.

**Λείπουν κρίσιμα πεδία στη βάση**:
- `objective` — το marketing objective (Awareness, Consideration, Conversion, Retention)
- `phase` — χρονική φάση καμπάνιας (π.χ. "Φάση 1 - Launching")
- `format` — format/size (π.χ. "Video 15sec", "Banner 300x250")
- `frequency` — αριθμός εμφανίσεων ανά χρήστη
- `reach` — εκτιμώμενη reach
- `commission_rate` — ποσοστό προμήθειας agency

**Λείπει η λογική**: Budget allocation per deliverable/objective/channel, AI wizard με ερωτήσεις, σωστή breakdown view, inline editing.

---

## Database Migration

Νέα πεδία στον `media_plan_items`:

```sql
ALTER TABLE public.media_plan_items 
  ADD COLUMN IF NOT EXISTS objective TEXT DEFAULT 'awareness',
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS frequency NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_budget NUMERIC GENERATED ALWAYS AS 
    (budget * (1 - commission_rate / 100)) STORED,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
```

**Δεν αλλάζει** το `medium`, `budget`, `actual_cost`, `impressions`, `clicks`, `ctr`, `cpm`, `cpc` — είναι ήδη σωστά.

---

## Αρχιτεκτονική Νέου Media Plan

### Δομή Κεντρικής Σελίδας

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  📢 Media Plan                                   [Export] [AI Wizard] [+] │
├──────────────────────────────────────────────────────────────────────────┤
│  KPI Strip:                                                              │
│  [Total Budget: €X] [Net (μετά προμ.): €X] [Planned: €X] [Spent: €X]   │
│  [Impressions: X]   [Reach: X]              [CTR avg: X%] [CPM avg: €X] │
├──────────────────────────────────────────────────────────────────────────┤
│  Budget Breakdown Tabs:                                                  │
│  [Ανά Κανάλι] [Ανά Objective] [Ανά Παραδοτέο] [Ανά Φάση]              │
│  ── mini donut chart + bar chart ─────────────────────────────────────  │
├──────────────────────────────────────────────────────────────────────────┤
│  View Toggle: [📋 Spreadsheet] [📊 Pivot] [📅 Timeline]                 │
│  Filters: [Κανάλι ▼] [Objective ▼] [Status ▼] [Φάση ▼] [🔍 Search]    │
├──────────────────────────────────────────────────────────────────────────┤
│  Spreadsheet View (inline editable):                                     │
│  ΚΑΝΆΛΙ | FORMAT | ΦΆΣΗ | OBJECTIVE | ΠΕΡΊΟΔΟΣ | BUDGET | NET | STATUS  │
│  ──────────────────────────────────────────────────────────────────────  │
│  📺 TV   │ Spot 30"│ Φ.1 │ Awareness │ Ιαν-Μαρ │ €50K  │ €42K│ Active │
│  📱 Meta │ Feed    │ Φ.1 │ Conversion│ Ιαν     │ €15K  │ €13K│ Planned│
│  ── ΣΥΝΟΛΟ ─────────────────────────────────────────────── €65K│ €55K  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component: Νέος `ProjectMediaPlan.tsx` (πλήρης επαναγραφή)

### Τμήμα 1: KPI Dashboard Strip

8 KPIs σε grid:
- **Total Budget** (αθροισμα `budget`)
- **Net Budget** (αθροισμα `net_budget` — μετά αφαίρεση commission)
- **Planned** (budget items με status=planned)
- **Πραγματικό Κόστος** (αθροισμα `actual_cost`)
- **Υπόλοιπο** (Total Budget - actual_cost)
- **Impressions** / **Reach** / **Avg CTR**

### Τμήμα 2: Budget Breakdown Visualizations

4 mini views (switchable tabs):
- **Ανά Κανάλι**: Bar chart (Recharts) — ποιο medium πόσο budget
- **Ανά Objective**: Donut chart — Awareness / Consideration / Conversion / Retention
- **Ανά Παραδοτέο**: Horizontal bar — ποιο deliverable πόσο media budget
- **Ανά Φάση**: Stacked bar timeline ανά phase

### Τμήμα 3: Spreadsheet View (κύριος πίνακας)

**Grouping ανά κανάλι** (collapsible sections):
```text
▼ 📺 TV (2 placements) ────────────── Budget: €80K  Actual: €72K
   | Campaign | Format | Φάση | Obj. | Έναρξη | Λήξη | Budget | Net | Actual | Impr. | Clicks | CTR | Status |
   | Summer TV| Spot30"| Φ.1  | Awr. | 1/3    | 31/3 | €50K   | €42K| €48K  | 2.5M  | -      | -   | Active |

▼ 📱 Social Media (3 placements) ──── Budget: €45K  Actual: €30K
   [rows...]

▶ 📻 Radio (0 placements) ────── [Collapsed]
```

**Inline editing**: Κλικ σε cell → edit in-place (Input/Select) → blur/Enter = save
- Budget, actual_cost, impressions, clicks → numeric inputs
- status, objective, phase → select dropdowns
- dates → date pickers

### Τμήμα 4: AI Wizard (Modal)

Αντί για απευθείας generation, **ανοίγει wizard dialog** με 3 βήματα:

**Βήμα 1 — Briefing**:
```
Ποιος είναι ο κύριος στόχος της καμπάνιας;
○ Brand Awareness    ○ Lead Generation
○ Product Launch     ○ Sales / Conversion
○ Retention/Loyalty  ○ Event Promotion

Σε ποιο κοινό στοχεύετε;
[text input]

Ποια είναι η χρονική διάρκεια; [start] → [end]
```

**Βήμα 2 — Media Mix Preferences**:
```
Ποια κανάλια να συμπεριληφθούν; (multi-select)
☑ TV  ☑ Radio  ☑ Digital (Social)  ☑ Digital (Search)
☑ OOH  ☐ Print  ☑ Influencers  ☐ PR

Υπάρχει επιθυμητή κατανομή budget; (optional sliders)
TV ────────────────── 40%
Digital ───────────── 35%
OOH ──────────────── 15%
Other ─────────────── 10%
```

**Βήμα 3 — Review & Generate**:
```
Project: Alpha Bank App Launch
Budget: €95,000 | Net (μετά 15% fee): €80,750
Κανάλια: TV, Digital, OOH
Στόχος: Brand Awareness + App Downloads
Κοινό: 25-44, urban, mobile-first
[Δημιουργία με AI →]
```

### Τμήμα 5: Export

- **Export CSV**: Υπάρχει ήδη (ενισχύεται με τα νέα πεδία)
- **Export Excel-like**: Grouped per channel με subtotals
- **Print View**: Cleaned print stylesheet

---

## Edge Function: `generate-media-plan` (ενισχύεται)

Δέχεται επιπλέον parameters από τον wizard:
```typescript
interface GenerateRequest {
  projectId: string;
  projectName: string;
  projectBudget: number;
  agencyFeePercentage: number;     // NEW
  deliverables: Array<{ id: string; name: string }>;
  campaignObjective: string;       // NEW: "awareness" | "launch" | "conversion" etc.
  targetAudience: string;          // NEW
  campaignDuration: { start: string; end: string }; // NEW
  selectedChannels: string[];      // NEW
  budgetAllocation?: Record<string, number>; // NEW: optional % per channel
}
```

**Βελτιωμένο prompt** (Gemini 2.5 Flash):
- Παράγει `phase` (φάσεις καμπάνιας)
- Παράγει `objective` ανά item
- Παράγει `format` ανά placement
- Παράγει `reach` εκτιμήσεις
- Υπολογίζει `commission_rate` βάσει `agency_fee_percentage` του project
- Κατανέμει budget με βάση τα user preferences (sliders)

---

## Αρχεία που αλλάζουν

| Αρχείο | Τύπος |
|--------|-------|
| **Migration SQL** | Νέα πεδία `objective`, `phase`, `format`, `frequency`, `reach`, `commission_rate`, `sort_order`, `net_budget` |
| `src/components/projects/ProjectMediaPlan.tsx` | **Πλήρης επαναγραφή** |
| `supabase/functions/generate-media-plan/index.ts` | Ενισχυμένος wizard prompt + νέα inputs |
| `src/pages/ProjectDetail.tsx` | Μικρή αλλαγή: αφαίρεση του Card wrapper γύρω από το Media Plan tab (το νέο component έχει δικό του header) + pass `agencyFeePercentage` |

---

## Νέα Media Categories (επεκτεμένες)

```typescript
const MEDIA_CATEGORIES = {
  'TV & Radio': ['TV', 'Radio', 'Streaming Audio', 'Podcast'],
  'Digital Paid': ['Google Ads (Search)', 'Google Ads (Display)', 'YouTube', 'Programmatic'],
  'Social Media': ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'Twitter/X', 'Pinterest'],
  'Outdoor': ['OOH (Billboards)', 'DOOH (Digital OOH)', 'Transit Ads'],
  'Print': ['Εφημερίδες', 'Περιοδικά', 'Advertorial', 'Native Content'],
  'Influencers/PR': ['Influencer', 'Ambassador', 'PR', 'Sponsored Content'],
  'Email/CRM': ['Email Marketing', 'SMS Marketing', 'Push Notifications'],
  'Events': ['Sponsorship', 'Events', 'Άλλο'],
};
```

---

## UX Λεπτομέρειες

- **Inline editing**: Click to edit any cell directly in the spreadsheet (no dialog required for quick edits)
- **Row drag-and-drop**: Αλλαγή sort_order μέσω drag (@dnd-kit υπάρχει ήδη)
- **Commission indicator**: Κόκκινο/πράσινο chip δείχνει net budget μετά agency fee
- **Budget bar**: Progress bar budget used vs allocated σε κάθε group
- **AI Wizard**: Αντικαθιστά το απευθείας "AI Generate" κουμπί — ανοίγει modal
- **Empty state**: Επιλογή μεταξύ AI Wizard ή manual entry
- **Mobile**: Horizontal scroll για τον πίνακα, collapsible KPI strip
