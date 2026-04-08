

# Enhanced Onboarding Wizard — Full Setup + AI-Assisted

## Σημερινή κατάσταση

Τα τρέχοντα βήματα είναι: Welcome → Company → Profile (phone/job title) → Preferences (theme only) → Ready. Πολύ βασικό, δεν συλλέγει αρκετά δεδομένα για να δουλέψει σωστά η εφαρμογή.

## Νέα δομή Wizard (8 βήματα, όλα skippable)

```text
1. Welcome        — Greeting + AI assistant intro
2. Company Setup   — (υπάρχει) + industry, size, logo upload
3. Profile         — (υπάρχει) + avatar, department
4. Team Invite     — Πρόσκληση μελών ομάδας (emails)
5. First Client    — Δημιουργία πρώτου πελάτη
6. Company Docs    — Upload εταιρικών αρχείων → auto-compile στο Wiki
7. AI Setup        — AI αναλύει τα docs + δημιουργεί KB articles + Brain memory
8. Ready           — Summary + guided tour hints
```

## Λεπτομέρειες ανά βήμα

### Step 2: Company Setup (ενισχυμένο)
- Νέα πεδία: `industry` (dropdown: Technology, Marketing, Finance, Legal, κλπ), `company_size` (1-10, 11-50, 51-200, 200+)
- Upload logo (χρήση υπάρχοντος storage bucket)
- Migration: `ALTER TABLE companies ADD COLUMN industry text, ADD COLUMN company_size text`

### Step 3: Profile (ενισχυμένο)
- Avatar upload
- Department selection/creation
- Timezone (auto-detect)

### Step 4: Team Invite (νέο)
- Multi-email input (comma separated)
- Χρήση υπάρχοντος invitation system
- "Θα τους στείλουμε πρόσκληση μέσω email"

### Step 5: First Client (νέο)
- Βασικά πεδία: name, email, sector
- Insert στο `clients` table
- "Μπορείτε να προσθέσετε περισσότερους αργότερα"

### Step 6: Company Docs (νέο, AI-powered)
- Drag & drop zone για εταιρικά αρχεία (manifesto, brand guidelines, policies)
- Upload στο `project-files` bucket
- Αποθήκευση ως `kb_raw_sources` (compiled=false)

### Step 7: AI Setup (νέο)
- Αυτόματο compile των uploaded docs μέσω `kb-compiler` edge function
- Progress bar + streaming status messages
- Δημιουργεί Wiki articles + Brain memory entries
- "Ο AI βοηθός σας μαθαίνει για την εταιρεία σας..."

### Step 8: Ready (ενισχυμένο)
- Summary card με όλα τα στοιχεία
- Quick links: "Δημιουργήστε το πρώτο project", "Ανοίξτε τον Secretary"
- Confetti animation

## Database Migration

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_size text;
```

## Αρχιτεκτονική

Το Onboarding.tsx σπάει σε components για ευκολία:

```text
src/components/onboarding/
  OnboardingWelcome.tsx
  OnboardingCompany.tsx
  OnboardingProfile.tsx
  OnboardingTeamInvite.tsx
  OnboardingFirstClient.tsx
  OnboardingCompanyDocs.tsx
  OnboardingAISetup.tsx
  OnboardingReady.tsx
```

Κάθε step component λαμβάνει `onNext`, `onBack`, `onSkip` props. Η κύρια λογική παραμένει στο `Onboarding.tsx`.

## Τι προτείνω επιπλέον για νέο χρήστη

- **Welcome email** με quick-start guide (ήδη υπάρχει email infra με Resend)
- **Secretary auto-greet**: Στο πρώτο login μετά το onboarding, ο Secretary στέλνει proactive μήνυμα "Γεια! Είδα ότι μόλις ρυθμίσατε... Θέλετε βοήθεια;"
- **Sample data option**: Κουμπί "Γέμισε με demo data" (sample project, tasks, client) για να δει ο χρήστης πώς δουλεύει η εφαρμογή

## Files

| File | Αλλαγή |
|------|--------|
| Migration | +2 columns στο companies (industry, company_size) |
| `src/pages/Onboarding.tsx` | Refactor σε 8 steps, orchestrator logic |
| `src/components/onboarding/OnboardingWelcome.tsx` | Νέο |
| `src/components/onboarding/OnboardingCompany.tsx` | Νέο — ενισχυμένο company setup |
| `src/components/onboarding/OnboardingProfile.tsx` | Νέο — avatar + department |
| `src/components/onboarding/OnboardingTeamInvite.tsx` | Νέο — multi-email invite |
| `src/components/onboarding/OnboardingFirstClient.tsx` | Νέο — quick client creation |
| `src/components/onboarding/OnboardingCompanyDocs.tsx` | Νέο — drag & drop docs → kb_raw_sources |
| `src/components/onboarding/OnboardingAISetup.tsx` | Νέο — auto-compile + progress |
| `src/components/onboarding/OnboardingReady.tsx` | Νέο — summary + quick links |

