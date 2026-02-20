
# Media Plan — Ενισχυμένο Σύστημα (6 Βελτιώσεις)

## Ανάλυση Απαιτήσεων

Βάσει της ανάλυσης του κώδικα και των 6 σχολίων του χρήστη:

1. **Multi-select objectives + φάσεις με ημερομηνίες** — Ο wizard επιτρέπει μόνο 1 objective (radio button) και οι φάσεις είναι απλό text field
2. **Budget βάσει project budget - agency fee** — Πρέπει η ολική αξία να λαμβάνει υπόψη ότι το NET budget (project budget × (1 - fee%)) είναι το πραγματικό διαθέσιμο ποσό, και το total budget του media plan δεν πρέπει να ξεπερνά αυτό
3. **Πολλαπλά media plans ανά έργο + status** — Δεν υπάρχει καθόλου αυτή η δομή. Χρειάζεται νέος πίνακας `media_plans` (header) με FK προς `projects`, και τα `media_plan_items` να έχουν FK προς `media_plans` (όχι άμεσα στο project)
4. **Excel-like view + Gantt + Calendar + Combined view** — Υπάρχει μόνο spreadsheet view. Χρειάζεται Gantt timeline και εναλλακτικά views
5. **Projections/Estimations ξεχωριστά** — Τα impressions/reach/CTR/CPM να βγουν από τον κύριο πίνακα και να μπουν σε ξεχωριστό "Performance Projections" tab/section
6. **Επεξεργασία total budget + inline σε όλα** — Το total budget να είναι editable inline στο header του media plan

---

## Database Migration (Απαιτείται)

### Νέος πίνακας `media_plans` (header/container)

```sql
CREATE TABLE public.media_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Media Plan',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | approved | cancelled | archived
  total_budget NUMERIC DEFAULT 0,       -- overridable budget (defaults to project budget)
  agency_fee_percentage NUMERIC DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Αλλαγή στα `media_plan_items`

- Προσθήκη `media_plan_id UUID REFERENCES public.media_plans(id) ON DELETE CASCADE`
- Το `project_id` παραμένει (για backward compatibility, αλλά αρχίζει να γίνεται derived)
- Τα existing items: migration με default media_plan creation

### RLS για `media_plans`

Ίδια λογική με `media_plan_items`:
- Admins/Managers: full access
- Users: read access για projects όπου έχουν access

---

## Τι Αλλάζει Ανά Απαίτηση

### 1. Multi-Select Objectives + Φάσεις με ημερομηνίες στον Wizard

**Wizard State αλλαγές:**
```typescript
interface WizardState {
  step: 1 | 2 | 3;
  campaignObjectives: string[];           // ← ΑΛΛΑΓΗ: array (multi-select)
  targetAudience: string;
  phases: Array<{                         // ← ΑΛΛΑΓΗ: δομημένες φάσεις
    name: string;
    start: string;
    end: string;
  }>;
  selectedChannels: string[];
  budgetAllocation: Record<string, number>;
}
```

**Step 1 UI αλλαγές:**
- Radio buttons → checkboxes (multi-select για objectives)
- Αντί για 2 date pickers (start/end campaign), νέο **"Φάσεις Καμπάνιας"** section:
  ```
  + Προσθήκη Φάσης
  [Όνομα] [Έναρξη] [Λήξη] [×]
  Φάση 1 - Launching  23/02  15/03  ×
  Φάση 2 - Sustaining 16/03  30/04  ×
  ```

### 2. Budget = Αυστηρά Project Budget - Agency Fee

**Header KPI αλλαγές:**
- Το **Net Budget** (project_budget × (1 - fee%)) γίνεται το **κύριο, κεντρικό μέγεθος**
- Όταν το total allocated budget των items ξεπερνά το Net Budget → εμφάνιση warning badge
- Ο Wizard στο Step 3 να δείχνει ξεκάθαρα:
  ```
  Project Budget:   €100,000
  Agency Fee (15%): -€15,000
  ─────────────────────────
  Διαθέσιμο Net:    €85,000  ← αυτό μοιράζεται στα media
  ```
- Το AI generation να περνά `net_budget = projectBudget * (1 - fee/100)` ώστε το AI να κατανέμει μόνο αυτό

### 3. Πολλαπλά Media Plans + Status

**Νέα UX ροή:**
- Στο tab "Media Plan" εμφανίζεται **λίστα media plans** του project:
  ```
  ┌──────────────────────────────────────────────────────┐
  │ Media Plans (2)                    [+ Νέο Πλάνο]    │
  ├──────────────────────────────────────────────────────┤
  │ 📋 Media Plan Q1 2026    [ΕΝΕΡΓΟ]  €85,000  [Open]  │
  │ 📋 Media Plan Draft v2   [DRAFT]   €72,000  [Open]  │
  └──────────────────────────────────────────────────────┘
  ```
- Κλικ σε ένα plan → ανοίγει το detail view (εντός ίδιας σελίδας, με back button)
- **Status options** για media plan: `draft | active | approved | cancelled | archived`
- Inline editable **name** και **status** στο header κάθε plan
- **Delete plan** → διαγράφει και όλα τα items του

**Plan Header (editable):**
```
[← Πίσω]  [Media Plan Q1 2026 (editable)]  [ΕΝΕΡΓΟ ▼]
Budget: €85,000 (editable)  Fee: 15%  Net: €72,250
                                        [Export] [AI Wizard] [+]
