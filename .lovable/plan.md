# Full Product Rationalization Audit

## A. Current Inventory

### OVERVIEW (Icon Rail Category)


| Page/Feature         | Route                   | Purpose                                                           | Status                           |
| -------------------- | ----------------------- | ----------------------------------------------------------------- | -------------------------------- |
| Executive Dashboard  | `/`                     | KPI overview, stats, charts, customizable widgets                 | **Core**                         |
| Finance Dashboard    | `/dashboard/finance`    | Finance-focused dashboard template                                | Secondary (variant of Executive) |
| Operations Dashboard | `/dashboard/operations` | Ops-focused dashboard template                                    | Secondary (variant)              |
| Sales Dashboard      | `/dashboard/sales`      | Sales-focused dashboard template                                  | Secondary (variant)              |
| My Work              | `/my-work`              | Personal task queue, attention panel, DnD prioritization, AI chat | **Core**                         |


### WORK


| Page/Feature    | Route                | Purpose                                                                            | Status              |
| --------------- | -------------------- | ---------------------------------------------------------------------------------- | ------------------- |
| Work Hub        | `/work`              | Container routing to Projects or Tasks via `?tab=`                                 | Core (router shell) |
| Projects (list) | `/work?tab=projects` | CRUD, kanban/table/grid views, filters, bulk actions                               | **Core**            |
| Project Detail  | `/projects/:id`      | Tabs: info, tasks, deliverables, financials, team, media plan, creatives, comments | **Core**            |
| Tasks (list)    | `/work?tab=tasks`    | CRUD, kanban/table views, filters                                                  | **Core**            |
| Task Detail     | `/tasks/:id`         | Full task view with comments, time tracking, files                                 | **Core**            |
| Calendar        | `/calendar`          | Full calendar with zoom views, backlog, event types                                | **Core**            |
| Files           | `/files`             | Central file explorer with folders                                                 | Core                |
| Blueprints      | `/blueprints`        | Brief templates + project templates                                                | Secondary           |
| Campaigns       | `/campaigns`         | **Placeholder** — Coming Soon                                                      | Placeholder         |
| Backlog         | `/backlog`           | **Placeholder** — Coming Soon                                                      | Placeholder         |


### CLIENTS


| Page/Feature   | Route           | Purpose                                                                                               | Status   |
| -------------- | --------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| Clients (list) | `/clients`      | CRUD, table with search, pagination                                                                   | **Core** |
| Client Detail  | `/clients/:id`  | Smart header, contacts, projects, tasks, briefs, strategy, social, websites, ad accounts, files, team | **Core** |
| Contacts       | `/contacts`     | Separate contact registry (people, not companies)                                                     | Core     |
| Contact Detail | `/contacts/:id` | Contact profile                                                                                       | Core     |


### COMMUNICATION


| Page/Feature | Route    | Purpose                                     | Status |
| ------------ | -------- | ------------------------------------------- | ------ |
| Chat         | `/chat`  | Real-time messaging, channels, DMs, threads | Core   |
| Inbox        | `/inbox` | Gmail integration, email threads            | Core   |


### REVENUE


| Page/Feature | Route         | Purpose                                                               | Status   |
| ------------ | ------------- | --------------------------------------------------------------------- | -------- |
| Financials   | `/financials` | Tabs: Dashboard, Contracts, Invoices, Expenses, Profitability Reports | **Core** |
| Pricing      | `/pricing`    | Tabs: Services, Packages, Proposals, Costing, Dashboard               | Core     |


### OPERATIONS


| Page/Feature      | Route                           | Purpose                                                    | Status        |
| ----------------- | ------------------------------- | ---------------------------------------------------------- | ------------- |
| HR                | `/hr`                           | Tabs: Staff, Departments, Org Chart, Leaves, Join Requests | **Core**      |
| Employee Profile  | `/hr/employee/:id`              | Individual employee profile/detail                         | Core          |
| Timesheets        | `/timesheets`                   | Time tracking grid/list, attendance, export                | **Core**      |
| Knowledge Base    | `/knowledge`                    | Articles, categories, search                               | Secondary     |
| KB Playbook       | `/knowledge/playbook`           | Company-scoped articles (subset of KB)                     | **Redundant** |
| KB Article        | `/knowledge/articles/:id`       | Single article view                                        | Secondary     |
| KB Templates      | `/knowledge/templates`          | Templates & SOPs                                           | Secondary     |
| KB Reviews        | `/knowledge/reviews`            | Review queue for KB articles                               | Secondary     |
| Capacity          | `/operations/capacity`          | **Placeholder**                                            | Placeholder   |
| Resource Planning | `/operations/resource-planning` | **Placeholder**                                            | Placeholder   |


### INTELLIGENCE


