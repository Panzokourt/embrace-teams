

## Πρόβλημα

Ναι — το πρόβλημα είναι αρχιτεκτονικό, όχι απλώς UI.

Σήμερα οι προβολές **Κατά Πελάτη** και **Χρονολογικά** δεν αναπαράγουν τη real folder hierarchy. Δημιουργούν μόνο έναν “εικονικό” φάκελο πελάτη ή μήνα και μετά βάζουν όλα τα αρχεία απευθείας εκεί:

```text
Κατά Πελάτη
CAMPEON
  .DS_Store
  file.pdf
  file2.pdf
```

ενώ η πραγματική δομή υπάρχει στο project view:

```text
Κατά Έργο
CAMPEON – Γενικά
  HOUSEHOLD
    ΠΙΣΤΟΠΟΙΗΤΙΚΑ
      ΑΙΜΙΛΗ
        file.pdf
```

Άρα όταν αλλάζει view, δεν “χάνονται” τα folders από τη βάση — απλώς η προβολή τα αγνοεί και ξαναδένει τα files flat πάνω στο virtual group.

## Προτεινόμενη λύση

Να αλλάξουμε το σύστημα των προβολών ώστε όλες οι προβολές να είναι **lenses πάνω στην ίδια πραγματική δομή**, όχι διαφορετικές εικονικές δομές που πετάνε τα folders.

Δηλαδή:

- **Κατά Έργο**: `Έργο → πραγματικοί φάκελοι → αρχεία`
- **Κατά Πελάτη**: `Πελάτης → Έργα πελάτη → πραγματικοί φάκελοι → αρχεία`
- **Χρονολογικά**: `Μήνας → Έργα/Εταιρικά roots → πραγματικοί φάκελοι → αρχεία`
- **Εταιρία**: `Εταιρικοί φάκελοι → αρχεία`

Έτσι το ίδιο file/folder tree εμφανίζεται συνεπώς από διαφορετικές οπτικές, χωρίς να διαλύεται η ιεραρχία.

## Νέα συμπεριφορά προβολών

### 1. Κατά Έργο

Παραμένει όπως είναι, γιατί ήδη δουλεύει σωστά:

```text
CAMPEON – Γενικά
  HOUSEHOLD
    ΠΙΣΤΟΠΟΙΗΤΙΚΑ
      ΑΙΜΙΛΗ
        1. ΦΩΤΟΑΝΤΙΓΡΑΦΟ.pdf
```

Μικρή μόνο βελτίωση: θα χρησιμοποιεί κοινό helper για να μη διαφέρει από τις άλλες προβολές.

### 2. Κατά Πελάτη

Αντί να βάζει όλα τα files χύμα κάτω από τον πελάτη, θα δείχνει πρώτα τα έργα του πελάτη και μετά την πραγματική δομή φακέλων του κάθε έργου:

```text
CAMPEON
  CAMPEON – Γενικά
    HOUSEHOLD
      ΠΙΣΤΟΠΟΙΗΤΙΚΑ
        ΑΙΜΙΛΗ
          1. ΦΩΤΟΑΝΤΙΓΡΑΦΟ.pdf
  CAMPEON Gaming
    Briefs
    Συμβόλαια & Συμβάσεις
```

Αν ένας πελάτης έχει μόνο ένα project, πάλι θα εμφανίζεται το project ως ενδιάμεσο επίπεδο. Αυτό κρατάει τη λογική ξεκάθαρη και αποφεύγει collisions όταν δύο έργα έχουν ίδιους φακέλους.

### 3. Χρονολογικά

Αντί να εμφανίζει όλα τα αρχεία του μήνα flat, θα δείχνει:

```text
Απρίλιος 2026
  CAMPEON – Γενικά
    HOUSEHOLD
      ΠΙΣΤΟΠΟΙΗΤΙΚΑ
        ΑΙΜΙΛΗ
          file.pdf
  Εταιρικά
    HR
      file.pdf
```

Σημαντική λεπτομέρεια: στη χρονολογική προβολή θα εμφανίζονται μόνο τα branches της δομής που περιέχουν αρχεία του συγκεκριμένου μήνα. Δεν θα γεμίζει ο μήνας με άδειους φακέλους.

### 4. Εταιρία

Παραμένει ως καθαρή εταιρική προβολή:

```text
Templates
HR
Legal
```

και δεν θα μπερδεύεται με project files.

## Τεχνική προσέγγιση

### 1. Νέος helper για “scoped hierarchy”

Στο `CentralFileExplorer.tsx` θα αντικατασταθεί η τωρινή λογική των `virtualFolders / virtualFiles` με helpers τύπου:

```ts
buildProjectLens(projects, folders, files)
buildClientLens(clients, projects, folders, files)
buildDateLens(projects, folders, files)
```

Οι helpers θα κάνουν clone των real folders ως virtual nodes όταν χρειάζεται, αλλά θα κρατάνε σωστά τα parent-child relationships.

### 2. Stable virtual IDs για να μην συγκρούονται folders

Για grouped views θα χρησιμοποιηθούν deterministic IDs:

```text
vc:{clientId}
vp:{projectId}
vd:{yyyy-MM}
vd:{yyyy-MM}:project:{projectId}
lens:{view}:{realFolderId}
```

Έτσι το ίδιο real folder μπορεί να εμφανιστεί μέσα σε διαφορετικό context χωρίς να μπερδευτεί το `FinderColumnView`.

### 3. Files θα δείχνουν στο cloned folder path, όχι στο group root

Αν ένα file έχει `folder_id = AΙΜΙΛΗ`, τότε:

