

# Αναδομή Organization Settings & Fix Save Error

## Πρόβλημα
Το σφάλμα αποθήκευσης είναι **409 Conflict**: το domain "advize.gr" υπάρχει ήδη σε άλλη εταιρεία. Ο κώδικας δείχνει γενικό "Σφάλμα αποθήκευσης" χωρίς να εξηγεί τι πήγε στραβά. Επίσης, η δομή της σελίδας Organization Settings χρειάζεται βελτίωση — τα General και Security tabs πρέπει να γίνουν πιο ολοκληρωμένα.

## Αλλαγές

### 1. Fix Save Error Handling
- Parse the Supabase error response properly
- Detect `23505` (unique constraint violation on domain) and show a specific message: "Αυτό το domain χρησιμοποιείται ήδη από άλλη εταιρεία"
- Add input validation before save (trim, non-empty name, valid domain format)

### 2. Restructure Organization Settings Page
Ανανέωση του `OrganizationSettings.tsx` με πιο ολοκληρωμένη δομή:

**Tab: Γενικά**
- Όνομα εταιρείας
- Domain (with validation + duplicate error feedback)
- Logo upload (placeholder for now)
- Company description/industry (from `settings` jsonb)
- Timezone / language preferences

**Tab: Μέλη** (existing — keep as is, minor cleanup)

**Tab: Ασφάλεια** (existing — merge the two save buttons, add domain verification status badge)

**Tab: Activity Log** (new)
- Show recent company-scoped activity entries using the new `company_id` on `activity_log`

### 3. Separate Save Per Section
Currently both General and Security share `handleSaveSettings` which sends ALL fields. Refactor to:
- `handleSaveGeneral` — saves only name + domain
- `handleSaveSecurity` — saves only allow_domain_requests + sso_enforced

This prevents accidental overwrites and makes error handling cleaner.

### Files to Edit
- `src/pages/OrganizationSettings.tsx` — full refactor with better error handling, validation, activity tab, section-specific saves

