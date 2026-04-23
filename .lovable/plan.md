

# Knowledge Base · Smart Categories + AI Assist + Reviewer Workflow

## Σκοπός

Τέσσερις στοχευμένες αναβαθμίσεις στη Βιβλιοθήκη:

1. **Auto-sync κατηγοριών** με τα δεδομένα του χρήστη (Departments, Services, Clients).
2. **AI Compose** σε editor & κατηγορίες — δημιουργεί άρθρα από context.
3. **AI Suggestions** — προτείνει νέα άρθρα βάσει των δεδομένων/εγγράφων που υπάρχουν ήδη.
4. **Reviewer workflow** — ορισμός reviewer, εκκρεμότητα στον σωστό χρήστη, ειδοποιήσεις.

---

## Μέρος 1 · Έξυπνες Κατηγορίες (sync με Settings)

**Σήμερα:** Οι κατηγορίες είναι hard-coded seed (Company, Departments, Clients, Templates) και δεν αντικατοπτρίζουν τα πραγματικά Departments/Services/Clients του χρήστη.

**Νέα συμπεριφορά:**
- Στο `seedCategories` (πρώτη φορά) και σε ένα νέο **"Sync Categories"** action:
  - Κάτω από **Departments** → auto-create κατηγορία ανά `departments.name` (π.χ. Creative, Digital, Λογιστήριο).
  - Κάτω από **Clients** → auto-create κατηγορία ανά active client (`clients.name`).
  - Νέο root **"Services"** → κατηγορία ανά `services.category` (project, retainer, …) ή ανά service name (configurable).
- Idempotent: δεν δημιουργεί διπλά (match by `slug` + `parent_id`).
- Auto-link: όταν δημιουργείται κατηγορία από department/client/service, αποθηκεύεται `external_ref` (νέα στήλη `kb_categories.source_type` + `source_id`) ώστε να μη διαγράφεται κατά λάθος και να μπορούμε να εμφανίζουμε τα σχετικά entities (π.χ. στην κατηγορία πελάτη Χ → όλα τα άρθρα + projects + invoices).
- UI κουμπί **"Συγχρονισμός με Ρυθμίσεις"** στο `KBCategoryManager`.
- Realtime subscription σε `departments`/`clients` ώστε νέες εγγραφές να εμφανίζονται αυτόματα στο tree (ή με toast prompt).

---

## Μέρος 2 · AI Compose (δημιουργία άρθρων με AI)

Νέο component `KBAIComposeButton` που εμφανίζεται:
- Στο header του Library (δίπλα στο "Νέο Άρθρο").
- Στον `KBArticleEditor` (κουμπί "✨ AI σύνταξη" πάνω από το textarea).
- Στο `KBCategoryTree` (right-click ή hover button "+ AI άρθρο εδώ" με προ-επιλεγμένη κατηγορία).

**Πώς δουλεύει:**
- Άνοιγμα dialog με: τίτλο/θέμα, κατηγορία (preselected), τύπο (SOP/guide/policy/meeting note), tone, μήκος.
- Edge function `kb-ai-compose` (νέα) — παίρνει το brief + relevant company context:
  - Τα τελευταία N άρθρα της ίδιας κατηγορίας (για style match).
  - Σχετικά rows από `clients` / `services` / `departments` αν αναφέρονται.
  - Top-K vector hits από `kb_article_chunks` + graph neighbors (`graph-query`).
- Επιστρέφει markdown draft με αυτόματα suggested tags + next_review_date.
- Streaming preview (τύπου ChatGPT) στον editor → ο χρήστης κάνει edit → Save ως `draft`.

**AI fill στον editor** (επιπλέον): κουμπιά "Βελτίωσε", "Συντόμευσε", "Πρόσθεσε checklist", "Μετάφρασε" — inline AI actions.

---

## Μέρος 3 · AI Article Suggestions

Νέο widget **"Προτάσεις AI"** στην κορυφή του Library (συμπτυσσόμενο card, κάτω από το pending sources strip).

**Λογική (edge function `kb-suggest-articles`):**
- Σαρώνει `kb_raw_sources` (compiled & uncompiled), recent `projects`, `clients`, `briefs`, `email_messages`, `files` του χρήστη.
- Συγκρίνει με υπάρχοντα `kb_articles` via vector similarity → εντοπίζει **gaps** (θέματα που εμφανίζονται συχνά αλλά δεν υπάρχει άρθρο).
- Επιστρέφει 3-7 προτάσεις της μορφής:
  - "Δημιούργησε SOP: Onboarding Πελάτη — βασισμένο σε 4 πρόσφατα projects".
  - "Συμπτύξε σε guideline: 3 παρόμοιες πηγές για Meta Ads reporting".
  - "Λείπει: Policy για approval invoices > 5.000€" (από brain insights).
