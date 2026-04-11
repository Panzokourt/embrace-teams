

# Centralized Query Layer — Phased Refactor

## Πρόβλημα

**128 αρχεία** κάνουν inline `supabase.from(...)` queries, ενώ μόνο **12** χρησιμοποιούν `@tanstack/react-query`. Αυτό σημαίνει:
- Duplicate queries για τα ίδια δεδομένα (projects, clients, invoices)
- Κανένα caching — κάθε component κάνει δικό του fetch
- Cache invalidation σκορπισμένο σε πολλά σημεία
- Inconsistent query keys (`sidebar-projects`, `projects-for-mp`, `sub-projects`)

## Προτεινόμενη Αρχιτεκτονική

```text
src/
  queries/
    projects.ts      ← queryOptions + mutation helpers
    clients.ts
    invoices.ts
    expenses.ts
    tasks.ts
    contacts.ts
    timesheets.ts
    media-plans.ts
    index.ts          ← re-exports
```

Κάθε αρχείο εξάγει named query factories:

```typescript
// src/queries/projects.ts
export const projectQueries = {
  all: (companyId: string) => queryOptions({
    queryKey: ['projects', 'list', companyId],
    queryFn: async () => { ... }
  }),
  detail: (id: string) => queryOptions({
    queryKey: ['projects', 'detail', id],
    queryFn: async () => { ... }
  }),
  sidebar: (companyId: string) => queryOptions({
    queryKey: ['projects', 'sidebar', companyId],
    queryFn: async () => { ... }
  }),
}
```

## Στρατηγική — Σε 3 φάσεις

Το refactor **128 αρχείων** δεν γίνεται σε ένα βήμα χωρίς ρίσκο regression. Προτείνω:

### Φάση 1 — Foundation + Core Entities (τώρα)
Δημιουργία `src/queries/` με τα **6 πιο χρησιμοποιούμενα** entities:
- `projects.ts` — list, detail, sidebar, subprojects
- `clients.ts` — list, detail
- `invoices.ts` — byProject, byClient
- `expenses.ts` — byProject
- `tasks.ts` — byProject, myTasks
- `profiles.ts` — companyProfiles, detail

Refactor **~15-20 αρχεία** που κάνουν τα πιο συχνά queries (ProjectDetail, SidebarProjectTree, Dashboard, FinancialsHub).

### Φάση 2 — Secondary Entities
- `contacts.ts`, `timesheets.ts`, `media-plans.ts`, `contracts.ts`
- Refactor τα αντίστοιχα components

### Φάση 3 — Mutations + Optimistic Updates
- Centralized mutation helpers με automatic invalidation
- Optimistic updates για CRUD operations

## Τι αλλάζει στη Φάση 1

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/queries/projects.ts` | **Νέο** — query factories |
| `src/queries/clients.ts` | **Νέο** |
| `src/queries/invoices.ts` | **Νέο** |
| `src/queries/expenses.ts` | **Νέο** |
| `src/queries/tasks.ts` | **Νέο** |
| `src/queries/profiles.ts` | **Νέο** |
| `src/queries/index.ts` | **Νέο** — barrel export |
| `SidebarProjectTree.tsx` | Refactor σε `projectQueries.sidebar()` |
| `ProjectDetail.tsx` | Refactor σε `projectQueries.detail()` |
| `ProjectFinancialsHub.tsx` | Refactor σε `invoiceQueries` + `expenseQueries` |
| `Dashboard.tsx` | Refactor σε centralized queries |
| ~10 ακόμα components | Αντικατάσταση inline queries |

## Κανόνες Query Keys

```text
['entity', 'scope', ...params]

['projects', 'list', companyId]
['projects', 'detail', projectId]  
['projects', 'sidebar', companyId]
['invoices', 'byProject', projectId]
['clients', 'list', companyId]
```

Invalidation: `queryClient.invalidateQueries({ queryKey: ['projects'] })` σβήνει **όλα** τα project queries.

## Τι δεν αλλάζει

- Supabase client (`client.ts`) — ως έχει
- Existing hooks (`useTimeTracking`, `useChatMessages` κλπ) — θα refactored σε Φάση 2-3
- Mutation logic σε components — Φάση 3

