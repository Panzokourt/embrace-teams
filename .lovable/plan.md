
## Διορθώσεις centering + secretary auto-open

### Στόχοι
1. Το **bottom dock** να είναι πάντα κεντραρισμένο ως προς όλο το viewport/page, όχι ως προς τη μεσαία στήλη.
2. Τα **στοιχεία του TopBar** να ακολουθούν την ίδια λογική κεντραρίσματος.
3. Το **Secretary panel να μην ανοίγει ποτέ μόνο του στο refresh** και να ανοίγει μόνο από ρητή ενέργεια χρήστη.

### Τι θα αλλάξει

#### 1) Bottom bar: πραγματικό page-centering
Το σημερινό dock είναι `absolute` μέσα στη middle column (`AppLayout`), άρα μετατοπίζεται δεξιά όταν υπάρχει sidebar.

Θα το αλλάξω ώστε:
- το dock να αποδίδεται σε **viewport-centered layer**
- να χρησιμοποιεί `fixed` positioning
- να κεντράρεται με βάση το **viewport** (`left-1/2 -translate-x-1/2`) και όχι το content column

Αυτό θα εφαρμοστεί σε:
- `src/components/dock/FloatingDock.tsx`
- `src/components/dock/FloatingDockPanel.tsx`
- `src/components/quick-chat/QuickChatBar.tsx`
- `src/components/layout/AppLayout.tsx`

#### 2) Top bar: τα περιεχόμενα να κάθονται στο οπτικό κέντρο της σελίδας
Το `TopBar` σήμερα είναι δεμένο στο πλάτος της middle column. Θα κρατήσω το υπάρχον layout shell, αλλά θα ξαναστήσω το εσωτερικό του TopBar ώστε:
- το search + setup + quick actions να ζουν σε **κεντρικό inner wrapper**
- αυτό το wrapper να είναι οπτικά κεντραρισμένο ως προς τη σελίδα
- το hamburger/mobile controls να μένουν λειτουργικά χωρίς να σπάνε το centering

Πρακτικά:
- εξωτερικό bar: παραμένει sticky
- εσωτερικό content: `relative`
- κεντρικό cluster: `absolute/flex` ή dedicated centered container ώστε το main group να μην σπρώχνεται από το sidebar

Αρχεία:
- `src/components/layout/TopBar.tsx`
- πιθανό μικρό support refactor στο `src/components/layout/AppLayout.tsx`

#### 3) Secretary: να μην ανοίγει μόνος του στο refresh
Αυτό είναι bug συμπεριφοράς, όχι desired state. Από το διάβασμα του κώδικα, το άνοιγμα ελέγχεται από `DockContext` + `VoiceCommandProvider` + global custom events.

Θα το διορθώσω με πιο αυστηρή ροή:
- `activePanel` θα ξεκινά πάντα ως `null`
- δεν θα υπάρχει καμία mount-time λογική που ανοίγει `secretary`
- θα αφαιρέσω/σφίξω το legacy event path που μπορεί να ανοίγει το panel χωρίς ρητή ενέργεια
- το Secretary θα ανοίγει μόνο από:
  - click στο dock icon
  - `⌘/Ctrl + J`
  - explicit voice action / command flow
  - explicit secretary navigation action

Πιθανή κατεύθυνση υλοποίησης:
- απλοποίηση του `open-secretary-panel` flow
- μεταφορά στο direct callback path όπου γίνεται
- hardening στο `VoiceCommandProvider` ώστε να μην πυροδοτεί open σε initial mount
- διατήρηση του `secretary-navigate` μόνο για πραγματικές secretary actions

Αρχεία:
- `src/contexts/DockContext.tsx`
- `src/components/secretary/VoiceCommandProvider.tsx`
- `src/components/layout/AppLayout.tsx`

### Σχεδιαστική προσαρμογή
Για να δένει το UI:
- dock, dock popover και quick chat θα ευθυγραμμίζονται στον ίδιο οριζόντιο άξονα
- το TopBar central cluster θα ακολουθεί το ίδιο visual center
- δεν θα αλλάξω το gradient/glass style που ήδη έβαλες, απλώς θα διορθωθεί η γεωμετρία/στοίχιση

### Build / verification
Το reported build error που φαίνεται αυτή τη στιγμή είναι infra `503` sandbox issue, όχι code-level TypeScript error. Όταν περάσω σε implementation mode θα:
- εφαρμόσω τις παραπάνω αλλαγές
- κάνω build/type verification μόλις επανέλθει το sandbox
- ελέγξω 3 cases:
  1. refresh στο `/` → **Secretary κλειστό**
  2. click Secretary icon / `⌘J` → **Secretary ανοίγει σωστά**
  3. dock + top bar + quick chat → **όλα παραμένουν centered**

### Αρχεία που θα πειραχτούν
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/dock/FloatingDock.tsx`
- `src/components/dock/FloatingDockPanel.tsx`
- `src/components/quick-chat/QuickChatBar.tsx`
- `src/contexts/DockContext.tsx`
- `src/components/secretary/VoiceCommandProvider.tsx`
