# Knowledge Base · Ανάλυση & Πρόταση Αναδιοργάνωσης

## Μέρος Α · Τι κάνει σήμερα κάθε κομμάτι

Η σελίδα `/knowledge` έχει **5 tabs** + KPI cards στην κορυφή.

### KPI Cards (4 πάνω)

- **Σύνολο Άρθρων** — όλα τα `kb_articles` (εκτός deprecated).
- **Πρόχειρα** — άρθρα με status `draft`.
- **Pending Review** — άρθρα με ληγμένο `next_review_date`.
- **Πηγές** — `kb_raw_sources` (raw inputs που περιμένουν compile).

### 1) **Wiki**

Το κύριο knowledge layer. Tree αριστερά (κατηγορίες με parent/child), grid δεξιά με recent ή φιλτραρισμένα άρθρα. Κάθε άρθρο έχει body, tags, version history, backlinks, owner, status (draft/approved), `next_review_date`. Από εδώ → "Νέο Άρθρο" → editor.

### 2) **Blueprints** (3 sub-tabs)

Συλλογή re-usable templates:

- **Προ-φόρμες** → 6 hardcoded brief types (Creative, Digital Campaign, Contact Report, Website, Event, Communication) + αποθηκευμένα briefs χρήστη. Ζει στον πίνακα `briefs`.
- **Project Templates** → πλήρη project skeletons (φάσεις + tasks). Από `project_templates`. Χρησιμοποιείται για one-click δημιουργία project.
- **Document Templates** → `kb_templates` (SOP / brief / report / checklist / media-plan). Generic re-usable docs.

### 3) **Ask AI**

Streaming chat πάνω από το wiki. Το `kb-compiler` edge function κάνει hybrid retrieval (vector + FTS) στα άρθρα και απαντάει με citations. Με Phase 5: fallback σε graph subgraph όταν τα wiki hits είναι λίγα.

### 4) **Graph** (Phase 5)

Knowledge Graph explorer. Semantic search → ανακτά anchors via vector → BFS 1–3 hops. Δείχνει nodes ομαδοποιημένα ανά τύπο (clients, projects, tasks, invoices, articles…). Click → deep-link στο entity.

### 5) **Manage** (3 sub-sections)

- **Reviews** — πίνακας με drafts + ληγμένα reviews. Approve / Archive / Edit.
- **Πηγές** — λίστα `kb_raw_sources` + uploader (note/article/url/pdf). "Compile" → AI γράφει `kb_articles`.
- **Health Check** — `kb-compiler` analyzes wiki: contradictions, orphans, missing concepts, improvements + score.
- Δεξιά: **Επαναφόρτωση Embeddings** dropdown (Wiki / Graph backfill).

---

## Μέρος Β · Προβλήματα της τρέχουσας δομής

1. **"Πηγές" είναι θαμμένο** στο Manage. Αλλά conceptually είναι το **input gate** (εκεί ξεκινάει η ζωή ενός άρθρου: upload → compile → wiki). Επίσης, δεν δέχεται πραγματικά αρχεία (PDF/Word) — μόνο paste. Ο χρήστης που "ανεβάζει έγγραφα" δεν έχει προφανές σημείο εισόδου.
2. **Wiki vs Document Templates vs Briefs**: τρία διαφορετικά "documents" σε τρία διαφορετικά places. Ένας χρήστης που θέλει "ένα SOP" δεν ξέρει αν είναι article, template, ή brief.
3. **Project Templates** δεν ανήκουν εννοιολογικά εδώ (αφορούν δημιουργία projects, όχι knowledge). Είναι παρείσακτο.
4. **Manage** είναι catch-all ("σκουπιδότοπος"): mixing operational (sources upload) με admin (health, reviews, embeddings).
5. **KPI "Πηγές"** δείχνει 0 ενώ ταυτόχρονα το αντίστοιχο tab είναι κρυμμένο 2 clicks βαθιά → no signal-to-action path.
6. **Graph** είναι power-user feature αλλά παρουσιάζεται ισοδύναμα με το Wiki — μπερδεύει τον απλό χρήστη.
7. **Health Check** εκτελείται μόνο για wiki, όχι για graph/sources.

---

## Μέρος Γ · Προτεινόμενη νέα δομή

Βασική φιλοσοφία: **Lifecycle-first** — οργάνωση γύρω από το ταξίδι του περιεχομένου: *Capture → Curate → Consume*.