```

### 4. Excel View + Gantt Timeline + Calendar View

**View Toggle (3 επιλογές):**
```
[📋 Spreadsheet]  [📊 Gantt]  [📅 Calendar]
```

**Spreadsheet** (υπάρχει, βελτιώνεται): Ήδη υπάρχει, βελτιώνεται με:
- Sticky headers
- Φάσεις ως colored row separators (όχι μόνο text)
- Inline edit σε dates (date picker)

**Gantt Timeline (νέο):**
- Οριζόντια ράβδοι ανά media item, ομαδοποιημένα ανά medium
- X-axis: ημερομηνίες (ανά εβδομάδα ή μήνα)
- Χρωματισμός ανά objective ή status
- Tooltip με budget/details
- Υλοποίηση: Pure CSS/div-based gantt (χωρίς νέα library), χρησιμοποιώντας `position: relative` + percentage widths

**Calendar View:**
- Monthly calendar grid
- Items εμφανίζονται ως colored chips στις ημερομηνίες έναρξης/λήξης

### 5. Projections/Estimations Ξεχωριστά

**Κύριος πίνακας (columns):**
```
Καμπάνια | Format/Φάση | Objective | Περίοδος | BUDGET | NET | ACTUAL | STATUS | Actions
```
→ Τα impressions/reach/clicks/CTR/CPM **φεύγουν** από τον κύριο πίνακα

**Νέο "Performance Projections" collapsible section** (κάτω από τον πίνακα ή σε ξεχωριστό tab):
```
┌──────────────────────────────────────────────────────────────────┐
│ 📈 Performance Projections  [Επεξεργασία Benchmarks]  [Αυτόματος Υπολογισμός AI] │
├──────────────────────────────────────────────────────────────────┤
│ Μέσο        │ Impr.  │ Reach  │ Clicks │ CTR   │ CPM   │ CPC   │
│ TV           │ 4.5M   │ 2.1M   │  —     │  —    │ €8.20 │  —   │
│ Facebook     │ 1.2M   │ 450K   │ 18K    │ 1.5%  │ €4.10 │ €0.75│
└──────────────────────────────────────────────────────────────────┘
```
- Αυτό το section είναι collapsible, αρχικά collapsed
- Μπορεί να συμπληρωθεί manual ή με AI (future)

### 6. Editable Total Budget στο Header

- Το budget στο header του media plan είναι `EditableCell` (click to edit)
- Default value: `project.budget * (1 - agency_fee/100)` = net budget
- Μπορεί να αλλαχτεί ανεξάρτητα (αποθηκεύεται στο `media_plans.total_budget`)
- Warning indicator αν allocated > total_budget

---

## Αρχεία που Αλλάζουν

| Αρχείο | Τύπος αλλαγής |
|--------|---------------|
| **Migration SQL** | Νέος πίνακας `media_plans` + `media_plan_id` column στα `media_plan_items` + migration existing data + RLS |
| `src/components/projects/ProjectMediaPlan.tsx` | Πλήρης επαναγραφή με: multi-plan list view, plan detail view, Gantt, Calendar, βελτιωμένος Wizard, Projections section |
| `supabase/functions/generate-media-plan/index.ts` | Multi-objectives, phases array στο prompt |
| `src/pages/ProjectDetail.tsx` | Μικρές αλλαγές αν χρειαστεί (η δομή παραμένει) |

---

## Λεπτομέρειες Migration (Backward Compatibility)

Τα υπάρχοντα `media_plan_items` που έχουν `project_id` αλλά όχι `media_plan_id`:
```sql
-- Για κάθε project που έχει media_plan_items χωρίς media_plan_id:
-- 1. Δημιουργούμε ένα default media_plan
-- 2. Κάνουμε UPDATE τα items για να δείχνουν σε αυτό το plan
INSERT INTO public.media_plans (project_id, name, status, total_budget, agency_fee_percentage)
SELECT DISTINCT 
  mpi.project_id,
  'Media Plan',
  'active',
  COALESCE(p.budget * (1 - p.agency_fee_percentage/100), 0),
  COALESCE(p.agency_fee_percentage, 0)
FROM public.media_plan_items mpi
JOIN public.projects p ON p.id = mpi.project_id
WHERE mpi.media_plan_id IS NULL;
```

---

## UX Flow Σύνοψη

```
Tab "Media Plan" click
→ Εμφανίζεται λίστα plans (ή empty state)
  → [Νέο Πλάνο] → δημιουργία με όνομα + status  
  → [Open plan] → ανοίγει detail view
    → Header: Όνομα | Status | Budget (editable)
    → [Spreadsheet | Gantt | Calendar] toggle
    → Filters: Objective (multi) | Status | Φάση
    → Κύριος πίνακας (χωρίς projections columns)
    → Collapsible "Performance Projections" section
    → [AI Wizard] → 3 steps με multi-objective + phases
```

---

## Τεχνικές Σημειώσεις

- **Gantt**: Υλοποιείται με `div` elements και CSS calc() για widths, χωρίς νέα library. Timeline εύρος: min(start_date) → max(end_date) όλων των items
- **Media Plan Status Badge**: Inline `<SelectCell>` στο plan header
- **Wizard phases**: Dynamic array με + button, κάθε phase έχει name/start/end inputs
- **Budget warning**: Κόκκινη γραμμή/indicator αν `Σ(budget items) > media_plan.total_budget`
- **Backward compat**: Τα items χωρίς `media_plan_id` γίνονται migrate αυτόματα με trigger
