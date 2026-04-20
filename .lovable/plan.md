

## Τι ζητάς

1. Να μπορείς να δημιουργείς φακέλους που **δεν** ανήκουν σε project/πελάτη — δηλαδή company-level φακέλους (π.χ. HR, Templates, Brand assets, Internal docs).
2. Σε κάθε νέα εταιρία/χρήστη, να δημιουργείται **αυτόματα** ένας root φάκελος "Εταιρία" με τα subfolders από `project_folder_templates` (Settings).
3. Πιο manual χειρισμός των views — ο χρήστης να μπορεί να κινείται και χωρίς να τον ρωτάει το σύστημα κάθε φορά.

---

## Διάγνωση τωρινής αρχιτεκτονικής

- Πίνακας `file_folders` έχει check constraint:
  ```
  (tender_id NOT NULL AND project_id NULL) OR (tender_id NULL AND project_id NOT NULL)
  ```
  Άρα **σήμερα δεν επιτρέπεται** company-only φάκελος. Χρειάζεται DB migration.
- Τα 3 views (Έργο/Πελάτη/Χρονολογικά) είναι **καθαρά grouped views** — χτίζουν virtual folders. Δεν υπάρχει "νέτο" view για να βλέπεις την πραγματική ιεραρχία ή company files.
- Ο `DestinationPickerDialog` ζητά πάντα project — δεν δίνει επιλογή "Εταιρία".

---

## Πρόταση συστήματος

### A. Νέο 4o view: **"Εταιρία"** (Company)

Θα προστεθεί 4ο tab στα views, αριστερά (πρώτο):

```text
[ Εταιρία ] [ Κατά Έργο ] [ Κατά Πελάτη ] [ Χρονολογικά ]
```

Αυτό το view δείχνει:
- Root level: τους **company-scoped folders** (νέοι, όχι project)
- Επιπλέον τους ειδικούς "Internal" φακέλους αν υπάρχουν
- Δίνει καθαρό root για manual οργάνωση

### B. DB Migration: company-scoped folders

1. Προσθήκη στήλης `company_id uuid` στον `file_folders` (nullable, FK σε `companies`).
2. Αντικατάσταση του check constraint με:
   ```
   (tender_id NOT NULL)::int +
   (project_id NOT NULL)::int +
   (company_id NOT NULL AND tender_id IS NULL AND project_id IS NULL)::int = 1
   ```
   Δηλαδή: **ακριβώς ένα από τα τρία scopes** (tender / project / company-only).
3. Ίδια λογική για `file_attachments`: προσθήκη `company_id` (nullable) ώστε να μπορεί ένα αρχείο να ζει σε company folder χωρίς project.
4. Νέες RLS policies για company scope:
   - View: μέλη της εταιρίας
   - Manage: admin/manager της εταιρίας

### C. Αυτόματη δημιουργία company root structure

- Νέο SQL function + trigger ή edge function "ensure_company_root_folders":
  - Καλείται όταν φορτώνει το `/files` (idempotent)
  - Διαβάζει τα `project_folder_templates` της εταιρίας
  - Φτιάχνει 1 root folder "Εταιρία" + τα subfolders από τα templates
  - Αν υπάρχουν ήδη, skip
- Έτσι κάθε νέος χρήστης βλέπει αμέσως οργανωμένη βάση.

### D. Manual mode στα uploads — λιγότερα prompts

Νέα συμπεριφορά για τον DestinationPicker:
- Στο **"Εταιρία" view**, root upload → πάει αυτόματα στο company root **χωρίς prompt**.
- Στο **"Κατά Έργο" view**, root upload → πάει σε virtual "Unassigned" bucket αντί να ρωτά (ο χρήστης μπορεί μετά να σύρει).
  - Εναλλακτικά: keep prompt αλλά πρόσθεσε επιλογή "Εταιρία (χωρίς έργο)" στον picker.
- Στο **"Κατά Πελάτη" view**, root → prompt μόνο για επιλογή project ή Εταιρία.
- Στο **"Χρονολογικά"**: εξακολουθεί να ζητά (γιατί date δεν είναι αποθηκευτικό).

Στον `DestinationPickerDialog` προστίθεται toggle:
```
○ Σε έργο: [Select project] [Select folder]
○ Σε φάκελο εταιρίας: [Select company folder]
```

### E. Manual control improvements στα views

- Στο "Κατά Έργο" view, αν project έχει 0 files, δεν εμφανίζεται. Νέα επιλογή: **"Εμφάνιση όλων των έργων"** toggle ώστε να μπορείς να δημιουργήσεις structure proactively.
- Right-click context menu στο root: "Νέος φάκελος Εταιρίας", "Νέος φάκελος Έργου".
- Drag από company folder → project folder: μετακίνηση με αλλαγή scope (με confirm).

---

## Τι θα αλλάξει — αρχεία

**DB migration (νέο):**
- Add `company_id` σε `file_folders` και `file_attachments`
- Update check constraint
- Νέες RLS policies
- Trigger/function για auto-create company root folders

**Code:**
- `src/components/files/CentralFileExplorer.tsx`
  - Νέο view tab "Εταιρία" (πρώτο)
  - Νέα virtual root `vco-` (company)
  - Update `resolveDestination` για company scope
  - Auto-call `ensure_company_root_folders` στο mount
- `src/components/files/DestinationPickerDialog.tsx`
  - Toggle "Έργο vs Εταιρία"
  - Λίστα company folders όταν επιλέξεις Εταιρία
- `src/components/files/FinderColumnView.tsx`
  - Context menu για νέο company folder
  - Επίδειξη badge "Εταιρία" σε company folders
- `src/components/files/FileExplorer.tsx` (project-scoped) — minor: τα company folders δεν εμφανίζονται εκεί.

---

## Verification

- Hard refresh `/files` → εμφανίζεται το νέο "Εταιρία" view με auto-generated structure (από settings templates).
- Δημιουργία φακέλου στο root του "Εταιρία" → χωρίς prompt, αποθηκεύεται με `company_id`.
- Drag PDF στο company folder → ανεβαίνει χωρίς να ζητά project.
- "Κατά Έργο" view → κανονική λειτουργία, χωρίς company folders να μπερδεύουν.
- DestinationPicker σε ασαφή drop → εμφανίζει toggle Έργο/Εταιρία.
- Project-scoped FileExplorer (μέσα σε project page) → δεν επηρεάζεται.

---

## Τεχνικές σημειώσεις

- DB migration είναι **απαραίτητο** — αλλιώς το check constraint θα αποτυγχάνει.
- Backwards compatibility: όλοι οι υπάρχοντες φάκελοι παραμένουν project/tender-scoped όπως τώρα.
- Τα `project_folder_templates` παραμένουν ως template source — αν στο μέλλον θέλεις διαφορετικό template για την εταιρία, μπορούμε να προσθέσουμε `company_folder_templates`. Για τώρα reuse.
- Καμία αλλαγή σε edge functions ή secrets.

