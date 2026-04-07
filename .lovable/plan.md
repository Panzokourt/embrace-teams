

# Plan: Auth & Onboarding Fixes (4 issues)

## 1. Google OAuth Branding — Lovable URL/branding visible
**Issue**: Κατά το Google sign-in, ο χρήστης βλέπει "Lovable" στο consent screen και `oauth.lovable.app` στο URL.
**Solution**: Αυτό ελέγχεται από τα OAuth credentials στο Google Cloud Console. Δεν μπορεί να αλλάξει μέσω κώδικα — πρέπει να ρυθμίσεις τα δικά σου Google OAuth credentials ώστε να εμφανίζεται "Olseny" αντί "Lovable". Αυτό γίνεται μέσω Cloud → Authentication Settings → Google → Add your own Client ID/Secret. Θα σου δείξω πώς μετά την υλοποίηση.

## 2. Domain field στο Onboarding — Κρύψιμο & auto-detect
**File**: `src/pages/Onboarding.tsx`
- Αφαίρεση του domain input πεδίου από τη φόρμα δημιουργίας εταιρείας
- Χρήση αυτόματα του `emailDomain` (ήδη υπάρχει στο state) αν το email είναι εταιρικό
- Αν είναι personal email, χρήση `'none'` ή αφαίρεση domain εντελώς
- Στο `handleCreateCompany`, αλλαγή: `_domain: isPersonalEmail ? companyName.trim().toLowerCase().replace(/\s+/g, '') + '.local' : emailDomain`

## 3. Error "duplicate value violates unique constraint companies_domain_key"
**File**: `src/pages/Onboarding.tsx` → `handleCreateCompany`
- Catch the `23505` error code and show user-friendly Greek message: "Υπάρχει ήδη εταιρεία με αυτό το domain. Ζητήστε πρόσβαση."
- For personal emails, generate a unique domain (e.g. `{companyName}-{userId.slice(0,8)}.personal`) to avoid collisions

## 4. Auth page — Remove left panel, force light mode
**File**: `src/pages/Auth.tsx`
- Remove the entire left `lg:w-1/2 bg-sidebar` panel
- Center the auth card on the full width
- Add logo above the card (already exists for mobile, make it always visible)
- Keep `Feature` component but remove usage

**File**: `src/pages/Auth.tsx`, `src/pages/Onboarding.tsx`, `src/pages/ResetPassword.tsx`
- Add `className="light"` attribute to the root `<div>` or use a wrapper that forces light mode on pre-auth pages
- Override with inline data-theme or a class that forces light CSS variables

**File**: `src/index.css` (or new utility)
- Add a `.force-light` class that sets light mode CSS variables regardless of system/user preference

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Remove left panel, center auth card, force light mode |
| `src/pages/Onboarding.tsx` | Hide domain field, auto-set domain, handle duplicate domain error |
| `src/pages/ResetPassword.tsx` | Force light mode wrapper |
| `src/index.css` | Add `.force-light` utility class |

