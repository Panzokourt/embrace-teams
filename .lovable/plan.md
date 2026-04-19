
## Πρόβλημα
Τα social links εξακολουθούν να ανοίγουν μέσα σε embedded/preview context αντί για καθαρό top-level tab. Γι’ αυτό Facebook / Instagram / YouTube γυρίζουν `ERR_BLOCKED_BY_RESPONSE`. Επιπλέον, η τωρινή λογική μπορεί να προκαλεί διπλό άνοιγμα tab.

## Ρίζα του bug
Στο `InlineSocialAccountsField.tsx` το link ανοίγει με:
- `window.open(normalized, '_blank', ...)`
- και fallback με προσωρινό `<a target="_blank">`

Στο preview environment αυτό δεν εγγυάται “καθαρό” external navigation. Για ορισμένα domains ο browser/shell συνεχίζει να τα χειρίζεται σαν embedded load, ενώ ο fallback μηχανισμός μπορεί να συμβάλλει στο να ανοίγουν 2 tabs.

## Σχέδιο διόρθωσης

### 1. Αντικατάσταση του open flow με single-path external launch
Θα αλλάξω το social link opening ώστε:
- να ανοίγει πρώτα **κενό tab** (`about:blank`)
- και μετά να κάνει `location.replace(normalizedUrl)` στο νέο tab
- χωρίς δεύτερο fallback που ξαναπυροδοτεί άνοιγμα

Αυτό είναι πιο αξιόπιστο για Facebook / Instagram / YouTube μέσα από preview/iframe περιβάλλοντα.

### 2. Κεντρικός helper για external URLs
Θα μεταφέρω τη λογική σε shared helper (π.χ. `src/lib/utils.ts`) ώστε:
- να υπάρχει μία μόνο ασφαλής στρατηγική ανοίγματος
- να κρατήσουμε normalization + protocol enforcement
- να μπορούμε να τη χρησιμοποιήσουμε και σε άλλα cards αν χρειαστεί

### 3. Hardening του URL normalization
Θα κρατήσω normalization για:
- `facebook.com/...` → `https://facebook.com/...`
- `www.instagram.com/...` → `https://www.instagram.com/...`
- `//youtube.com/...` → `https://youtube.com/...`

και θα αποτρέψω invalid / empty values πριν γίνει open.

### 4. Update του Social card UI
Στο `InlineSocialAccountsField.tsx`:
- το external icon θα καλεί μόνο τον νέο helper
- δεν θα υπάρχει δεύτερο fallback path που μπορεί να ανοίγει δεύτερο tab
- αν κάτι αποτύχει, θα εμφανίζεται toast αντί να γίνεται δεύτερη προσπάθεια που μπερδεύει

### 5. Verification
Θα ελέγξω ειδικά τα 3 προβληματικά domains:
- Facebook
- Instagram
- YouTube

ώστε να ανοίγουν σε **ένα μόνο tab** και όχι σε blocked embedded page.

## Αρχεία που θα αλλάξουν
- `src/components/clients/detail/InlineSocialAccountsField.tsx`
- `src/lib/utils.ts`

## Αναμενόμενο αποτέλεσμα
Μετά το fix:
- τα social links θα ανοίγουν σε πραγματικό external tab,
- δεν θα ανοίγουν 2 tabs,
- Facebook / Instagram / YouTube δεν θα περνάνε πλέον από blocked embedded rendering μέσα στο preview shell.