| Page/Feature          | Route                          | Purpose                                                   | Status        |
| --------------------- | ------------------------------ | --------------------------------------------------------- | ------------- |
| Reports               | `/reports`                     | Tabs: Overview, Financial, Projects, Tasks, Clients, Team | **Core**      |
| Brain                 | `/brain`                       | AI analysis, insights, deep dives, action creation        | Secondary     |
| Leaderboard           | `/leaderboard`                 | XP gamification ranking                                   | Optional      |
| Secretary             | `/secretary`                   | Full-page AI chat (also in right panel)                   | **Redundant** |
| Performance           | `/intelligence/performance`    | **Placeholder**                                           | Placeholder   |
| Cross-client Insights | `/intelligence/insights`       | **Placeholder**                                           | Placeholder   |
| Benchmarks            | `/intelligence/benchmarks`     | **Placeholder**                                           | Placeholder   |
| Forecasting           | `/intelligence/forecasting`    | **Placeholder**                                           | Placeholder   |
| Media Planning        | `/intelligence/media-planning` | **Placeholder**                                           | Placeholder   |


### GOVERNANCE


| Page/Feature         | Route                       | Purpose                                                            | Status        |
| -------------------- | --------------------------- | ------------------------------------------------------------------ | ------------- |
| Governance Dashboard | `/governance`               | KPIs, high-risk assets overview                                    | Secondary     |
| Digital Assets       | `/governance/assets`        | Asset inventory                                                    | Secondary     |
| Asset Detail         | `/governance/assets/:id`    | Single asset detail                                                | Secondary     |
| Access Control       | `/governance/access`        | Access grants + review queue                                       | Secondary     |
| Vault                | `/governance/vault`         | Credential vault references                                        | Secondary     |
| Compliance           | `/governance/compliance`    | Audit log + checklists                                             | Secondary     |
| Integrations         | `/governance/integrations`  | **Placeholder**                                                    | Placeholder   |
| Audit Log (Gov)      | `/governance/audit-log`     | **Placeholder** (duplicate — Compliance already has audit log tab) | **Redundant** |
| Ownership Map        | `/governance/ownership-map` | **Placeholder**                                                    | Placeholder   |


### SETTINGS


| Page/Feature          | Route                     | Purpose                                                                      | Status      |
| --------------------- | ------------------------- | ---------------------------------------------------------------------------- | ----------- |
| Settings (Personal)   | `/settings`               | Profile, appearance, notifications, work schedule, email, project categories | Core        |
| Organization Settings | `/settings/organization`  | Company general, members, security, activity log                             | Core        |
| Roles & Permissions   | `/settings/roles`         | **Placeholder**                                                              | Placeholder |
| Billing               | `/settings/billing`       | **Placeholder**                                                              | Placeholder |
| API Keys              | `/settings/api-keys`      | **Placeholder**                                                              | Placeholder |
| Webhooks              | `/settings/webhooks`      | **Placeholder**                                                              | Placeholder |
| Branding              | `/settings/branding`      | **Placeholder**                                                              | Placeholder |
| Feature Flags         | `/settings/feature-flags` | **Placeholder**                                                              | Placeholder |


### OTHER


| Page/Feature            | Route          | Purpose                                      | Status          |
| ----------------------- | -------------- | -------------------------------------------- | --------------- |
| Right Panel (Secretary) | Docked panel   | AI assistant + activity + notifications tabs | Core UI element |
| Work Mode / Focus       | TopBar trigger | Focus overlay for distraction-free work      | Optional        |
| XP Badge                | TopBar         | Gamification XP display                      | Optional        |
| Company Switcher        | TopBar         | Multi-company switching                      | Core            |
| Chat Floating Bubbles   | Global overlay | Floating chat windows                        | Core            |


---

## B. Duplicate & Redundancy Findings


