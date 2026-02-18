
# Ενοποιημενο Section "Εργασιες" - Καταργηση Tenders, Ενισχυση Projects

## Συνοπτικη Περιγραφη

Καταργουμε πληρως το concept "Tenders" ως ξεχωριστη οντοτητα. Τα leads/ευκαιριες γινονται απλα **Projects σε πρωιμο σταδιο** (pipeline statuses). Ολα ζουν κατω απο ενα ενιαιο section **"Εργασιες"** με 4 tabs: Εργα, Tasks, Ημερολογιο, Επισκοπηση.

## Τι αλλαζει σε επιπεδο concept

Σημερα εχουμε:
- **Tenders** (ξεχωριστος πινακας) με stages: identification -> preparation -> submitted -> evaluation -> won -> lost
- **Projects** με statuses: tender, active, completed, cancelled
- Οταν ενα tender γινεται "won", δημιουργειται νεο project και μεταφερονται deliverables/tasks

Μετα:
- **Μονο Projects** με ενιαιο lifecycle: `lead` -> `proposal` -> `negotiation` -> `won` (αυτοματα γινεται `active`) -> `active` -> `completed` / `cancelled` / `lost`
- Τα πρωιμα στaδια (lead, proposal, negotiation) ειναι ο "pipeline" -- αυτο που ηταν τα tenders
- Οταν ενα project γινει "won", αλλαζει αυτοματα σε "active" (χωρις να δημιουργειται νεα εγγραφη)
- Τα tender-specific πεδια (submission_deadline, probability, source_email, tender_type) μπαινουν στον πινακα projects

## Νεα Δομη Section "Εργασιες"

### Tab 1: Εργα (Projects)
- **Card / Table / Kanban views** (οπως τωρα)
- Kanban columns: Lead | Proposal | Negotiation | Active | Completed
- Φιλτρο "Pipeline" (δειχνει μονο lead/proposal/negotiation) vs "Active" vs "All"
- Δημιουργια νεου εργου: μπορει να ξεκινησει ως Lead (pipeline) ή απευθειας ως Active
- Click -> `/projects/:id` (detail page -- ενοποιημενο)

### Tab 2: Tasks
- Cross-project view ολων των tasks (οπως τωρα)
- Card/Table/Kanban views
- Filters: assignee, status, project, priority

### Tab 3: Ημερολογιο
- Μετακινηση Calendar εδω (deadlines, milestones, task due dates)
- Αφαιρεση τυπου "tender" απο events (γινονται projects)

### Tab 4: Επισκοπηση (Dashboard)
- KPI cards: Pipeline value, Active projects, Overdue tasks, Win rate
- Pipeline funnel chart
- Workload per person
- Upcoming deadlines

## Database Changes

### 1. Ενημερωση enum `project_status`
Νεες τιμες: `lead`, `proposal`, `negotiation`, `won`, `active`, `completed`, `cancelled`, `lost`
(Κρατουμε `tender` προσωρινα για backward compatibility, μετα data migration γινεται deprecate)

### 2. Νεα columns στον πινακα `projects`
- `submission_deadline` date (απο tenders)
- `probability` integer default 50 (πιθανοτητα επιτυχιας, pipeline)
- `source` text (πηγη ευκαιριας: email, referral, website, direct)
- `tender_type` text (public, private, direct κλπ -- απο tenders)
- `won_date` date (ποτε κερδηθηκε)
- `lost_reason` text (αν χαθηκε, γιατι)

### 3. Data Migration
- Μεταφορα 3 tenders -> projects (ως lead/proposal status)
- Μεταφορα tender_deliverables -> deliverables
- Μεταφορα tender_tasks -> tasks
- Μεταφορα tender_team_access -> project_user_access
- Μεταφορα file_attachments tender_id -> project_id
- Μεταφορα tender_suggestions -> αποθηκευση στο project metadata (ή αγνοηση αν εχουν ηδη applied)

### 4. Ενημερωση ProjectDetail
- Οταν project ειναι σε pipeline stage (lead/proposal/negotiation), εμφανιζει τα pipeline-specific πεδια (probability, submission_deadline, source)
- Οταν ειναι active/completed, εμφανιζει τα κλασικα project πεδια
- Ενσωματωση AI suggestions (απο TenderAISuggestions) στο ProjectDetail
- Ενσωματωση Team management (απο TenderTeamManager -- ηδη υπαρχει ProjectTeamManager)