- στο Κατά Έργο θα μπει στο cloned/real `ΑΙΜΙΛΗ`
- στο Κατά Πελάτη θα μπει στο `CAMPEON → Project → ... → ΑΙΜΙΛΗ`
- στο Χρονολογικά θα μπει στο `Απρίλιος 2026 → Project → ... → ΑΙΜΙΛΗ`

Μόνο αρχεία χωρίς `folder_id` θα μπαίνουν στο αντίστοιχο project/month root.

### 4. “Pruned tree” για Χρονολογικά

Για κάθε μήνα:

1. βρίσκουμε τα files του μήνα
2. βρίσκουμε τους φακέλους τους
3. ανεβαίνουμε στους ancestors μέχρι root
4. εμφανίζουμε μόνο αυτά τα folders

Έτσι διατηρείται η δομή χωρίς να εμφανίζονται άσχετοι/άδειοι φάκελοι.

### 5. Προστασία στις ενέργειες επεξεργασίας

Επειδή τα grouped views θα περιέχουν virtual/cloned folders:

- Rename/Delete/Move θα επιτρέπονται μόνο σε real folders ή θα μεταφράζονται στο original real folder id.
- Virtual group folders όπως `Πελάτης`, `Μήνας`, `Project group` δεν θα μπορούν να μετονομαστούν/διαγραφούν σαν κανονικοί φάκελοι.
- Upload σε virtual client/date group θα συνεχίσει να ανοίγει destination picker, γιατί χρειάζεται project/folder απόφαση.
- Upload σε real/cloned folder θα πηγαίνει στον αντίστοιχο πραγματικό folder.

### 6. Αφαίρεση των duplicated flat `.DS_Store`

Θα προστεθεί client-side φίλτρο για system artifacts που προκύπτουν από folder imports:

```text
.DS_Store
__MACOSX
Thumbs.db
desktop.ini
```

Αυτό θα εφαρμοστεί:
- στην εμφάνιση στο explorer
- και στο import/upload flow ώστε να μην ξανανεβαίνουν τέτοια αρχεία

Δεν θα διαγράψουμε αυτόματα όσα υπάρχουν ήδη στη βάση χωρίς ξεχωριστή έγκριση, αλλά δεν θα εμφανίζονται πλέον.

## Αρχεία που θα αλλάξουν

- `src/components/files/CentralFileExplorer.tsx`
  - αντικατάσταση της flat grouped-view λογικής
  - νέοι hierarchy/lens builders
  - σωστή αντιστοίχιση files σε cloned folder ids
  - φίλτρο system files

- `src/components/files/FinderColumnView.tsx`
  - μικρή προσαρμογή ώστε να αναγνωρίζει cloned folder metadata/original ids
  - προστασία bulk actions/context menu για virtual group nodes
  - σωστό breadcrumbs label ανά view

Πιθανώς:
- `src/components/files/import-wizard/ImportWizard.tsx`
- `src/components/files/import-wizard/StepSource.tsx`

μόνο για να αγνοούνται `.DS_Store`, `__MACOSX`, `Thumbs.db`, `desktop.ini` κατά την εισαγωγή.

## Τι δεν θα αλλάξει

- Δεν αλλάζει το database schema.
- Δεν αλλάζουν RLS policies.
- Δεν αλλάζει ο τρόπος αποθήκευσης αρχείων.
- Δεν θα διαγραφούν αυτόματα υπάρχοντα αρχεία.
- Δεν θα χαλάσει η προβολή Κατά Έργο που ήδη δουλεύει σωστά.

## Verification

1. Άνοιγμα `/files` σε **Κατά Έργο**: επιβεβαίωση ότι η υπάρχουσα δομή παραμένει σωστή.
2. Αλλαγή σε **Κατά Πελάτη**: ο πελάτης δείχνει projects και κάτω από αυτά την ίδια folder/subfolder hierarchy.
3. Αλλαγή σε **Χρονολογικά**: κάθε μήνας δείχνει pruned hierarchy, όχι flat λίστα.
4. Άνοιγμα του path από τα screenshots:
   `CAMPEON → ... → HOUSEHOLD → ΠΙΣΤΟΠΟΙΗΤΙΚΑ → ΑΙΜΙΛΗ`
   και επιβεβαίωση ότι τα PDFs είναι μέσα στον σωστό υποφάκελο και όχι χύμα.
5. Επιβεβαίωση ότι `.DS_Store` δεν εμφανίζεται και δεν ανεβαίνει σε νέο import.
6. Έλεγχος ότι multi-select, bulk move/delete και drag/drop συνεχίζουν να δουλεύουν με real folders και προστατεύουν τα virtual group nodes.

<lov-actions>
<lov-suggestion message="Υλοποίησε τη νέα lens-based δομή προβολών στο Κεντρικό Αρχείο και μετά να το δοκιμάσουμε end-to-end σε Κατά Έργο, Κατά Πελάτη και Χρονολογικά.">Υλοποίηση & end-to-end test</lov-suggestion>
<lov-suggestion message="Πρόσθεσε καθαρισμό για υπάρχοντα system files όπως .DS_Store, __MACOSX, Thumbs.db και desktop.ini από το Κεντρικό Αρχείο, με ασφαλές confirmation πριν τη διαγραφή.">Καθάρισμα system files</lov-suggestion>
<lov-suggestion message="Πρόσθεσε ένδειξη πλήρους διαδρομής folder/file στο preview sidebar και στα tooltips, ώστε να είναι ξεκάθαρο πού ανήκει κάθε αρχείο σε όλες τις προβολές.">Πλήρης διαδρομή αρχείου</lov-suggestion>
</lov-actions>