| Item A                                           | Item B                                                             | Overlap Type                                                                    | Severity   | Recommendation                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| &nbsp;                                           | &nbsp;                                                             | &nbsp;                                                                          | &nbsp;     | &nbsp;                                                                                                                                                                 |
| **Governance Audit Log** `/governance/audit-log` | **Governance Compliance** `/governance/compliance` (Audit Log tab) | Same concept — audit log — exists as both a placeholder page and a real tab     | **High**   | **REMOVE** placeholder page                                                                                                                                            |
| **KB Playbook** `/knowledge/playbook`            | **Knowledge Base** `/knowledge`                                    | Playbook is a category-filtered subset of the same articles                     | **High**   | **MERGE** into Knowledge with a "Playbook" filter/view                                                                                                                 |
| **Reports Financial tab**                        | **Financials Dashboard** + **Financials Profitability tab**        | Financial KPIs, revenue charts, client revenue appear in Reports AND Financials | **Medium** | Keep both but **clarify roles**: Financials = operational (CRUD invoices/expenses), Reports = read-only analytics                                                      |
| **Dashboard** stat cards                         | **Reports Overview**                                               | Revenue, projects, tasks, win rate metrics overlap                              | **Medium** | Acceptable — Dashboard is real-time executive view, Reports is historical analysis                                                                                     |
| **OrganizationSettings Members tab**             | **HR Staff tab**                                                   | Both show company users with role management                                    | **Medium** | **Differentiate**: Org Settings Members = role/access management. HR Staff = employee profiles, departments, org structure. Remove role editing from HR if duplicated. |
| **Settings Company section** (admin card)        | **Organization Settings General tab**                              | Both allow editing company name/domain                                          | **High**   | **REMOVE** the inline company card from Settings. Organization Settings is the canonical place.                                                                        |
| **Backlog** page (placeholder)                   | **Calendar Backlog** panel                                         | Naming collision, different things                                              | **Low**    | Remove placeholder Backlog page — Calendar backlog is the real feature                                                                                                 |
| **Blueprints** (brief forms + project templates) | **Knowledge Templates** (SOPs, checklists)                         | Both manage "templates" but different types                                     | **Low**    | Keep separate but rename for clarity                                                                                                                                   |
| **Leaderboard** (full page)                      | **XP Badge** (TopBar)                                              | Gamification split across nav + topbar                                          | **Low**    | OK as is — badge is summary, page is detail                                                                                                                            |
| **Brain** AI insights                            | **Secretary** AI chat                                              | Both are AI features but different purposes                                     | **Low**    | Keep but Secretary page should be removed (panel only)                                                                                                                 |


### Information Duplication

- **Activity Log** appears in: Organization Settings Activity tab, Dashboard Recent Activity widget, Client Detail (history), Project Detail (comments/history). This is acceptable as contextual views but the data source should be unified.
- **Task lists** appear in: My Work, Dashboard (upcoming), Project Detail, Calendar, Reports Tasks tab — 5 places. This is OK for contextual access but fragmented for management.

### Navigation Duplication

- `/projects` → redirects to `/work?tab=projects`. The old route exists as redirect only.
- `/tasks` → redirects to `/work?tab=tasks`. Same.
- `/tenders` → redirects to `/work?tab=projects`. Same.
- `/users` → redirects to `/hr?tab=staff`. Same.
- `/teams`, `/departments`, `/org-chart` → all redirect to HR tabs. Old routes.

---

## C. Removal / Merge / Move Recommendations

### REMOVE (17 items)


| Item                                  | Reason                                        | Priority |
| ------------------------------------- | --------------------------------------------- | -------- |
| &nbsp;                                | &nbsp;                                        | &nbsp;   |
| **Governance Audit Log** page         | Placeholder duplicate of Compliance audit tab | P1       |
| **Governance Ownership Map** page     | Placeholder, no real functionality            | P2       |
| **Governance Integrations** page      | Placeholder, no real functionality            | P2       |
| &nbsp;                                | &nbsp;                                        | &nbsp;   |
| **Backlog** page                      | Placeholder, conflicts with Calendar Backlog  | P2       |
| **Capacity** page                     | Placeholder                                   | P3       |
| **Resource Planning** page            | Placeholder                                   | P3       |
| **Performance** page                  | Placeholder                                   | P3       |
| **Cross-client Insights** page        | Placeholder                                   | P3       |
| **Benchmarks** page                   | Placeholder                                   | P3       |
| **Forecasting** page                  | Placeholder                                   | P3       |
| &nbsp;                                | &nbsp;                                        | &nbsp;   |
| **Roles & Permissions** settings page | Placeholder                                   | P3       |
| **Billing** settings page             | Placeholder                                   | P3       |
| **API Keys** settings page            | Placeholder                                   | P3       |
| **Webhooks** settings page            | Placeholder                                   | P3       |
| **Branding** settings page            | Placeholder                                   | P3       |
| **Feature Flags** settings page       | Placeholder                                   | P3       |


### MERGE (4 items)


| Item                              | Into                                                     | Reason                                         | Priority |
| --------------------------------- | -------------------------------------------------------- | ---------------------------------------------- | -------- |
| **KB Playbook**                   | Knowledge Base (as filter/category view)                 | Identical functionality, just pre-filtered     | P1       |
| **KB Reviews**                    | Knowledge Base (as tab)                                  | Small feature, doesn't justify standalone page | P2       |
| **KB Templates**                  | Knowledge Base (as tab) or Blueprints                    | Templates split across 2 places                | P2       |
| **Settings Company card** (admin) | Remove from Settings, keep only in Organization Settings | Duplicate controls                             | P1       |


### MOVE / DEMOTE