### Νέα tabs: **4 (από 5) + clear sub-structure**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Knowledge Base                                                 │
│  KPIs:  Articles · Sources Pending · Reviews Due · Health Score │
├─────────────────────────────────────────────────────────────────┤
│  [Library]  [Templates]  [Ask & Explore]  [Admin]               │
└─────────────────────────────────────────────────────────────────┘
```

#### **Tab 1 · Library** (το νυν "Wiki" εμπλουτισμένο)

Όλο το curated knowledge σε ένα μέρος.

- Αριστερά: category tree (αμετάβλητο).
- Πάνω δεξιά: **dual CTA** → "Νέο Άρθρο" + **"Εισαγωγή πηγής"** (ανοίγει modal με drag-and-drop για files + paste + URL — ενιαίο entry point).
- Center: άρθρα grid + filter chip "Drafts only / Needs review / Approved".
- **Inline pending sources strip** στην κορυφή όταν υπάρχουν uncompiled sources: *"3 πηγές περιμένουν compilation → [Compile All] [Δες]"*. Έτσι το capture flow είναι ορατό χωρίς να φύγεις από το Library.

#### **Tab 2 · Templates** (καθαρισμένο Blueprints)

- **Briefs** (προ-φόρμες) — αμετάβλητο.
- **Document Templates** (SOPs, checklists, reports) — αμετάβλητο.
- ❌ **Project Templates → μετακίνηση εκτός** (στις Settings → Project Templates ή στο `/projects` setup). Δεν είναι knowledge artifact.

#### **Tab 3 · Ask & Explore** (συγχώνευση Ask AI + Graph)

Μία σελίδα με **toggle ή split view**:

- **Ask** (default): chat με citations.
- **Explore**: graph view για deeper investigation (όταν θες να δεις σχέσεις).
Λογική: και τα δύο είναι **discovery surfaces** πάνω από το ίδιο corpus. Συμμαζεύουν τα 2 tabs σε ένα coherent. Default Ask, "Show graph" μετάπτωση όταν ο χρήστης θέλει να εμβαθύνει.

#### **Tab 4 · Admin**

Μόνο για admins/owners (RBAC gate).

- **Reviews queue** — αμετάβλητο.
- **Health Check** — επεκταμένο ώστε να καλύπτει graph stats (orphan nodes, missing embeddings) + wiki health (όπως τώρα).
- **Embeddings** — ένα card με μετρητές και κουμπιά backfill (Wiki / Graph) αντί για dropdown.
- **All Sources** — πλήρης διαχείριση raw sources (για όσους θέλουν batch).

### Νέα KPIs (πιο actionable)

- **Articles** (total + Δ τελευταίας εβδομάδας)
- **Sources Pending Compile** (κλικ → Library + ανοίγει το pending strip)
- **Reviews Due** (κλικ → Admin/Reviews)
- **Knowledge Health** (score 0–100 από last health check)

---

## Μέρος Δ · Πραγματικό upload εγγράφων (κενό σήμερα)

Το `KBSourceUploader` δέχεται μόνο paste. Για να καλύψουμε το user intent ("ανεβάζω έγγραφα"):

- Νέο component `KBImportDialog` με tabs: **Drop files** (PDF/DOCX/MD/TXT — auto extract via `parse-document`), **Paste text**, **From URL** (web scrape).
- Auto-detect type, suggested title from filename.
- Bulk upload: drop πολλά αρχεία → καθένα γίνεται `kb_raw_source` → optional one-click "Compile all".
- Διαθέσιμο από: Library top-bar, Admin/Sources, και global "+ Νέο Άρθρο" menu.

---

## Σειρά υλοποίησης (όταν εγκρίνεις)

1. Refactor tabs → 4 (Library / Templates / Ask & Explore / Admin) + migrate URLs με backward-compat.
2. Pending sources strip στο Library.
3. `KBImportDialog` με drag-drop + reuse `parse-document` edge function.
4. Μετακίνηση Project Templates εκτός Knowledge (ή keep με notice + redirect).
5. Συγχώνευση Ask + Graph σε split view.
6. Νέα KPI cards με click-through.
7. Admin RBAC gate + ενιαίο Health/Embeddings panel.

Πες μου:

- **(α)** προχωράμε με όλη την αναδιοργάνωση όπως πάνω; Ναι
- **(β)** θες να αφήσουμε τα Project Templates μέσα στο Knowledge;
- **(γ)** προτιμάς Ask & Graph σε **split view** ή σε **2 ξεχωριστά tabs αλλά ομαδοποιημένα** ("Discover")?