# Αναδιοργάνωση Σελίδας Ρυθμίσεων

## Πρόβλημα
Η `/settings` έχει 13 cards στη σειρά (Προφίλ, Εμφάνιση, Ειδοποιήσεις, Ασφάλεια, Project Categories, Project Folder Templates, Email, Ωράριο, Help, Bulk Import, Data Management, AI Usage, AI Memory, Client Portal). Ο χρήστης χάνεται και κάνει πολύ scroll. Παράλληλα υπάρχουν και 3 ξεχωριστές σελίδες (`/settings/organization`, `/settings/billing`, `/settings/security`) που δεν είναι ανακαλύψιμες από εδώ.

## Πρόταση: Two-pane Settings Hub

Ενοποιημένη σελίδα `/settings/*` με αριστερή κάθετη πλοήγηση (sticky) και δεξί panel που εμφανίζει την ενεργή ενότητα. Δεν χάνεται τίποτα από scroll, ο χρήστης βλέπει αμέσως όλες τις διαθέσιμες ομάδες, και κάθε section φορτώνει μόνο το δικό του περιεχόμενο.

```text
┌─────────────────────────────────────────────────────┐
│ Ρυθμίσεις                                           │
├──────────────────┬──────────────────────────────────┤
│ ΛΟΓΑΡΙΑΣΜΟΣ      │                                  │
│ • Προφίλ      ●  │   [Active section content]       │
│ • Ασφάλεια       │                                  │
│ • Ειδοποιήσεις   │                                  │
│ • Ωράριο         │                                  │
│                  │                                  │
│ ΠΡΟΣΩΠΟΠΟΙΗΣΗ    │                                  │
│ • Εμφάνιση       │                                  │
│ • Sidebar        │                                  │
│ • AI Μνήμη       │                                  │
│                  │                                  │
│ ΕΤΑΙΡΕΙΑ (Admin) │                                  │
│ • Γενικά         │                                  │
│ • Μέλη & Ρόλοι   │                                  │
│ • Ασφάλεια Org   │                                  │
│ • Activity Log   │                                  │
│ • Billing        │                                  │
│                  │                                  │
│ ΔΕΔΟΜΕΝΑ (Admin) │                                  │
│ • Categories     │                                  │
│ • Folder Tmpls   │                                  │
│ • Email/Inbox    │                                  │
│ • Import         │                                  │
│ • Διαγραφή       │                                  │
│ • AI Usage       │                                  │
│ • Client Portal  │                                  │
│                  │                                  │
│ ΒΟΗΘΕΙΑ          │                                  │
│ • Tutorials      │                                  │
└──────────────────┴──────────────────────────────────┘
```

## Ομαδοποίηση (5 sections)

**1. Λογαριασμός** (κάθε χρήστης)
- Προφίλ (όνομα, email, status, αλλαγή κωδικού inline)
- Ειδοποιήσεις (email/tasks/projects switches)
- Ωράριο εργασίας

**2. Προσωποποίηση** (κάθε χρήστης)
- Εμφάνιση (theme light/dark/system)
- Sidebar (auto/manual organization)
- AI Μνήμη (διαχείριση memories)

**3. Εταιρεία** (admin/owner only) — ενσωματώνει το `/settings/organization` και `/settings/billing`
- Γενικά (στοιχεία εταιρείας — από `OrgGeneralTab`)
- Μέλη & Ρόλοι (users table + invitations + join requests)
- Ασφάλεια Εταιρείας (`OrgSecurityTab`)
- Activity Log (`OrgActivityTab`)
- Billing (πλάνο, χρήση)

**4. Δεδομένα & Ενσωματώσεις** (admin)
- Project Categories
- Project Folder Templates
- Email / Inbox setup
- Bulk Import
- Διαχείριση Δεδομένων (mass delete)
- AI Usage
- Client Portal Users

**5. Βοήθεια**
- Tutorials & Help

## Τεχνική Υλοποίηση

**Νέο layout component:** `src/pages/Settings.tsx` ξαναγράφεται ως shell με:
- `useSearchParams` για `?section=profile` (deep-linking, browser back/forward)
- Αριστερό sidebar (`w-64`, sticky top, scrollable αν ξεπεράσει το viewport)
- Δεξί panel με `max-w-3xl`, μόνο το ενεργό section renders
- Mobile (<768px): collapse σε `Select` dropdown στην κορυφή αντί για sidebar

**Section registry** (array of `{ id, label, icon, group, adminOnly?, component }`) ώστε να φιλτράρεται εύκολα ανά role και να προστίθενται νέα sections.

**Routing consolidation:**
- `/settings/organization`, `/settings/billing`, `/settings/security` παραμένουν για backward compatibility αλλά κάνουν redirect στο `/settings?section=org-general` κ.λπ.
- Όλο το περιεχόμενο των `OrganizationSettings.tsx` και `BillingSettings.tsx` σπάει σε μικρότερα section components που καταναλώνονται από τη νέα Settings shell.

**Αρχεία που δημιουργούνται:**
- `src/components/settings/SettingsLayout.tsx` — two-pane shell + nav
- `src/components/settings/sections/AccountProfileSection.tsx`
- `src/components/settings/sections/NotificationsSection.tsx`
- `src/components/settings/sections/AppearanceSection.tsx`
- `src/components/settings/sections/SidebarPrefsSection.tsx`
- `src/components/settings/sections/OrgMembersSection.tsx` (extracted από OrganizationSettings)
- `src/components/settings/sections/OrgBillingSection.tsx` (από BillingSettings)
- `src/components/settings/sectionsRegistry.ts`

**Αρχεία που τροποποιούνται:**
- `src/pages/Settings.tsx` — γίνεται shell που καταναλώνει το registry
- `src/pages/OrganizationSettings.tsx`, `BillingSettings.tsx`, `SecuritySettings.tsx` — γίνονται thin redirects
- `src/App.tsx` — διατηρεί τα παλιά routes ως redirects

## Τι πετυχαίνουμε
- Καθόλου scroll για να βρεις μια ρύθμιση — αριστερό nav δείχνει τα πάντα
- Λογική ομαδοποίηση: τι αφορά εμένα vs την εταιρεία vs τα δεδομένα
- Deep-linkable (`/settings?section=billing`)
- Ενοποίηση των 4 σήμερα-σκόρπιων settings σελίδων σε ένα μέρος
- Mobile-friendly (dropdown nav)
- Επεκτάσιμο: νέες ρυθμίσεις = προσθήκη μιας εγγραφής στο registry