| Item            | Action                                                                 | Reason                                              | Priority |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------------- | -------- |
| **Leaderboard** | Demote: remove from main nav, accessible from XP Badge click or HR tab | Gamification is optional, takes top-level nav space | P2       |
| &nbsp;          | &nbsp;                                                                 | &nbsp;                                              | &nbsp;   |
| **Timesheets**  | Already in Operations nav — correct placement                          | OK                                                  | &nbsp;   |


---

## D. Final Recommended Information Architecture

### Proposed Navigation (9 categories → 7 categories)

```text
ICON RAIL (left)
├── Overview
│   ├── Executive Dashboard (/)
│   ├── My Work (/my-work)
│   └── [Dashboard variants via /dashboard/:templateId]
│
├── Work
│   ├── Projects (/work?tab=projects)
│   ├── Tasks (/work?tab=tasks)  
│   ├── Calendar (/calendar)
│   ├── Files (/files)
│   └── Blueprints (/blueprints)
│
├── Clients
│   ├── All Clients (/clients)
│   └── Contacts (/contacts)
│
├── Communication
│   ├── Chat (/chat)
│   └── Inbox (/inbox)
│
├── Revenue
│   ├── Finance Hub (/financials) [Dashboard, Contracts, Invoices, Expenses, Reports]
│   └── Services & Pricing (/pricing)
│
├── Operations
│   ├── HR (/hr) [Staff, Departments, Org Chart, Leaves, Requests]
│   ├── Timesheets (/timesheets)
│   └── Knowledge Base (/knowledge) [Articles, Playbook, Templates, Reviews as tabs]
│
├── Intelligence
│   ├── Reports (/reports)
│   └── Brain (/brain)
│
├── Governance (keep but trim)
│   ├── Dashboard (/governance)
│   ├── Digital Assets (/governance/assets)
│   ├── Access Control (/governance/access)
│   ├── Vault (/governance/vault)
│   └── Compliance (/governance/compliance)
│
└── Settings
    ├── Personal (/settings)
    └── Organization (/settings/organization)

BOTTOM RAIL (permanent)
├── Quick Actions (+)
└── User Avatar (Show quick settings access)
```

### What Changes

1. **Removed from nav**:  all 13+ placeholder pages, Leaderboard (accessible from XP badge), KB sub-pages as standalone routes
2. **Knowledge Base consolidation**: Playbook, Templates, Reviews become tabs within `/knowledge` instead of separate pages
3. **Settings cleanup**: Only 2 entries (Personal + Organization). Placeholder settings pages removed entirely until built.
4. **Governance trimmed**: Remove 3 placeholder sub-pages (Integrations, Audit Log duplicate, Ownership Map)
5. **Intelligence simplified**: From 8 nav items to 2 (Reports + Brain). All placeholder intelligence pages removed.

---

## E. Executive Summary

### Core Duplicate Clusters

1. **Template/blueprint confusion**: Blueprints (briefs + project templates) vs Knowledge Templates (SOPs) vs Project Detail templates. Three different "template" concepts with unclear ownership.
2. **Audit/Activity log scatter**: Organization Settings Activity tab, Governance Compliance Audit tab, Governance Audit Log placeholder, Dashboard Recent Activity widget — 4 overlapping audit views.
3. **Company settings duplication**: Settings page has an admin company card that duplicates Organization Settings General tab.

### Most Unnecessary Sections

- **13 placeholder pages** that show "Coming Soon" — they clutter navigation, confuse users, and create false expectations. Remove all until built.
- **Secretary full page** — completely redundant with the docked panel.
- **KB Playbook** — identical to Knowledge Base with a category filter.

### Most Important Merges

1. Knowledge Base should absorb Playbook, Templates, and Reviews as tabs (4 pages → 1)
2. Settings Company card should be removed (Organization Settings is canonical)
3. Governance Audit Log placeholder should be removed (Compliance already has it)

### True Core Modules (invest here)

1. **Projects + Tasks** (Work) — the heart of the app
2. **Clients** — the business relationships
3. **Financials** — revenue tracking
4. **HR** — team management
5. **Calendar** — scheduling
6. **My Work** — personal productivity
7. **Dashboard** — executive visibility

### Modules That Are Premature

- **Governance** (7 sub-pages for a feature most users won't touch yet)
- **Gamification** (Leaderboard, XP system — nice-to-have, not core)
- **All Intelligence placeholders** (Performance, Benchmarks, Forecasting, etc.)
- **All Settings placeholders** (Billing, API Keys, Webhooks, etc.)
- **Chat** may be premature if team is small

### Navigation Burden Score

Current: **~50+ nav items** across all categories (including placeholder pages)
Proposed: **~22 nav items** — a 56% reduction

This dramatically improves the user's mental model and reduces the "where do I go?" confusion.