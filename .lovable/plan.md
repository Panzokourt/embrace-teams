
# Realtime Status Updates & Activity Feed

## Τι αλλάζει

### 1. Global Live Activity Feed (Sidebar Panel)
Νέο collapsible panel στο layout (δεξιά πλευρά) που δείχνει live activity feed σε πραγματικό χρόνο:
- Εμφανίζεται/κρύβεται με button στο top bar (δίπλα στο notification bell)
- Δείχνει τις τελευταίες ενέργειες με avatar, χρήστη, action, timestamp
- Νέες εγγραφές εμφανίζονται αυτόματα με animation (slide-in) χωρίς refresh
- Subscribes στο `activity_log` table μέσω Supabase Realtime (ήδη enabled)
- Clickable items: κλικ σε activity οδηγεί στη σχετική σελίδα (project, task, tender κλπ)

### 2. Automatic Activity Logging σε ολες τις CRUD operations
Η συνάρτηση `logActivity()` υπάρχει αλλά δεν καλείται πουθενά. Θα ενσωματωθεί σε:

- **Projects**: create, update, delete, status change
- **Tasks**: create, update, delete, complete, assign
- **Tenders**: create, update stage, delete
- **Clients**: create, update, delete
- **Invoices**: create, update, mark paid, delete
- **Deliverables**: create, update, complete
- **Teams**: create, update, delete members

### 3. Realtime Notifications Enhancement
Αναβάθμιση του `NotificationBell` ωστε:
- Να κάνει subscribe σε realtime changes στα `tasks` και `tenders` tables
- Να ενημερώνεται αυτόματα (χωρίς manual refresh) οταν αλλάζει deadline ή status
- Toast notification οταν ένα task γίνεται overdue ή πλησιάζει deadline

### 4. Realtime Status Indicators
- Στα task cards/rows: live status badge που ενημερώνεται αυτόματα
- Στα project cards: live progress indicator
- Animated transition οταν αλλάζει status (pulse effect)

### 5. Dashboard RecentActivity widget - Realtime
Αναβάθμιση του RecentActivity widget στο dashboard ωστε να κάνει subscribe σε realtime updates αντί να φορτώνει μόνο μία φορά.

## Technical Details

### Νέα αρχεία
- `src/components/activity/GlobalActivityFeed.tsx` - Slide-over panel με live feed
- `src/hooks/useActivityLogger.ts` - Hook που wraps logActivity με τον current user, επιστρέφει helper functions (logCreate, logUpdate, logDelete, logStatusChange)

### Αλλαγές σε υπάρχοντα

**`src/components/layout/AppLayout.tsx`**:
- Προσθήκη Activity icon button στο top bar
- Προσθήκη `GlobalActivityFeed` component (Sheet panel)

**`src/components/activity/ActivityLog.tsx`**:
- Βελτίωση realtime subscription (ήδη υπάρχει, αλλά θα προστεθεί animated entry για νέα items)

**`src/components/dashboard/widgets/RecentActivity.tsx`**:
- Προσθήκη realtime subscription στο activity_log
- Auto-refresh οταν έρχονται νέα events

**`src/components/notifications/NotificationBell.tsx`**:
- Προσθήκη realtime subscription σε tasks/tenders
- Auto-refresh notifications χωρίς reload
- Toast alerts για critical events (overdue tasks)

**`src/pages/Projects.tsx`**:
- Κλήση `logActivity` σε create/update/delete project

**`src/pages/Tasks.tsx`**:
- Κλήση `logActivity` σε create/update/delete/complete task

**`src/pages/Tenders.tsx`**:
- Κλήση `logActivity` σε create/update stage/delete tender

**`src/pages/Clients.tsx`**:
- Κλήση `logActivity` σε create/update/delete client

**`src/pages/Financials.tsx`**:
- Κλήση `logActivity` σε create/update/pay/delete invoice

**`src/pages/ProjectDetail.tsx`**:
- Κλήση `logActivity` σε update project info

**`src/pages/TenderDetail.tsx`**:
- Κλήση `logActivity` σε update tender

### useActivityLogger hook

```text
const { logCreate, logUpdate, logDelete, logStatusChange } = useActivityLogger();

// Usage:
await logCreate('project', projectId, projectName);
await logUpdate('task', taskId, taskName, { field: 'status', old: 'todo', new: 'completed' });
await logDelete('client', clientId, clientName);
await logStatusChange('task', taskId, taskName, 'todo', 'completed');
```

Ο hook παίρνει αυτόματα το `user.id` από το AuthContext, αποφεύγοντας manual passing.

### GlobalActivityFeed component

```text
+-----------------------------------+
| Δραστηριότητα           [X close] |
|-----------------------------------|
| [avatar] User created project X   |
|          2 λεπτά πριν             |
|-----------------------------------|
| [avatar] User completed task Y    |  <-- νέο, slide-in animation
|          5 λεπτά πριν             |
|-----------------------------------|
| [avatar] User updated tender Z    |
|          10 λεπτά πριν            |
+-----------------------------------+
```

- Sheet component (right side)
- ScrollArea με infinite-like loading (τα τελευταία 50 events)
- Realtime subscription: νέα events εμφανίζονται στην κορυφή με fade-in animation
- Entity icon + clickable link στη σχετική σελίδα

### Realtime NotificationBell Enhancement

```text
Τρέχουσα κατάσταση: Fetch μόνο στο mount
Νέα κατάσταση: Fetch στο mount + subscribe σε tasks/tenders changes
  -> Οταν αλλάξει task status/due_date -> refetch notifications
  -> Οταν task γίνει overdue -> toast alert
```

### Database
Δεν χρειάζεται migration - ο πίνακας `activity_log` υπάρχει ήδη και το realtime είναι ήδη enabled.

### Σειρά υλοποίησης
1. `useActivityLogger` hook
2. Ενσωμάτωση `logActivity` calls σε ολες τις CRUD σελίδες (Projects, Tasks, Tenders, Clients, Financials, ProjectDetail, TenderDetail)
3. `GlobalActivityFeed` component
4. Update `AppLayout` (activity feed button + panel)
5. Αναβάθμιση `RecentActivity` widget (realtime)
6. Αναβάθμιση `NotificationBell` (realtime + toasts)
