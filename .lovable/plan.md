

# Onboarding 2.0 · AI-Boosted Setup + Learn-as-you-Go

## Στόχος
Να μετατραπεί το onboarding σε **AI-driven**, χαμηλής τριβής εμπειρία, και να προστεθεί ένα **persistent in-app coaching layer** που εξηγεί features σε κάθε χρήστη όταν επισκέπτεται μια σελίδα/ενέργεια για πρώτη φορά — προσαρμοσμένο στο role/access του.

---

## Μέρος 1 · AI Boost στο Onboarding Wizard (11 βήματα)

Ενίσχυση **όλων** των βημάτων με AI assist χωρίς να αλλάζει η ροή:

### 1.1 Auto-discovery εταιρείας (`OnboardingCompany`)
- Νέο edge function `enrich-company-from-domain` (paralleling υπάρχοντος `enrich-client`).
- Όταν `isPersonalEmail === false`, αυτόματα τραβάει: legal name, industry, company size, logo από το domain (web search + Lovable AI tool-calling).
- **"✨ Συμπλήρωσε αυτόματα από το web"** button — γεμίζει τα πεδία (name, industry, size, logo URL) με AI-fetched values. User κάνει review πριν δημιουργία.
- Πέφτει σε rate limit log (`company_enrichment_log`).

### 1.2 Smart Workspace Preset (`OnboardingWorkspacePreset`)
- AI πρόταση preset βάσει του `industry` + `domain` που ήδη ξέρουμε.
- Κορυφαίο card εμφανίζει "**🎯 Συνιστάται για εσάς**" στο πιθανότερο preset.
- Ένα "Why this?" link που ανοίγει AI explanation.

### 1.3 AI Profile assist (`OnboardingProfile`)
- Από email + LinkedIn-style heuristics, AI προτείνει `job_title`.
- Mini "Συμπλήρωσε με AI" button (όπως το ai-fill standard).

### 1.4 AI First Client (`OnboardingFirstClient`)
- Ήδη υπάρχει `enrich-client`. Wire-up στο onboarding step: ο χρήστης πληκτρολογεί όνομα ή URL → AI γεμίζει sector, contact email, logo, description.

### 1.5 AI Docs upload (`OnboardingCompanyDocs`)
- Μετά το upload, AI πρόταση: «Βρήκα 4 πιθανά SOPs, 2 brand guidelines, 1 contract template». Κατηγοριοποίηση προεπιλεγμένη πριν compilation.

### 1.6 Personalized "Ready" screen (`OnboardingReady`)
- AI generated checklist «Tα επόμενά σου 5 βήματα» βάσει role/preset/uploaded docs.
- Π.χ. για **Marketing Agency + Owner**: «Καλεσε ομάδα → Στήσε πρώτο project → Σύνδεσε email → Δες AI Suggestions στη Library».

---

## Μέρος 2 · Learn-as-you-Go (In-app Coaching System)

Κεντρική νέα υποδομή coaching tooltips/popovers/tours που εμφανίζονται **την πρώτη φορά** που ένας χρήστης φτάνει σε σελίδα ή κάνει action.

### 2.1 Schema (1 migration)
```text
user_coaching_state:
  user_id uuid (FK profiles)
  feature_key text (π.χ. 'page.knowledge', 'action.create_project', 'tab.kb_review')
  seen_at timestamptz
  dismissed boolean default false
  PRIMARY KEY (user_id, feature_key)
```
Idempotent insert με `ON CONFLICT DO NOTHING`. RLS: μόνο own rows.

### 2.2 Coaching Registry (`src/lib/coaching/registry.ts`)
Single source of truth — ένα array από:
```text
{
  key: 'page.knowledge',
  type: 'tour' | 'popover' | 'tooltip' | 'banner',
  trigger: 'route' | 'element-mount' | 'manual',
  routeMatch?: '/knowledge',
  elementSelector?: '[data-coach="kb-new"]',
  title, body (markdown), 
  steps?: [{ selector, title, body }],   // για tours
  requiredRoles?: ['owner','admin','member'],
  requiredPermissions?: [...],
  priority: number,
}
```

Παραδείγματα entries (initial seed):
- `page.work` — Tour 4 βημάτων (Today, Calendar, Quick Notes, Pending Approvals).
- `page.knowledge` — Tour Library/Categories/AI Compose/Review.
- `page.work.projects` — popover "Δημιούργησε project ή χρησιμοποίησε template".
- `page.financials` — banner για admins, hidden για members χωρίς finance permission.
- `action.create_project` — tooltip πάνω από το dialog την πρώτη φορά.
- `feature.ai_compose` — popover στο πρώτο click του "AI Σύνταξη".

### 2.3 `<CoachingProvider>` + `useCoach()`
- Mounted στο `AppLayout`.
- Listens σε route changes & registers MutationObserver για element-based triggers.
- Φιλτράρει entries με βάση `companyRole` + permissions από `useRBAC`.
- Δείχνει 1 coach τη φορά (queue), αποθηκεύει `seen_at` στο πάτημα "Got it" / dismiss.
- Persistence: optimistic local cache + server sync (`user_coaching_state`).

