

# Φάση 4 — Ανάλυση ComingSoon Pages: Τι χρειάζεται πραγματικά

## Τρέχουσα κατάσταση

Υπάρχουν **18 αρχεία** ComingSoon, αλλά **κανένα δεν εμφανίζεται** — όλα τα routes κάνουν redirect σε υπάρχουσες σελίδες. Οι σελίδες είναι νεκρός κώδικας.

## Κατηγοριοποίηση

### ✅ ΗΔΗ ΚΑΛΥΠΤΟΝΤΑΙ — Δεν χρειάζεται τίποτα (μόνο cleanup)

| Σελίδα | Redirect → | Γιατί δεν χρειάζεται |
|--------|-----------|---------------------|
| **AI Insights** | `/brain` | Το Brain page καλύπτει πλήρως |
| **Pricing** | `/pricing` | Υπάρχει ήδη `PricingPage.tsx` |
| **MediaPlanningPage** | `/media-planning` | Υπάρχει ήδη `MediaPlanning.tsx` |

**Ενέργεια**: Διαγραφή των 3 αρχείων (dead code).

---

### 🔶 ΧΡΕΙΑΖΟΝΤΑΙ ΩΣ REAL FEATURES — Υψηλή προτεραιότητα

| Σελίδα | Τι λείπει | Πρόταση |
|--------|-----------|---------|
| **Campaigns** | Δεν υπάρχει campaign management — redirect σε `/work` δεν βοηθάει | Νέα σελίδα: campaigns linked to clients/projects, timeline, status tracking |
| **Capacity** | Δεν υπάρχει workload visibility — redirect σε `/hr` δεν δείχνει φόρτο | Νέα σελίδα: heatmap ωρών ανά άτομο/εβδομάδα vs διαθεσιμότητα |
| **Backlog** | Δεν υπάρχει cross-project backlog — redirect σε `/calendar` δεν βοηθάει | Νέα σελίδα: unassigned/unscheduled tasks, filterable, drag-to-assign |

**Εκτίμηση**: 3 σελίδες × ~200 γραμμές + queries = μεσαίος όγκος

---

### 🔷 ΧΡΗΣΙΜΑ ΩΣ TABS/SECTIONS — Μεσαία προτεραιότητα

Αυτά δεν χρειάζονται standalone σελίδα, αλλά θα ήταν χρήσιμα ως tabs μέσα σε υπάρχουσες:

| Σελίδα | Πού ανήκει | Τι χτίζεται |
|--------|-----------|-------------|
| **Performance** | Tab στο `/reports` | Metrics ανά άτομο: tasks completed, hours, utilization |
| **Benchmarks** | Tab στο `/reports` | KPIs vs targets: margin, delivery time, utilization |
| **Forecasting** | Tab στο `/reports` | Revenue projection βάσει pipeline |
| **Cross-client Insights** | Tab στο `/reports` | Comparative: revenue, hours, profitability per client |
| **Resource Planning** | Tab στο `/hr` | Gantt allocation ανά άτομο/project/εβδομάδα |

**Εκτίμηση**: 5 tab components × ~150 γραμμές

---

### ⬜ ΔΕΝ ΧΡΕΙΑΖΟΝΤΑΙ ΤΩΡΑ — Χαμηλή προτεραιότητα

Αυτά είναι admin/settings features που τα redirect στο `/settings` είναι εντάξει προσωρινά:

| Σελίδα | Γιατί μπορεί να περιμένει |
|--------|--------------------------|
| **Roles & Permissions** | Υπάρχει ήδη RBAC σε code level — UI editor είναι nice-to-have |
| **Billing** | Δεν υπάρχει Stripe integration ακόμα |
| **Branding** | Logo/colors — cosmetic |
| **API Keys** | Δεν υπάρχει public API |
| **Webhooks** | Δεν υπάρχουν outbound events |
| **Feature Flags** | Δεν υπάρχει feature flag system |

**Ενέργεια**: Παραμένουν ως redirects, καθαρισμός dead files.

---

## Προτεινόμενο πλάνο εκτέλεσης

### Βήμα 1: Cleanup dead code
- Διαγραφή 18 ComingSoon page files που δεν χρησιμοποιούνται
- Διαγραφή `ComingSoonPage.tsx` component

### Βήμα 2: Campaigns page (νέα σελίδα)
- DB migration: `campaigns` table (name, client_id, project_id, status, start_date, end_date, budget, company_id)
- Σελίδα με Kanban view (by status) + table view
- CRUD dialog, linked to clients/projects
- Route: `/campaigns` (αντικατάσταση redirect)

### Βήμα 3: Capacity page (νέα σελίδα)
- Query: aggregate `time_entries` + `tasks` per user per week
- Heatmap grid: rows = team members, columns = weeks, cells = hours (color-coded)
- Available hours config (default 40h/week)
- Route: `/operations/capacity` → real page

### Βήμα 4: Backlog page (νέα σελίδα)
- Query: tasks where `status = 'todo'` AND (`assigned_to IS NULL` OR `due_date IS NULL`)
- Filterable list with project/client grouping
- Quick-assign dropdown, bulk actions
- Route: `/backlog` → real page

### Βήμα 5: Reports tabs (ενσωμάτωση)
- 4 νέα tab components στο Reports page:
  - Performance tab
  - Benchmarks tab  
  - Forecasting tab
  - Cross-client Insights tab
- Κάθε tab χρησιμοποιεί υπάρχοντα data (tasks, time_entries, invoices, expenses)

## Τεχνικά

- **Migration**: Μόνο για campaigns table — τα υπόλοιπα χρησιμοποιούν υπάρχοντα tables
- **Νέα αρχεία**: ~8 components + 1 migration
- **Τροποποιήσεις**: `App.tsx` (routes), `AppSidebar.tsx` (nav links), `Reports.tsx` (tabs)

Πες μου αν συμφωνείς με αυτή την κατηγοριοποίηση ή αν θέλεις αλλαγές πριν ξεκινήσουμε.

