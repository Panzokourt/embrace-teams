

# Προσθήκη Διάρκειας Πακέτου

## Τι αλλάζει

Προσθήκη δύο πεδίων στον πίνακα `service_packages`:
- **`duration_type`**: Τύπος διάρκειας (`fixed_days`, `monthly`, `quarterly`, `semi_annual`, `annual`, `custom_months`)
- **`duration_value`**: Αριθμητική τιμή (π.χ. 60 μέρες, 3 μήνες κλπ)

Αυτό καλύπτει όλα τα σενάρια:
- Retainer μηνιαίο → `monthly`, value: 1
- Retainer 3μηνο → `quarterly`, value: 3
- 60 μέρες → `fixed_days`, value: 60
- Ετήσιο → `annual`, value: 12

## Αλλαγές

### 1. Database Migration
- `ALTER TABLE service_packages ADD COLUMN duration_type text DEFAULT 'monthly'`
- `ALTER TABLE service_packages ADD COLUMN duration_value integer DEFAULT 1`

### 2. Frontend — `PackageFormDialog.tsx`
- Νέα πεδία στο form: dropdown για τύπο διάρκειας + input για τιμή
- Αυτόματη ενημέρωση value βάσει τύπου (π.χ. quarterly → 3)

### 3. Frontend — `PackagesList.tsx`
- Νέα στήλη "Διάρκεια" στον πίνακα με human-readable label (π.χ. "3 μήνες", "60 ημέρες", "Ετήσιο")

### 4. Frontend — `usePricingData.ts`
- Προσθήκη `duration_type` και `duration_value` στο `ServicePackage` interface

### 5. Edge Function — `suggest-package`
- Προσθήκη `duration_type` / `duration_value` στο tool schema ώστε το AI να προτείνει και διάρκεια

