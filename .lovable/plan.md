

## Πρόβλημα
Κάθε refresh ανοίγει αυτόματα το δεξί panel (Secretary), παρότι ο user δεν το ζήτησε.

## Διάγνωση
Στο `AppLayout.tsx`:
- Το `rightPanelOpen` αρχικοποιείται σε `false` και **δεν** persistάρεται
- Όμως υπάρχει event listener `open-secretary-panel` που σε κάθε λήψη event κάνει `setRightPanelOpen(true)`
- Επιπλέον, υπάρχει νεκρή σταθερά `PANEL_OPEN_KEY = 'secretary-panel-open'` που υποδηλώνει ότι παλιότερα γινόταν persist — πιθανώς υπάρχει ακόμη παλιά τιμή `true` στο localStorage που κάποτε χρησιμοποιόταν, και κάποιο legacy hook/component μπορεί ακόμη να την διαβάζει ή να εκπέμπει `open-secretary-panel` στο mount.

Επίσης ο `VoiceCommandProvider` εκπέμπει `open-secretary-panel` σε ορισμένες περιπτώσεις voice flow.

## Σχέδιο διόρθωσης

### 1. Force-closed στο πρώτο mount
Στο `AppLayout.tsx`:
- Διασφάλιση ότι το `rightPanelOpen` ξεκινά πάντα `false`
- Προσθήκη ενός `useEffect` που **καθαρίζει** το legacy `secretary-panel-open` localStorage key (αν υπάρχει) ώστε να μην τραβιέται πουθενά αλλού
- Αφαίρεση της νεκρής σταθεράς `PANEL_OPEN_KEY` για να μην γίνει κατά λάθος επανασύνδεση

### 2. Άμυνα στους event listeners
- Ο listener του `open-secretary-panel` θα αγνοεί events που έρχονται **κατά το initial mount window** (π.χ. πρώτα ~500ms μετά το mount), ώστε ακόμα κι αν κάποιο legacy κομμάτι το dispatchάρει σε mount, να μην ανοίγει το panel
- Παραμένει πλήρως λειτουργικό για user-initiated actions (κουμπιά, voice command, Cmd+J)

### 3. Verification
- Hard refresh στο `/clients`, `/`, `/projects`: το panel πρέπει να είναι **κλειστό**
- Πάτημα στο toggle icon → ανοίγει
- Cmd+J → ανοίγει/κλείνει κανονικά
- Voice command flow → εξακολουθεί να ανοίγει το panel μετά από user trigger

## Αρχεία που θα αλλάξουν
- `src/components/layout/AppLayout.tsx`

## Τεχνικές σημειώσεις
- Καμία αλλαγή σε DB ή edge functions
- Καμία αλλαγή στη συμπεριφορά ανοίγματος μέσω user actions
- Μόνο guard ενάντια σε auto-open στο initial load

