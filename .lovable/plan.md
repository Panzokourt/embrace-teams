# Navigation Refactor -- Domain-Driven SaaS Architecture

## Σύνοψη

Πλήρης αναδιάρθρωση του sidebar από 11 κατηγορίες σε 8 business domains, με δημιουργία νέων placeholder σελίδων για τα items που δεν υπάρχουν ακόμα.

---

## Νέο Icon Rail (8 domains)


| #   | Domain       | Icon            | Label        |
| --- | ------------ | --------------- | ------------ |
| 1   | overview     | LayoutDashboard | Overview     |
| 2   | work         | Briefcase       | Work         |
| 3   | clients      | Building2       | Clients      |
| 4   | revenue      | DollarSign      | Revenue      |
| 5   | operations   | Users           | Operations   |
| 6   | intelligence | BarChart3       | Intelligence |
| 7   | governance   | ShieldCheck     | Governance   |
| 8   | settings     | Settings        | Settings     |


---

## Sub-links ανά Domain

### 1. Overview

- Company Dashboard `/` (LayoutDashboard)
- My Work `/my-work` (LayoutList)

### 2. Work

- My Work `/my-work` (LayoutList)
- Projects `/work?tab=projects` (FolderKanban) + ProjectTree
- Tasks `/work?tab=tasks` (CheckSquare)
- Calendar `/calendar` (CalendarDays)
- Files `/files` (FileArchive)
- Blueprints `/blueprints` (FileStack)

### 3. Clients

- All Clients `/clients` (Building2)
- Contacts `/contacts` (BookUser)

### 4. Revenue

- Dashboard `/financials?tab=dashboard` (LayoutDashboard)
- Services `/financials?tab=services` (FileText)
- Contracts `/financials?tab=contracts` (FileText)
- Invoices `/financials?tab=invoices` (FileText)
- Expenses `/financials?tab=expenses` (DollarSign)
- Profitability `/financials?tab=reports` (BarChart3)

### 5. Operations

- Team & HR `/hr` (UserCog)
- Timesheets `/timesheets` (Timer)
- Knowledge Base `/knowledge` (BookOpen)
- Playbook `/knowledge/playbook` (FileText)
- Templates & SOPs `/knowledge/templates` (FileStack)
- Review Queue `/knowledge/reviews` (CheckSquare)

### 6. Intelligence

- Reports Hub `/reports` (BarChart3)
- Leaderboard `/leaderboard` (Trophy)
- Secretary AI `/secretary` (Zap)

### 7. Governance

- Dashboard `/governance` (ShieldCheck)
- Digital Assets `/governance/assets` (Globe)
- Access Control `/governance/access` (UserCog)
- Vault `/governance/vault` (FileArchive)
- Compliance `/governance/compliance` (FileText)

### 8. Settings

- General `/settings` (Settings)
- Organization `/settings/organization` (Building2)

---

## Route Detection Logic

```text
/work, /projects, /tasks, /calendar, /files, /blueprints  -> work
/clients, /contacts                                         -> clients
/financials                                                 -> revenue
/hr, /timesheets, /knowledge                                -> operations
/reports, /leaderboard, /secretary                          -> intelligence
/governance                                                 -> governance
/settings                                                   -> settings
/my-work, /                                                 -> overview
/inbox, /chat                                               -> overview (fallback)
```

---

## Τι αλλάζει vs τώρα