### 2.4 UI components
- `<CoachPopover>` — anchored popover με σπινάκι, 1-2 CTAs.
- `<CoachTour>` — multi-step spotlight overlay (cutout στο target element).
- `<CoachBanner>` — top-of-page dismissible banner για page-level intros.
- Όλα με `aria-live`, ESC dismiss, "Don't show again" link.

### 2.5 Integration helpers
- Στους κρίσιμους buttons προσθέτουμε `data-coach="..."` attributes (μη παρεμβατικό).
- Σε pages: ένα `useEffect(() => triggerCoach('page.X'), [])`.
- Δεν αγγίζουμε business logic.

### 2.6 AI-Generated Coaching (Bonus)
- Νέο edge function `coach-ai-suggest` που, βάσει της τρέχουσας σελίδας + role + recent actions του χρήστη, παράγει on-demand suggestion ("Φαίνεται ότι κοιτάς invoices — θες να σε καθοδηγήσω στο πώς να στείλεις πρώτο τιμολόγιο;").
- Trigger: button "💡 AI Coach" στο TopBar (ή reused QuickChatBar action).
- Καλείται με Lovable AI streaming, εμφανίζει response σε mini panel.

---

## Μέρος 3 · Setup Guide V2 (TopBar Popover)

Επέκταση του υπάρχοντος `SetupGuide.tsx`:

- **Role-aware steps**: ένας owner βλέπει "Καλέστε ομάδα", ένας member όχι.
- **Per-step AI hint**: κάθε ημιτελές βήμα έχει εικονίδιο 💡 → tooltip με 1-line AI εξήγηση γιατί είναι σημαντικό για τον συγκεκριμένο user.
- **"Δείξε μου"**: button δίπλα σε κάθε βήμα που ξεκινάει το αντίστοιχο coaching tour αντί για απλό navigation.
- **Restart tours**: section στο popover footer "Επανέλαβε intro tours" (clears `user_coaching_state` selectively).
- **First-time progress bar**: confetti animation + AI message όταν φτάσει το 100%.

---

## Μέρος 4 · Settings → Help & Tutorials Tab

Νέο tab στο `/settings`:
- Λίστα όλων των tours/coaching entries που έχει δει ο χρήστης.
- "Restart" button ανά tour.
- Toggle "Disable in-app coaching".
- Link σε docs/changelog.

---

## Τεχνικές αλλαγές (συνοπτικά)

**Migrations:**
- `user_coaching_state` table + RLS.
- Optional: `companies.workspace_type` ήδη υπάρχει.
- Optional: `company_enrichment_log` table (mirror του `client_enrichment_log`).

**Edge Functions (νέες):**
- `enrich-company-from-domain` — web lookup + AI extraction (logo, industry, size, legal name).
- `coach-ai-suggest` — context-aware coaching messages.
- `onboarding-personalize` — generates "next 5 steps" για το `OnboardingReady`.

**Hooks (νέοι):**
- `useCoach()` — trigger/dismiss/check-seen.
- `useCoachingRegistry()` — filtered entries για current user.
- `useEnrichCompany()` — wraps νέο edge function.

**Components (νέοι):**
- `src/components/coaching/CoachingProvider.tsx`
- `src/components/coaching/CoachPopover.tsx`
- `src/components/coaching/CoachTour.tsx`
- `src/components/coaching/CoachBanner.tsx`
- `src/lib/coaching/registry.ts` — initial 20–25 entries.

**Files edited:**
- `OnboardingCompany.tsx` — AI auto-fill button.
- `OnboardingWorkspacePreset.tsx` — AI recommended highlight.
- `OnboardingProfile.tsx` — AI job_title suggestion.
- `OnboardingFirstClient.tsx` — wire-up `enrich-client`.
- `OnboardingCompanyDocs.tsx` — AI categorization preview.
- `OnboardingReady.tsx` — AI personalized next steps.
- `SetupGuide.tsx` — V2 (role-aware + "Δείξε μου" + restart).
- `AppLayout.tsx` — mount `<CoachingProvider>`.
- Σε ~10 key pages: προσθήκη `data-coach` attrs + `useEffect` triggers.
- `Settings.tsx` — νέο tab "Βοήθεια & Tutorials".

---

## Σειρά υλοποίησης

1. **Foundation**: Migration `user_coaching_state` + Coaching registry + Provider + 3 UI components (Popover/Tour/Banner).
2. **Initial coaching content**: Tour entries για top-10 σελίδες (Work, Knowledge, Clients, Projects, Financials, HR, Files, Calendar, Inbox, Settings) + role filtering.
3. **SetupGuide V2**: role-aware + "Δείξε μου" launches tours + AI hint tooltips.
4. **Onboarding AI Boost**: `enrich-company-from-domain` + AI buttons σε Company/Profile/FirstClient/Docs.
5. **Personalized Ready screen**: `onboarding-personalize` edge function + AI checklist.
6. **AI Coach panel** (bonus): `coach-ai-suggest` + TopBar trigger.
7. **Settings tab**: tutorials management.