- Κάθε πρόταση έχει: τίτλο, reasoning, source links, **[Σύνταξε με AI]** button → ανοίγει το AI Compose με προ-συμπληρωμένα όλα.
- Trigger: αυτόματα κάθε φορά που μπαίνει ο χρήστης στο Library (cached 24h) + manual refresh.

---

## Μέρος 4 · Reviewer Workflow

**Σήμερα:** Άρθρο έχει `owner_id` και `next_review_date`, αλλά κανέναν συγκεκριμένο reviewer — όλοι βλέπουν το ίδιο review queue.

**Νέα schema (migration):**
```text
kb_articles:
  + reviewer_id uuid (FK profiles, nullable)
  + review_status text ('none'|'pending'|'approved'|'changes_requested')
  + review_requested_at timestamptz
  + reviewed_at timestamptz
  + review_notes text

kb_review_history (νέος πίνακας):
  id, article_id, reviewer_id, action, notes, created_at
```

**UI changes:**
- **Editor**: dropdown "Reviewer" (επιλογή από users της εταιρείας) + "Request review" button (αλλάζει status σε `pending`, στέλνει notification).
- **Article detail page**: badge "Awaiting review by {Reviewer}" + Approve/Request changes buttons (μόνο για τον assigned reviewer ή admin).
- **Review Queue (Admin tab)**:
  - Νέο tab/filter: **"Σε εμένα"** vs **"Όλα"** vs **"Ληγμένα"**.
  - Στο My Work / dashboard: νέο card "Άρθρα προς review" όταν ο χρήστης είναι assigned reviewer.
- **Notifications**: trigger function στο `kb_articles` UPDATE → όταν `review_status` γίνει `pending` & υπάρχει `reviewer_id`, εισάγει row στον `notifications` με link στο άρθρο.
- **KPI card "Εκκρεμή Reviews"** → μετράει τα **assigned σε μένα** (όχι όλα), για να δίνει actionable σήμα.

**Permissions:** Approve μπορεί να κάνει: ο reviewer, ο owner (αν self-approve allowed by company setting), ή admin/manager (`is_company_admin_or_manager`).

---

## Τεχνικές αλλαγές (συνοπτικά)

**Migrations:**
- `kb_categories`: + `source_type text`, + `source_id uuid` (για link σε departments/clients/services).
- `kb_articles`: + `reviewer_id`, + `review_status`, + `review_requested_at`, + `reviewed_at`, + `review_notes`.
- Νέος πίνακας `kb_review_history` με RLS.
- Trigger `kb_article_review_notify` → εισάγει σε `notifications`.

**Edge Functions (νέες):**
- `kb-ai-compose` — streaming markdown generation με company context.
- `kb-suggest-articles` — gap analysis, returns prioritized suggestions JSON.
- (Επεκτείνουμε το `kb-compiler` με `action: 'sync_categories'` ή νέα util query στο client.)

**UI components (νέα):**
- `KBAIComposeDialog.tsx` — wizard για AI generation.
- `KBSuggestionsPanel.tsx` — collapsible card στο Library.
- `KBReviewerSelector.tsx` — user picker για editor.
- Επέκταση `KBReviewQueue` με reviewer column + "assigned to me" filter.
- Επέκταση `KBCategoryManager` με "Sync from Settings" button.
- Επέκταση `KBArticleEditor` με reviewer field + AI inline actions.

**Hooks:**
- Επέκταση `useKnowledgeBase`: `syncCategories`, `requestReview`, `approveReview`, `requestChanges`.
- Νέος `useKBSuggestions` — query το `kb-suggest-articles` με 24h cache.

---

## Σειρά υλοποίησης

1. Migration: schema additions (categories source link, reviewer fields, review history, notification trigger).
2. Sync Categories logic + UI button.
3. Reviewer workflow (editor field + review queue + notifications + KPI fix).
4. `kb-ai-compose` edge function + `KBAIComposeDialog` (entry από Library header & editor).
5. `kb-suggest-articles` edge function + `KBSuggestionsPanel` στο Library.
6. AI inline actions στον editor (βελτίωσε/συντόμευσε/checklist).

