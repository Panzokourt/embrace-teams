

# Αναβάθμιση My Work - 6 Features

## 1. Εμφάνιση ημερομηνιών (start_date & due_date) στα task rows

Προσθήκη στο `TaskRow` component: εμφάνιση start_date -> due_date σε μορφή `d/MM - d/MM` δίπλα στο project name ή σε ξεχωριστή στήλη.

## 2. Drag & Drop σειρά εργασιών σήμερα

Μετατροπή του "Tasks Σήμερα" σε reorderable λίστα:
- Χρήση `@dnd-kit/sortable` (ήδη εγκατεστημένο) για drag & drop μεταξύ γραμμών
- Αποθήκευση σειράς τοπικά σε `localStorage` (key: `my-work-task-order-{userId}-{date}`) ώστε να μην χρειάζεται DB migration
- Drag handle (GripVertical icon) στην αρχή κάθε γραμμής
- Η σειρά καθορίζει πώς ο χρήστης σκοπεύει να δουλέψει, ανεξάρτητα από ημερομηνίες

## 3. Section εγκρίσεων tasks (νέο πεδίο `approver`)

### Database Migration
- Προσθήκη στήλης `approver` (uuid, nullable) στον πίνακα `tasks`
- RLS: ο approver μπορεί να βλέπει tasks που του έχουν ανατεθεί για έγκριση

### UI
- Νέο section "Εκκρεμείς Εγκρίσεις Tasks" στο My Work
- Fetch tasks όπου `approver = user.id` και `status = 'review'`
- Κουμπιά Approve (αλλαγή status σε completed) / Reject (αλλαγή status πίσω σε in_progress)
- Εμφανίζεται μόνο αν υπάρχουν εκκρεμή

## 4. Task Sidebar (Sheet) αντί navigation

- Κλικ σε task ανοίγει Sheet (δεξιά πλαϊνή μπάρα) με τις βασικές πληροφορίες του task
- Μέσα στο Sheet: τίτλος, status, priority, dates, project, assignee, description, progress
- Κουμπί "Άνοιγμα σελίδας" μέσα στο Sheet που κάνει navigate στο `/tasks/:id`
- Χρήση του υπάρχοντος Sheet component (`@/components/ui/sheet`)

## 5. Πλήρη Quick Links

Προσθήκη στο Quick Links grid (ίδιες επιλογές με το QuickActionButton):
- Νέο Έργο, Νέο Task (υπάρχουν ήδη)
- Χρόνος, Άδεια, Ημερολόγιο (υπάρχουν ήδη)
- Creative Brief, Digital Campaign Brief, Contact Report, Website Brief, Event Brief, Communication Brief
- Αναφορές, Αρχεία

## 6. AI Chat Agent

- Νέο collapsible/expandable chat widget στο κάτω μέρος ή ως floating panel
- Edge function `my-work-ai-chat` που χρησιμοποιεί Lovable AI (google/gemini-3-flash-preview)
- Streaming responses
- System prompt: ο agent γνωρίζει τα tasks, projects και δεδομένα του χρήστη
- Δυνατότητες: αναζήτηση, δημιουργία tasks, σύνοψη εργασιών
- Floating chat button δίπλα στο FAB

## Τεχνικές λεπτομέρειες

### Αρχεία

| Αρχείο | Ενέργεια |
|--------|----------|
| `src/pages/MyWork.tsx` | Πλήρης αναβάθμιση (drag & drop, sidebar, approvals, dates, quick links) |
| `supabase/functions/my-work-ai-chat/index.ts` | Νέο edge function για AI chat |
| DB Migration | Προσθήκη `approver` στον πίνακα `tasks` |

### Σειρά υλοποίησης

1. DB Migration: προσθήκη `approver` column
2. Ενημέρωση `TaskRow` με ημερομηνίες + drag handle
3. Drag & drop στο "Tasks Σήμερα" με localStorage
4. Task Sheet sidebar
5. Section εγκρίσεων
6. Πλήρη Quick Links
7. AI Chat edge function + widget

