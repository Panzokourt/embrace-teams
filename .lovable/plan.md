
## Τι βρήκα

Υπάρχουν 2 διαφορετικά bugs:

1. Το upload του PDF στο root της προβολής δείχνει ότι “ανέβηκε”, αλλά δεν εμφανίζεται εκεί που περιμένεις.
   - Στο network το upload στο storage ολοκληρώνεται κανονικά.
   - Το πρόβλημα είναι στο metadata insert / στο πού συνδέεται το αρχείο μέσα στο explorer.

2. Όταν κάνεις drop μέσα σε φάκελο/ομάδα της κεντρικής προβολής, σπάει με:
   - `invalid input syntax for type uuid: "vc-..."`
   - Άρα το app προσπαθεί να γράψει virtual id από grouped view (`vc-`, `vp-`, `vd-`) στο `folder_id`, ενώ το `folder_id` θέλει πραγματικό UUID.

## Γιατί συμβαίνει

Το `/files` δουλεύει με “εικονικές” ρίζες:
- `vp-*` = project group
- `vc-*` = client group
- `vd-*` = date group

Αυτά είναι μόνο για προβολή, όχι πραγματικοί φάκελοι στη βάση.

Σήμερα όμως:
- το upload flow τα περνά σαν κανονικά `folder_id`
- και σε αρκετές περιπτώσεις δεν παράγει σωστό `project_id`
- άρα άλλοτε αποτυγχάνει, άλλοτε το αρχείο ανεβαίνει αλλά “χάνεται” από την τρέχουσα grouped προβολή

## Πρόταση σωστού συστήματος αρχειοθέτησης

### Κανόνας 1 — όταν υπάρχει σαφής προορισμός, ανεβάζουμε απευθείας
Αν ρίξεις αρχείο/φάκελο:
- μέσα σε πραγματικό φάκελο → μπαίνει εκεί
- πάνω σε project group → μπαίνει στο project αυτό
- μέσα σε φάκελο που ανήκει σε project → κληρονομεί το project του φακέλου

### Κανόνας 2 — όταν ο προορισμός είναι ασαφής, δεν μαντεύουμε
Αν κάνεις upload:
- στο root του `/files`
- σε client group
- σε date group
- ή γενικά σε virtual σημείο χωρίς μοναδικό πραγματικό destination

τότε το app πρέπει να ανοίγει **διάλογο επιλογής προορισμού**:
- Έργο
- προαιρετικά Φάκελος μέσα στο έργο
- επιλογή “Χωρίς φάκελο μέσα στο έργο”

Αυτό είναι το πιο ασφαλές σύστημα ώστε να μη χάνονται αρχεία και να μη μπερδεύεται η αυτόματη δομή.

### Κανόνας 3 — οι grouped προβολές είναι για browsing, όχι για αποθήκευση χωρίς context
- `Κατά Έργο`: επιτρέπεται direct upload αν το project είναι γνωστό
- `Κατά Πελάτη`: αν ο πελάτης έχει πολλά projects, ζητάμε επιλογή project
- `Χρονολογικά`: πάντα ζητάμε προορισμό, γιατί η ημερομηνία δεν είναι storage destination

## Τι θα αλλάξω

### 1. Resolve πραγματικού destination πριν από κάθε upload
Στο `CentralFileExplorer.tsx` θα προστεθεί λογική που μετατρέπει το drop target σε:
- `projectId`
- `folderId` μόνο αν είναι πραγματικός φάκελος
- ποτέ virtual id στο DB

### 2. Fix στο upload αρχείων
Το `handleUpload` θα γράφει σωστά:
- `project_id` όταν το upload γίνεται μέσα σε project scope
- `folder_id` μόνο με αληθινό folder UUID
- fallback σε destination picker όταν λείπει σαφές project context

### 3. Fix στο upload φακέλων
Το `handleUploadFolder` θα κάνει το ίδιο για:
- drag & drop folders
- input folder upload
- recursive hierarchy creation κάτω από το σωστό project / parent folder

### 4. Fix στη δημιουργία φακέλων από την κεντρική προβολή
Το `handleCreateFolder` επίσης θα πρέπει:
- αν είσαι κάτω από project group ή project-scoped folder, να αποθηκεύει και `project_id`
- αν είσαι σε ambiguous virtual root, να ζητά project πριν δημιουργήσει φάκελο

### 5. Destination picker UI
Θα προστεθεί μικρό dialog για περιπτώσεις χωρίς σαφή προορισμό:
- επιλογή έργου
- επιλογή φακέλου (προαιρετικά)
- καθαρό μήνυμα τύπου “Δεν είναι σαφές πού να αποθηκευτεί αυτό το αρχείο”

## Αρχεία που θα αλλάξουν

- `src/components/files/CentralFileExplorer.tsx`
- `src/components/files/FinderColumnView.tsx`
- πιθανό νέο helper/component για destination picker (αν το κρατήσω καθαρό UI-wise)

## Verification

Θα ελεγχθεί ότι:

- drag & drop PDF στο root δεν “χάνεται”
- drag & drop μέσα σε project group το αποθηκεύει σωστά
- drag & drop μέσα σε πραγματικό φάκελο δουλεύει
- drag & drop folder με υποφακέλους δουλεύει
- drag & drop σε client/date grouped views ζητά προορισμό αντί να σπάει
- newly uploaded files εμφανίζονται αμέσως στη σωστή προβολή

## Τεχνικές σημειώσεις

- Δεν χρειάζεται DB migration
- Το schema ήδη έχει τα σωστά πεδία (`file_attachments.project_id`, `file_attachments.folder_id`, `file_folders.project_id`)
- Το βασικό fix είναι να σταματήσει το app να αντιμετωπίζει τα virtual grouped ids σαν πραγματικά folder ids