| Αλλαγή                      | Λεπτομέρειες                                            |
| --------------------------- | ------------------------------------------------------- |
| Calendar μετακινείται       | Από ξεχωριστή κατηγορία -> sub-link στο **Work**        |
| Files μετακινείται          | Από ξεχωριστή κατηγορία -> sub-link στο **Work**        |
| Blueprints μετακινείται     | Από "Διαχείριση" -> sub-link στο **Work**               |
| Inbox/Chat αφαιρούνται      | Δεν εμφανίζονται στο sidebar (TopBar/Secretary access)  |
| Knowledge Base μετακινείται | Από ξεχωριστή κατηγορία -> sub-links στο **Operations** |
| Timesheets μετακινείται     | Από "Χρόνος" -> sub-link στο **Operations**             |
| HR μετακινείται             | Από "Ομάδα" -> sub-link στο **Operations**              |
| Contacts μετακινείται       | Από "Ομάδα" -> sub-link στο **Clients**                 |
| Reports μετακινείται        | Από "Οικονομικά" -> **Intelligence** domain             |
| Leaderboard μετακινείται    | Από "Ομάδα" -> **Intelligence** domain                  |
| Secretary μετακινείται      | Παραμένει bottom button + Intelligence sub-link         |
| Revenue sub-links           | Κάθε tab του Financials γίνεται ξεχωριστό sub-link      |
| Clients γίνεται domain      | Ανεξάρτητο domain αντί sub-item στο "Διαχείριση"        |


---

## Αρχεία που τροποποιούνται

### `src/components/layout/AppSidebar.tsx`

- Νέο `CategoryId` type: 8 domains
- Νέο `categories` array: 8 entries με σωστά icons/labels/routePrefixes
- Νέο `categoryNavItems` mapping: πλήρες ανά domain
- Νέο `detectCategory()`: ενημερωμένη route detection
- Work category: SidebarNavGroup με Projects + ProjectTree + Tasks, ακολουθούμενο από Calendar, Files, Blueprints links
- Revenue links: `/financials?tab=X` format
- Operations: HR + Timesheets + Knowledge sub-links
- Inbox/Chat: αφαιρούνται από sidebar categories

### `src/App.tsx`

Δεν αλλάζουν routes -- μόνο η οργάνωση στο sidebar. Τα υπάρχοντα routes (`/inbox`, `/chat`, κλπ) παραμένουν λειτουργικά.

---

**Σύμφωνα με το αίτημα "Πρόσθεσε και τις σελίδες που δεν έχουμε τώρα"**, θα δημιουργηθούν placeholder pages για:


| Νέα Σελίδα             | Route                           | Domain                  |
| ---------------------- | ------------------------------- | ----------------------- |
| Campaigns              | `/campaigns`                    | Work                    |
| Backlog                | `/backlog`                      | Work                    |
| ClientStrategy         | `/clients/:id/strategy`         | Clients (client-scoped) |
| Pricing                | `/financials?tab=pricing`       | Revenue (νέο tab)       |
| Capacity               | `/operations/capacity`          | Operations              |
| ResourcePlanning       | `/operations/resource-planning` | Operations              |
| Performance            | `/intelligence/performance`     | Intelligence            |
| CrossClientInsights    | `/intelligence/insights`        | Intelligence            |
| Benchmarks             | `/intelligence/benchmarks`      | Intelligence            |
| Forecasting            | `/intelligence/forecasting`     | Intelligence            |
| MediaPlanning          | `/intelligence/media-planning`  | Intelligence            |
| AIInsights             | `/intelligence/ai-insights`     | Intelligence            |
| GovernanceIntegrations | `/governance/integrations`      | Governance              |
| GovernanceAuditLog     | `/governance/audit-log`         | Governance              |
| GovernanceOwnershipMap | `/governance/ownership-map`     | Governance              |
| RolesPermissions       | `/settings/roles`               | Settings                |
| BillingSettings        | `/settings/billing`             | Settings                |
| APIKeys                | `/settings/api-keys`            | Settings                |
| Webhooks               | `/settings/webhooks`            | Settings                |
| BrandingSettings       | `/settings/branding`            | Settings                |
| FeatureFlags           | `/settings/feature-flags`       | Settings                |


Κάθε placeholder θα έχει τίτλο, description και "Coming Soon" badge.

---

## Συνολική λίστα αρχείων

### Τροποποιούμενα (2)

1. `src/components/layout/AppSidebar.tsx` -- Πλήρης refactor navigation
2. `src/App.tsx` -- Νέα routes για placeholder pages

### Νέα placeholder pages (~21)

Όλα τα παραπάνω νέα pages ως minimal components με consistent layout.