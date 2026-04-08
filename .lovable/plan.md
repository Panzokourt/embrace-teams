

# Secretary Sidebar — Page-Aware Context

## Τι αλλάζει

Το sidebar Secretary chat θα "βλέπει" τα δεδομένα της τρέχουσας σελίδας. Αν ο χρήστης είναι σε task detail, ο agent θα ξέρει τον τίτλο, status, assignee, comments κλπ. Αν είναι σε project, θα ξέρει progress, team, tasks. Αυτό ισχύει **μόνο** στο sidebar panel mode.

## Αρχιτεκτονική

```text
┌──────────────────────┐     ┌─────────────────────┐
│ SecretaryChat        │     │ secretary-agent      │
│ (panel mode)         │     │                      │
│                      │     │                      │
│ usePageContext()─────┼────►│ page_context: {...}  │
│ fetches entity data  │     │ injected in system   │
│ based on pathname    │     │ prompt               │
└──────────────────────┘     └─────────────────────┘
```

## Frontend — Νέο hook `usePageContext`

Hook που εκτελείται μόνο σε panel mode, παρακολουθεί το `location.pathname` και φέρνει τα σχετικά δεδομένα:

| Route Pattern | Data Fetched |
|---|---|
| `/tasks/:id` | Task: title, status, priority, due_date, assignee, project name, description, subtasks count, comments count |
| `/projects/:id` | Project: name, status, progress, client, budget, team members, task counts by status |
| `/clients/:id` | Client: name, email, phone, active projects count, recent invoices |
| `/knowledge/articles/:id` | Article: title, category, status, word count, backlinks |
| `/brain` | Latest 5 insights (title, priority, category) |
| `/calendar` | Today's events count + next 3 upcoming |
| `/timesheets` | This week's logged hours summary |
| Other routes | Minimal context (just page name) |

Το hook επιστρέφει `{ pageName: string, pageData: object }` — serialized JSON που στέλνεται στο agent.

## Frontend — SecretaryChat αλλαγές

- Σε `mode="panel"`: καλεί `usePageContext()` και στέλνει `page_context` στο request body
- Σε `mode="full"`: δεν στέλνει page_context (η main page δεν έχει "τρέχουσα σελίδα")
- Τα contextual quick actions επίσης ενημερώνονται με βάση τα πραγματικά δεδομένα (π.χ. δείχνει "Update status αυτού του task" αντί generic)

## Backend — secretary-agent αλλαγές

- Parse `page_context` από το request body
- Inject στο system prompt ένα νέο section:

```
## Τρέχουσα Σελίδα
Ο χρήστης βλέπει αυτή τη στιγμή: [Task] "SEO Audit για Client X"
- Status: in_progress, Priority: high, Due: 2026-04-15
- Assigned to: Γιώργος Κ.
- Project: "Καμπάνια SEO Q2"
- 3 subtasks (1 completed), 5 σχόλια

ΣΗΜΑΝΤΙΚΟ: Απάντα ΠΑΝΤΑ με context αυτής της σελίδας. Αν ο χρήστης ρωτήσει "τι status έχει;" εννοεί αυτό το task.
Αν ρωτήσει "ποιος το κάνει;" εννοεί αυτό το task. Μην ρωτάς "ποιο task εννοείς;".
```

- Αντικατάσταση του απλού `pageContext` string με πλούσιο context

## Files

| File | Αλλαγή |
|------|--------|
| `src/hooks/usePageContext.ts` | Νέο — fetches entity data based on current route |
| `src/components/secretary/SecretaryChat.tsx` | Import + χρήση usePageContext σε panel mode, στέλνει page_context στο request |
| `supabase/functions/secretary-agent/index.ts` | Parse page_context, inject rich context στο system prompt |

