

# Wizard Upload με AI Ανάλυση → Αυτόματη Εφαρμογή στο Έργο

## Τι αλλάζει

### 1. Νέο multi-step Upload Wizard (αντικατάσταση του FileUploadDialog)
Βήματα:
1. **Επιλογή αρχείου** — drag & drop ή file picker + επιλογή τύπου εγγράφου
2. **AI Ανάλυση** (προαιρετικό) — τρέχει η ανάλυση, εμφανίζει τα αποτελέσματα σε κατηγορίες που αντιστοιχούν στα πεδία του έργου
3. **Επεξεργασία & Εφαρμογή** — ο χρήστης βλέπει editable πεδία ομαδοποιημένα:
   - **Γενικά**: Περιγραφή/Περίληψη
   - **Οικονομικά**: Budget, Αξία, Νόμισμα
   - **Ημερομηνίες**: Ημ. Έναρξης, Ημ. Λήξης
   - **Παραδοτέα**: λίστα deliverables (checkbox ποια να δημιουργηθούν)
   - **Tasks**: λίστα actions/tasks (checkbox ποια να δημιουργηθούν)
   - **Συμβαλλόμενα Μέρη**: (αν contract)
4. **Αποθήκευση** — πατά κουμπί → τα selected πεδία εφαρμόζονται:
   - `projects.budget` ← budget/value
   - `projects.start_date` / `end_date` ← ημερομηνίες
   - `projects.description` ← summary (append)
   - Δημιουργία records στον πίνακα `deliverables`
   - Δημιουργία records στον πίνακα `tasks`
   - Δημιουργία record στο `project_contracts` (αν contract)
   - Αυτόματη τοποθέτηση αρχείου στον σωστό φάκελο βάσει document_type

### 2. Contracts Card — απλοποίηση
Η `ProjectContractsCard` δείχνει μόνο τα αρχεία (file name, download link, ημερομηνία upload) χωρίς extracted πληροφορίες. Οι πληροφορίες έχουν ήδη εφαρμοστεί στα πεδία του έργου.

### 3. Αυτόματη τοποθέτηση σε φάκελο
Ήδη υπάρχει η `DOCTYPE_FOLDER_MAP` — απλά διασφαλίζουμε ότι εφαρμόζεται πάντα κατά το upload (και στο drag-drop).

## Αρχεία

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/files/FileUploadDialog.tsx` | Πλήρης αναδόμηση σε multi-step wizard με AI analysis preview, editable πεδία ομαδοποιημένα ανά κατηγορία, κουμπί "Εφαρμογή & Αποθήκευση" |
| `src/components/files/FileExplorer.tsx` | Νέα `applyAnalysisToProject` function: ενημερώνει project fields, δημιουργεί deliverables/tasks/contracts |
| `src/components/projects/ProjectContractsCard.tsx` | Απλοποίηση: εμφάνιση μόνο file name + download + ημερομηνία |
| `src/components/files/DocumentAnalysisPanel.tsx` | Πιθανή κατάργηση ή μετατροπή σε read-only view (δεν χρειάζεται πλέον editing εδώ) |

