

# Διαχείριση Δεδομένων — Settings Data Management

## Τι θα φτιάξουμε

Νέα ενότητα "Διαχείριση Δεδομένων" στη σελίδα Ρυθμίσεις (μόνο για Admin), που επιτρέπει επιλεκτική ή μαζική διαγραφή δεδομένων ανά κατηγορία.

## Κατηγορίες δεδομένων

Ομαδοποίηση σε λογικές ενότητες με counter (πόσα records υπάρχουν):

| Κατηγορία | Τι διαγράφεται |
|-----------|---------------|
| **Έργα & Tasks** | projects, tasks, deliverables, comments, time_entries, file_attachments, file_folders |
| **Πελάτες & Επαφές** | clients, contacts, contact_tags |
| **Προτάσεις & Συμβόλαια** | proposals, proposal_items, contracts, invoices, expenses |
| **Media Plans** | media_plans, media_plan_items + snapshots |
| **Επικοινωνία** | chat_messages, chat_channels, secretary_messages, secretary_conversations |
| **HR & Άδειες** | hr_documents, leave_requests, leave_balances |
| **Brain / AI** | brain_insights, brain_deep_dives |
| **Ειδοποιήσεις & Logs** | notifications, activity_log |

## UX Flow

1. Card με τίτλο "Διαχείριση Δεδομένων" + warning icon (admin-only)
2. Λίστα κατηγοριών με checkbox, κάθε μία δείχνει τον αριθμό εγγραφών
3. Κουμπί "Διαγραφή Επιλεγμένων" → AlertDialog με confirmation (πληκτρολόγηση "ΔΙΑΓΡΑΦΗ" για επιβεβαίωση)
4. Edge function εκτελεί τη διαγραφή server-side (ασφαλής, company-scoped)

## Τεχνική υλοποίηση

### Edge Function: `data-management`
- Δέχεται JWT + categories array
- Επαληθεύει ότι ο χρήστης είναι admin/owner της εταιρείας
- Εκτελεί DELETE σε cascading σειρά (tasks πριν projects, κλπ)
- Επιστρέφει πόσα records διαγράφηκαν ανά κατηγορία

### Frontend: `DataManagementCard` component
- Νέο component στο `src/components/settings/DataManagementCard.tsx`
- Fetch counts μέσω Supabase client (count queries)
- Κλήση edge function για τη διαγραφή
- Ενσωμάτωση στο Settings.tsx (μόνο αν `isAdmin`)

## Files

| File | Αλλαγή |
|------|--------|
| `src/components/settings/DataManagementCard.tsx` | Νέο component — UI κατηγοριών, counts, confirmation dialog |
| `supabase/functions/data-management/index.ts` | Νέο edge function — server-side deletion, company-scoped |
| `src/pages/Settings.tsx` | Import + render DataManagementCard (admin-only) |

