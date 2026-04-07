

# Tasks — Recurring, Dependencies & Review/Approval System

## Τρέχουσα κατάσταση

- **Recurring**: Τα πεδία `is_recurring`, `recurrence_pattern`, `recurrence_end_date` υπάρχουν ήδη στο DB αλλά δεν χρησιμοποιούνται στο UI.
- **Dependencies**: Ο πίνακας `task_dependencies` υπάρχει, το `TaskDependencySelector` component υπάρχει, αλλά δεν ενσωματώνεται στο TaskDetail page.
- **Review/Approval**: Τα πεδία `internal_reviewer` και `approver` υπάρχουν. Η ροή κατάστασης περιλαμβάνει `review`, `internal_review`, `client_review`, αλλά δεν υπάρχει ολοκληρωμένο σύστημα (ποιος εγκρίνει, σχόλια review, approve/reject actions).

## Τι θα φτιαχτεί

### 1. Recurring Tasks UI
Νέα κάρτα "Επανάληψη" στο δεξί panel του TaskDetail:
- Toggle on/off (`is_recurring`)
- Μοτίβο: Καθημερινά, Εβδομαδιαία, Μηνιαία, Προσαρμοσμένο
- Ημερομηνία λήξης επανάληψης
- Edge function `recurring-task-generator` που τρέχει σε cron (1x/day), βρίσκει recurring tasks με `due_date <= today` και δημιουργεί αντίγραφο με νέες ημερομηνίες

### 2. Dependencies ενσωμάτωση στο TaskDetail
- Νέα κάρτα "Εξαρτήσεις" στο δεξί panel χρησιμοποιώντας το υπάρχον `TaskDependencySelector`
- Fetch dependencies on load, εμφάνιση blocked status αν dependency δεν είναι completed
- Warning badge στο status flow αν υπάρχουν ανοικτές εξαρτήσεις

### 3. Review/Approval System

**Νέος πίνακας `task_reviews`:**
- `task_id`, `reviewer_id`, `review_type` (internal/client/approval), `status` (pending/approved/rejected/changes_requested), `comment`, `created_at`, `resolved_at`

**UI στο TaskDetail:**
- Νέα κάρτα "Έγκριση & Review" στο δεξί panel
- Ορισμός Reviewer & Approver (inline select)
- Όταν task πάει σε `internal_review` / `client_review`: αυτόματη δημιουργία review record
- Review actions: Approve, Request Changes, Reject — με σχόλιο
- Ιστορικό reviews (timeline)
- Αν ο reviewer εγκρίνει → task προχωράει στο επόμενο status αυτόματα

## Database Migration

```sql
-- task_reviews table
CREATE TABLE public.task_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  review_type TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: viewable by project members
CREATE POLICY "Users can view reviews for accessible tasks"
  ON public.task_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_id 
    AND t.project_id IN (SELECT public.get_visible_projects(auth.uid()))
  ));

-- Insert/Update by authenticated
CREATE POLICY "Authenticated can create reviews"
  ON public.task_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Reviewer can update own reviews"
  ON public.task_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());
```

## Files

| File | Αλλαγή |
|------|--------|
| Migration | `task_reviews` table + RLS |
| `src/components/tasks/TaskRecurrenceCard.tsx` | Νέο — UI recurring settings |
| `src/components/tasks/TaskReviewCard.tsx` | Νέο — Review/approval panel card |
| `src/pages/TaskDetail.tsx` | Ενσωμάτωση 3 νέων cards + dependency fetch |
| `supabase/functions/recurring-task-generator/index.ts` | Νέο — Cron function για αυτόματη δημιουργία recurring tasks |

