
# Secretary v2 — Enhanced AI Agent

## Επισκόπηση 6 Βελτιώσεων

1. **@Mentions** στο chat input (άτομα, tasks, projects, αρχεία)
2. **Ιστορικό συνομιλιών** με DB persistence
3. **Διαδραστικές επιλογές** (κουμπιά, dropdowns) στις απαντήσεις
4. **Πληρέστερη συλλογή πληροφοριών** — ο agent ρωτά βήμα-βήμα
5. **Secretary Panel** (resizable side panel) εκτός από full page
6. **Δημιουργία & Download αρχείων** (CSV, αναφορές, πίνακες)

---

## 1. @Mentions στο Chat Input

### Πώς λειτουργεί
Ο χρήστης πληκτρολογεί `@` στο textarea και εμφανίζεται popover με αναζήτηση σε:
- **Άτομα** (profiles) — εικονίδιο user
- **Projects** — εικονίδιο folder
- **Tasks** — εικονίδιο check
- **Αρχεία** — εικονίδιο file

Η επιλογή εισάγει `@[Όνομα](type:id)` στο μήνυμα. Στο rendering, αυτό εμφανίζεται ως styled badge. Στο edge function, αυτά τα mentions αναλύονται και προστίθεται context (π.χ. "ο χρήστης αναφέρθηκε στο project X με id Y").

### Τεχνική Υλοποίηση
- Νέο component `MentionInput` μέσα στο Secretary — textarea wrapper με popover
- Κατά την πληκτρολόγηση `@`, debounced search σε profiles/projects/tasks/files
- Popover εμφανίζεται κάτω από τον cursor (ή πάνω, ανάλογα θέση)
- Τα mentions μετατρέπονται σε text tokens πριν σταλούν στο edge function

---

## 2. Ιστορικό Συνομιλιών (DB Persistence)

### Database Migration

```sql
CREATE TABLE public.secretary_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  title TEXT DEFAULT 'Νέα συνομιλία',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.secretary_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES secretary_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- για interactive actions, mentions κλπ
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: ο χρήστης βλέπει μόνο τις δικές του συνομιλίες.

### UI: Sidebar ιστορικού
- Αριστερά στη full-page view: λίστα conversations (ομαδοποιημένα: Σήμερα / Χθες / Παλαιότερα)
- Click σε conversation → φόρτωση μηνυμάτων
- "Νέα συνομιλία" δημιουργεί νέο record
- Auto-title: μετά το 1ο μήνυμα, ο agent δημιουργεί τίτλο (ή χρησιμοποιούμε τα πρώτα 50 chars)
- Delete conversation

---

## 3. Διαδραστικές Επιλογές (Interactive Actions)

### Πώς λειτουργεί
Ο agent στέλνει structured JSON μαζί με το text response. Το frontend αναγνωρίζει αυτά τα blocks και τα render-άρει ως κουμπιά/dropdowns.

### Format
Η απάντηση του agent θα περιέχει ειδικά markdown blocks:

```text
Βρήκα 3 projects. Σε ποιο θέλεις να προσθέσω το task;

:::actions
[{"type":"button","label":"Rebranding ACME","action":"select_project","data":{"project_id":"abc123"}}]
[{"type":"button","label":"Website Redesign","action":"select_project","data":{"project_id":"def456"}}]
[{"type":"button","label":"Social Campaign","action":"select_project","data":{"project_id":"ghi789"}}]
:::
```

### Τύποι actions
| Type | Rendering | Λειτουργία |
|------|-----------|------------|
| `button` | Κουμπί | Click στέλνει prompt αυτόματα |
| `select` | Dropdown | Επιλογή στέλνει prompt |
| `confirm` | Yes/No buttons | Επιβεβαίωση ενέργειας |
| `link` | Link button | Πλοήγηση σε σελίδα εφαρμογής |

### Τεχνική Υλοποίηση
- Custom markdown renderer που αναγνωρίζει `:::actions ... :::` blocks
- Κάθε action button στέλνει αυτόματα ένα pre-formatted message στον agent
- Η πληροφορία (project_id, task_id κλπ) πηγαίνει embedded στο μήνυμα

### Edge Function αλλαγές
- Ενημέρωση system prompt ώστε ο agent να χρησιμοποιεί τα `:::actions` blocks
- Οδηγίες: "Όταν χρειάζεται επιλογή, δώσε κουμπιά αντί να ρωτάς με κείμενο"

---

## 4. Πληρέστερη Συλλογή Πληροφοριών

Αυτό είναι κυρίως αλλαγή στο **system prompt** του edge function:

```text
Πριν εκτελέσεις κάποιο tool:
1. Ρώτα βήμα-βήμα τον χρήστη για ΟΛΕΣ τις παραμέτρους
2. Για κάθε παράμετρο, δώσε επιλογές (κουμπιά) αν υπάρχουν περιορισμένες τιμές
3. Για create_task: ρώτα project, τίτλο, περιγραφή, προτεραιότητα, deadline, υπεύθυνο
4. Για create_brief: ρώτα τύπο, τίτλο, project, πελάτη, και κάθε πεδίο του brief
5. Πάντα δείξε preview πριν εκτελέσεις (με confirm κουμπί)
6. Μετά την εκτέλεση, δείξε σύνοψη + link
```

Δεν απαιτεί code αλλαγές, μόνο system prompt refinement.

---

## 5. Secretary Panel (Side Panel + Resizable)

### Αρχιτεκτονική
- Νέο component `SecretaryPanel` — Sheet/Drawer από δεξιά
- Χρησιμοποιεί `react-resizable-panels` (ήδη εγκατεστημένο) για resizable width
- Toggle button στο TopBar ή floating button
- Κοινό chat engine (shared component) μεταξύ full-page και panel

### Δομή Components

```text
SecretaryChat (shared logic + UI)
├── ConversationSidebar (history list)
├── MessageList (messages + interactive actions)
├── MentionInput (input με @mentions)
└── ActionRenderer (buttons/dropdowns σε messages)

