
# Redesign Client Detail -- Modular Card-Based Dashboard

## Σύνοψη

Πλήρης αναδιάρθρωση της σελίδας `/clients/:id` σε ένα καθαρό, card-based "Client Overview" dashboard. Αντικατάσταση του tab-based layout με visual cards σε 12-column grid.

---

## Database Migration

Προσθήκη 3 JSONB columns στον πίνακα `clients` για τα νέα δεδομένα:

```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS social_accounts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ad_accounts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS strategy jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS additional_websites jsonb DEFAULT '[]'::jsonb;
```

JSONB structure:
- `social_accounts`: `[{platform, account_name, url}]`
- `ad_accounts`: `[{platform, account_name, url, ownership, has_risk}]`
- `strategy`: `{goals: [], pillars: [], positioning: ""}`
- `additional_websites`: `[{url, label}]`
- `status`: `"active" | "proposal" | "risk"`

---

## Layout Structure

```text
+------------------------------------------------------------------+
| SMART HEADER (full width)                                        |
| [Logo] Client Name  [Sector] [Status]   Revenue | Margin | Edit |
+------------------------------------------------------------------+
|                                                                  |
| LEFT COLUMN (col-span-7)        | RIGHT COLUMN (col-span-5)     |
|                                  |                                |
| [Websites Card]                  | [Projects Card - top 3]       |
| [Social & Channels Card]        | [Tasks Snapshot Card]         |
| [Ad & Tracking Accounts Card]   | [Briefs Card]                |
| [Strategy Card]                  | [Internal Team Card]          |
|                                  | [Client Contacts Card]        |
+------------------------------------------------------------------+
| FILES & DOCUMENTS (full width, internal tabs)                    |
+------------------------------------------------------------------+
```

---

## Νέα Αρχεία

### Sub-components (modular cards)

Δημιουργία φακέλου `src/components/clients/detail/` με:

| Component | Περιγραφή |
|-----------|-----------|
| `ClientSmartHeader.tsx` | Logo, name, sector/status badges, revenue KPIs, edit button, Quick Add dropdown |
| `ClientWebsitesCard.tsx` | Primary + additional websites, external link + copy actions |
| `ClientSocialCard.tsx` | Social platforms with icons, account names, external links |
| `ClientAdAccountsCard.tsx` | Ad/tracking accounts with platform icons, ownership badge, risk dot |
| `ClientStrategyCard.tsx` | Goals (bullets), pillars (chips), positioning summary |
| `ClientProjectsCard.tsx` | Top 3 active projects with progress bars, "View all" button |
| `ClientTasksSnapshot.tsx` | Overdue/this week/open task counts with icons |
| `ClientBriefsCard.tsx` | Latest 3 briefs with status badges, "New Brief" button |
| `ClientTeamCard.tsx` | Internal team members (avatar, name, role) in 2-col grid |
| `ClientContactsCard.tsx` | Client contacts with name, role, email, phone, decision maker badge |
| `ClientFilesCard.tsx` | Full-width files card with internal tabs (Contracts/Proposals/Presentations/Reports/Creative) |

### Updated Files

| File | Changes |
|------|---------|
| `src/pages/ClientDetail.tsx` | Complete rewrite: fetch all data, compose card layout |
| `src/components/clients/ClientForm.tsx` | Add fields for status, social_accounts, ad_accounts, strategy, additional_websites |

---

## Data Fetching Strategy

Ολα τα data θα γίνονται fetch στο `ClientDetail.tsx` και θα περνάνε ως props στα cards:

- `clients` table: client info + new JSONB fields
- `projects` table: filtered by `client_id` (top 3 active)
- `tasks` table: via project_ids, count overdue/due this week/open
- `invoices` table: for revenue KPIs
- `contacts` table: filtered by `client_id`
- `profiles` table: team members linked through projects
- `contracts` table: via project_ids

---

## Design Tokens

Ακολουθεί το υπάρχον design system:
- Card: `rounded-2xl border border-border/50 bg-card shadow-soft`
- Badges: existing `Badge` component variants
- Status colors: Active = green, Proposal = blue, Risk = destructive
- Ownership badges: Agency = `bg-blue-100 text-blue-700`, Client = `bg-gray-100 text-gray-600`
- Risk dot: `w-2 h-2 rounded-full bg-red-500`
- Max 3 items visible per card + "View All" link
- Platform icons: Lucide icons where available (Globe, Facebook via custom SVG or text labels)

---

## Τεχνικά Highlights

1. **No heavy tabs** -- all cards visible on single scroll
2. **12-column grid** using Tailwind: `grid-cols-12`, left `col-span-7`, right `col-span-5`
3. **Quick Add dropdown** using existing `DropdownMenu` component
4. **Progress bars** using existing `Progress` component
5. **Internal tabs** in Files card using existing `Tabs` component (lightweight, inside card)
6. **Collapsible** sections for long lists using existing `Collapsible` component
