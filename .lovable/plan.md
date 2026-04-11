
Επιβεβαιώνεται: το `.env` υπάρχει στο git και απουσιάζει από `.gitignore`. Πρέπει να διορθωθεί για να μην εκτεθούν διαπιστευτήρια.

## Ενέργειες

| Βήμα | Αρχείο | Αλλαγή |
|------|--------|--------|
| 1 | `.gitignore` | Προσθήκη `.env` στο τέλος |
| 2 | `git rm --cached .env` | Αφαίρεση από tracking (χωρίς διαγραφή αρχείου) |
| 3 | `.env.example` | **Νέο** — template με placeholder τιμές για developers |
| 4 | Git commit | `chore: remove .env from tracking` |

## Σημείωση security
Το Supabase anon key (VITE_SUPABASE_PUBLISHABLE_KEY) που εμφανίζεται είναι **client-safe** (δεν είναι secret), αλλά η πρακτική να μπαίνει `.env` στο git πρέπει να διορθωθεί για μελλοντική προστασία άλλων secrets.