Secretary.tsx (full page) → uses SecretaryChat
SecretaryPanel.tsx (side panel) → uses SecretaryChat in Sheet
AppLayout.tsx → renders SecretaryPanel + toggle button
```

### Panel UI
- Ελάχιστο πλάτος: 360px, μέγιστο: 700px, default: 420px
- Drag handle στην αριστερή πλευρά
- Header: "Secretary" + minimize + close
- Κλείνει/ανοίγει με keyboard shortcut (Cmd+J) ή button στο TopBar
- Σε mobile: full-screen sheet

---

## 6. Δημιουργία & Download Αρχείων

### Νέα Tools στο Edge Function

| Tool | Περιγραφή |
|------|-----------|
| `generate_csv_report` | Δημιουργεί CSV από δεδομένα (tasks, expenses, κλπ) |
| `generate_project_report` | Markdown report ενός project |
| `generate_task_summary_table` | Πίνακας tasks σε markdown + CSV |

### Πώς λειτουργεί
1. Ο agent καλεί ένα generate tool
2. Το tool επιστρέφει τα δεδομένα ως string (CSV ή markdown)
3. Ο agent τα παρουσιάζει inline + κουμπί "Download"
4. Χρησιμοποιεί ένα ειδικό `:::download` block:

```text
Ετοίμασα την αναφορά:

:::download
{"filename":"tasks_report_2026-02.csv","content_type":"text/csv","data":"...base64..."}
:::

| Task | Status | Priority | Deadline |
|------|--------|----------|----------|
| Logo design | In Progress | High | 25/02 |
```

### Frontend
- Custom renderer για `:::download` blocks
- Κουμπί "Κατέβασε" δημιουργεί Blob + `URL.createObjectURL` + `<a download>`
- Για πίνακες: rendered ως markdown table (ήδη υποστηρίζεται από react-markdown)

---

## Αρχεία που Αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| **Migration SQL** | Νέοι πίνακες `secretary_conversations` + `secretary_messages` + RLS |
| `supabase/functions/secretary-agent/index.ts` | Νέα tools (generate_csv, generate_report), ενημέρωση system prompt, conversation persistence |
| `src/components/secretary/SecretaryChat.tsx` | **Νέο** — Shared chat component (messages, input, actions) |
| `src/components/secretary/MentionInput.tsx` | **Νέο** — Textarea με @mention popover |
| `src/components/secretary/ActionRenderer.tsx` | **Νέο** — Renders interactive buttons/dropdowns/downloads |
| `src/components/secretary/ConversationSidebar.tsx` | **Νέο** — Ιστορικό συνομιλιών |
| `src/components/secretary/SecretaryPanel.tsx` | **Νέο** — Resizable side panel wrapper |
| `src/pages/Secretary.tsx` | **Rewrite** — Χρησιμοποιεί SecretaryChat |
| `src/components/layout/AppLayout.tsx` | Προσθήκη SecretaryPanel + toggle state |
| `src/components/layout/TopBar.tsx` | Προσθήκη Secretary toggle button |

---

## Τεχνικές Σημειώσεις

- **Conversation auto-title**: Μετά το 1ο user message, χρησιμοποιούμε τα πρώτα 50 chars σαν τίτλο. Ο agent μπορεί να τον αλλάξει μέσω tool call αργότερα.
- **Panel state**: Αποθηκεύεται στο localStorage (open/closed, width)
- **@Mentions search**: Debounced 300ms, max 10 results, queries profiles + projects + tasks + file_attachments
- **Download files**: Client-side Blob generation, no server storage needed
- **Interactive actions**: Parsed client-side, δεν χρειάζεται αλλαγή στο AI response format — μόνο system prompt instructions
- **Shared chat engine**: Ίδιο component για full-page και panel, μόνο CSS differences
