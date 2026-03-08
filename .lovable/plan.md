

# Πλάνο: Ενσωμάτωση Ροών Εργασίας στην Καθημερινότητα

## Επισκόπηση

Σύνδεση των Workflows/Requests με τα υπάρχοντα entities (Projects, Tasks, My Work) ώστε ο χρήστης να βλέπει **πού βρίσκεται κάθε έργο στη ροή** και να αλληλεπιδρά χωρίς να φεύγει από το context του.

## 3 Σημεία Ενσωμάτωσης

### 1. Workflow Tracker στο Project Detail

Νέο tab **«Ροή»** (ή widget στην Επισκόπηση) στη σελίδα ProjectDetail που δείχνει:

- **Mini flow diagram**: Οριζόντια αναπαράσταση των stages της ροής με highlight στο τρέχον στάδιο — read-only έκδοση του canvas
- **Ενεργό αίτημα**: Αν το project συνδέεται με intake request, δείχνει status, ποιος πρέπει να κάνει approve, SLA countdown
- **Quick actions**: Approve/Reject/Comment απευθείας από εδώ
- **Ιστορικό ροής**: Timeline με τις μεταβάσεις (ποιος ενέκρινε, πότε)

Αν δεν υπάρχει linked request, δείχνει «Δεν ανήκει σε ροή» + κουμπί «Σύνδεση με ροή».

**Component**: `ProjectWorkflowTracker.tsx` — ενσωματώνεται ως tab ή card στο ProjectDetail.

### 2. Workflow Stage στο My Work

Στη σελίδα My Work, νέο section **«Εκκρεμείς Εγκρίσεις»** που δείχνει:

- Requests όπου ο χρήστης είναι responsible (βάσει `responsible_roles` + ρόλο χρήστη στην εταιρία)
- Κάθε item: Τίτλος αιτήματος, τρέχον στάδιο, SLA remaining, workflow name
- Quick approve/reject inline
- Click → ανοίγει το request detail

**Component**: `PendingApprovalsCard.tsx` — card στο My Work dashboard.

### 3. Workflow Badge σε Tables & Cards

Σε lists/tables (Projects, Tasks):
- Μικρό **workflow badge** δίπλα στο project name, που δείχνει τρέχον stage (π.χ. `📋 Αξιολόγηση`)
- Hover → tooltip με workflow name + SLA info
- Σε Kanban view, χρωματική ένδειξη αν υπάρχει pending approval

## Database

Δεν χρειάζονται schema changes — ο πίνακας `intake_requests` ήδη έχει `project_id` FK. Χρειάζεται μόνο:
- Query: fetch request by project_id + join stages/workflow
- Query: fetch requests where responsible_roles overlaps with user's role

## Αρχεία

| Αρχείο | Αλλαγή |
|---|---|
| `src/components/projects/ProjectWorkflowTracker.tsx` | **Νέο** — Mini flow + status + actions |
| `src/components/work/PendingApprovalsCard.tsx` | **Νέο** — My Work widget |
| `src/pages/ProjectDetail.tsx` | **Update** — Προσθήκη tab «Ροή» |
| `src/pages/MyWork.tsx` | **Update** — Προσθήκη section εκκρεμών εγκρίσεων |
| `src/components/projects/ProjectsTableView.tsx` | **Update** — Workflow stage badge στη στήλη |
| `src/hooks/useIntakeWorkflows.ts` | **Update** — Helper: fetchRequestByProject, fetchPendingForUser |

