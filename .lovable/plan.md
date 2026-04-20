
## Τι συμβαίνει τώρα

Υπάρχουν 2 ξεχωριστά προβλήματα:

1. **Ανοίγει μόνο του στο refresh**
   - Το `rightPanelOpen` ξεκινά `false`, αλλά κάτι το ξανανοίγει μετά το mount.
   - Ο τωρινός guard των `500ms` δεν αρκεί, γιατί το άνοιγμα φαίνεται να συμβαίνει αργότερα ή από event/state path που παραμένει ενεργό.

2. **Όταν ανοίγει, σκουραίνει/μπλοκάρει την υπόλοιπη εφαρμογή**
   - Στο `useLayoutState.ts`, για viewport σαν το δικό σου (`1422px`), το layout μπαίνει σε `standard`, και το `rightPanelMode` γίνεται `overlay`.
   - Άρα το panel εμφανίζεται σαν modal layer με backdrop, όχι σαν το παλιό “κανονικό” δεξί sidebar.

## Σχέδιο διόρθωσης

### 1. Να μην είναι ποτέ ανοιχτό στο αρχικό load
Στο `AppLayout.tsx` θα γίνει πιο αυστηρό control ώστε το panel να ξεκινά και να **μένει κλειστό** στο app boot / refresh.

Θα το διορθώσω με λογική τύπου:
- explicit initial closed state
- reset/ignore mount-time open triggers
- άνοιγμα μόνο από ξεκάθαρα user-initiated actions:
  - click στο topbar button
  - `Cmd/Ctrl + J`
  - συνειδητό voice submit
  - συνειδητό secretary navigation action

### 2. Να φύγει το overlay behavior στο desktop
Θα αλλάξω το responsive mapping ώστε σε desktop/laptop widths το δεξί panel να είναι **dockable sidebar** και όχι modal overlay.

Στόχος:
- **mobile** → drawer
- **desktop / laptop** → docked right sidebar
- χωρίς blur / dim / αποκλεισμό της υπόλοιπης εφαρμογής

### 3. Να καθαρίσει η λογική ανοίγματος
Θα περιορίσω τα programmatic open paths ώστε να μην μπορεί κάποιο background flow να ανοίγει το panel μόνο του.

Πρακτικά:
- review στο `open-secretary-panel`
- έλεγχος του registration flow από `VoiceCommandProvider`
- αποφυγή auto-open από mount/hydration side-effects
- διατήρηση μόνο των πραγματικά επιθυμητών open actions

### 4. Verification
Θα ελεγχθεί ότι:
- σε hard refresh το panel είναι **κλειστό**
- η εφαρμογή μένει πλήρως usable χωρίς σκοτείνιασμα
- με click στο toggle ανοίγει σαν κανονικό δεξί sidebar
- με δεύτερο click κλείνει
- `Cmd/Ctrl + J` λειτουργεί σωστά
- mobile συνεχίζει να δουλεύει σαν drawer

## Αρχεία που θα αλλάξουν
- `src/components/layout/AppLayout.tsx`
- `src/hooks/useLayoutState.ts`

## Τεχνικές σημειώσεις
- Δεν χρειάζεται DB αλλαγή
- Δεν χρειάζεται backend αλλαγή
- Το βασικό fix είναι:
  1. **να σταματήσει το auto-open στο mount**
  2. **να επιστρέψει το non-modal desktop right panel behavior**