### 5. Αφαιρεση Tenders
- Αφαιρεση `src/pages/Tenders.tsx` και `src/pages/TenderDetail.tsx`
- Αφαιρεση `src/components/tenders/*` (10 αρχεια)
- Αφαιρεση `src/hooks/useTenderToProject.ts` (η λογικη γινεται status change στο project)
- Αφαιρεση routes `/tenders`, `/tenders/:id`
- Redirect `/tenders` -> `/projects` (backward compat)

## UI Layout

```text
+--------------------------------------------------+
| Εργασιες                                          |
+--------------------------------------------------+
| [Εργα] [Tasks] [Ημερολογιο] [Επισκοπηση]        |
+--------------------------------------------------+
|                                                    |
|  Tab "Εργα":                                       |
|  [+ Νεο Εργο] [Pipeline | Active | All]           |
|  [Card | Table | Kanban]                           |
|                                                    |
|  Kanban columns:                                   |
|  | Lead | Proposal | Negotiation | Active | Done | |
|                                                    |
+--------------------------------------------------+
```

## Project Detail - Ενοποιημενο

```text
+--------------------------------------------------+
| <- Πισω στα Εργα                                  |
| [Project Name]           Status: [Lead v]          |
|                                                    |
| -- Αν Pipeline (lead/proposal/negotiation): --     |
| Πιθανοτητα: 70%  |  Deadline: 15/03  |  Πηγη: ... |
| [AI Suggestions] [Upload Files for Analysis]       |
|                                                    |
| -- Αν Active/Completed: --                         |
| Progress: 65%  |  Budget: 50.000  |  Period: ...   |
|                                                    |
| Tabs:                                              |
| [Overview] [Deliverables] [Tasks] [Files]          |
| [Financials] [Comments] [Media Plan]               |
+--------------------------------------------------+
```

## Αρχεια

### Νεα
- `src/pages/Work.tsx` -- Κεντρικη σελιδα "Εργασιες" με 4 tabs
- `src/components/work/WorkOverview.tsx` -- Dashboard tab με KPIs

### Τροποποιημενα
- `src/pages/ProjectDetail.tsx` -- Προσθηκη pipeline-specific UI (probability, deadline, AI suggestions)
- `src/pages/Projects.tsx` -- Εξαγωγη core content σε component για χρηση μεσα στο Work.tsx
- `src/pages/Tasks.tsx` -- Εξαγωγη core content σε component
- `src/pages/Calendar.tsx` -- Εξαγωγη core content + αφαιρεση tender references
- `src/App.tsx` -- Νεες routes, redirects
- `src/components/layout/AppSidebar.tsx` -- Ενα link "Εργασιες" αντι 3

### Αφαιρουμενα
- `src/pages/Tenders.tsx`
- `src/pages/TenderDetail.tsx`
- `src/components/tenders/*` (10 αρχεια)
- `src/hooks/useTenderToProject.ts`

## Σειρα Υλοποιησης

1. **Database migration**: Νεα columns στο projects, νεες enum τιμες, data migration tenders -> projects, data migration tender_deliverables/tasks/files/team
2. **ProjectDetail ενημερωση**: Pipeline-specific UI, AI suggestions ενσωματωση
3. **Projects page update**: Νεα statuses, pipeline filter, kanban columns
4. **Calendar update**: Αφαιρεση tender references
5. **Work.tsx**: Κεντρικη σελιδα με tabs (Εργα, Tasks, Ημερολογιο, Επισκοπηση)
6. **WorkOverview**: Dashboard tab
7. **Routing + Sidebar**: Ενημερωση routes, redirects, sidebar
8. **Cleanup**: Αφαιρεση tenders components/pages/hooks

## Σημαντικες Σημειωσεις

- Τα 3 υπαρχοντα tenders θα μεταφερθουν αυτοματα ως projects στη migration
- Τα 29 tender_deliverables και 35 tender_tasks θα γινουν κανονικα deliverables/tasks
- Η λογικη "won -> create project" αντικαθισταται απο "status change won -> active" (ιδιο project, απλα αλλαζει status)
- Οι RLS policies του projects καλυπτουν ηδη ολα τα scenarios
- Μετα την migration, οι tenders πινακες μπορουν να μεινουν (ως archive) ή να αφαιρεθουν
