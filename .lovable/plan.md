

# Sidebar Refinements — Πλάνο

## Αλλαγές

### AppSidebar.tsx

**1. Clients** — Αφαίρεση `Tenders` entry + αφαίρεση `/tenders` από routePrefixes

**2. Marketing** — Αφαίρεση `Blueprints` & `Reports` entries, αφαίρεση `/blueprints` από routePrefixes. Μένουν: Campaigns, Media Planning

**3. Creative** — Άδειασμα items (αφαίρεση Briefs, Campaigns, Files & Assets). Η κατηγορία **παραμένει** visible στο rail. Files & Assets γίνεται standalone icon στο rail (`/files`)

**4. Development** — Άδειασμα items (αφαίρεση Projects, Backlog, Tenders). Η κατηγορία **παραμένει** visible στο rail. Workflows γίνεται standalone icon στο rail (`/workflows`)

**5. Operations** — Fix links:
- Capacity: `/operations/capacity` (αντί `/operations?tab=capacity`)
- Leaderboard: `/leaderboard` (αντί `/operations?tab=leaderboard`)

**6. Settings** — Δημιουργία νέων σελίδων:
- `src/pages/BillingSettings.tsx` — Subscription plan, usage, payment placeholder
- `src/pages/SecuritySettings.tsx` — Password, 2FA, sessions placeholder
- Routes στο `App.tsx`: `/settings/billing`, `/settings/security`

**7. Rail standalone icons** — Προσθήκη Files & Assets (`FileArchive`, `/files`) και Workflows (`GitBranch`, `/workflows`) στο icon rail, δίπλα στο My Work

**8. detectCategory** — Update:
- `/files` → `null` (standalone)
- `/workflows` → `null` (standalone)
- Αφαίρεση `/tenders` line

**9. routePrefixes cleanup**:
- `work`: αφαίρεση `/files`
- `clients`: αφαίρεση `/tenders`
- `marketing`: αφαίρεση `/blueprints`
- `development`: αφαίρεση `/backlog`, `/workflows`
- `creative`: αφαίρεση `/briefs`

## Αρχεία

| Αρχείο | Ενέργεια |
|--------|----------|
| `src/components/layout/AppSidebar.tsx` | Κύριες αλλαγές (nav items, rail icons, detect, routePrefixes) |
| `src/pages/BillingSettings.tsx` | Νέα σελίδα |
| `src/pages/SecuritySettings.tsx` | Νέα σελίδα |
| `src/App.tsx` | Routes billing/security, αφαίρεση tenders redirect |

Creative & Development παραμένουν ως κατηγορίες — απλά χωρίς sub-items προς το παρόν.

