

# Email-to-Project — AI Brief Parsing Feature

## Σύνοψη

Προσθήκη δυνατότητας δημιουργίας project απευθείας από email brief μέσω AI ανάλυσης. Ο χρήστης πατάει ένα κουμπί στο InboxConversation, ο AI αναλύει το email και προτείνει δομημένο draft project με tasks.

## Βήματα

### 1. Database Migration
Προσθήκη 2 columns στο `email_messages`:
- `is_brief_candidate BOOLEAN DEFAULT false`
- `brief_parsed_at TIMESTAMPTZ`

### 2. Edge Function: `email-to-project`
Νέο endpoint που:
- Φέρνει το email, τους clients και τα templates της εταιρείας
- Καλεί Anthropic API (ANTHROPIC_API_KEY υπάρχει ήδη στα secrets) για JSON extraction
- Κάνει client matching (name ή email domain)
- Επιστρέφει structured draft
- Ενημερώνει `brief_parsed_at` στο email

### 3. Hook: `src/hooks/useEmailToProject.ts`
State management για parsing → draft editing → project creation:
- `parseBrief()` — καλεί edge function
- `updateDraft()` — inline editing
- `createProject()` — insert σε `projects` + `tasks` + `email_entity_links`
- **Σημείωση**: Το `projects` table δεν έχει `priority` column — θα αποθηκεύεται στο `metadata` JSONB. Επίσης tasks δεν έχουν `sort_order`, θα χρησιμοποιηθεί `created_at` ordering.

### 4. Component: `src/components/inbox/EmailToProjectBanner.tsx`
Expandable banner με 4 states:
1. Trigger — amber banner "Αυτό το email μοιάζει με brief"
2. Parsing — spinner
3. Draft ready — editable form (client, name, description, budget, deadline, priority, tasks as chips)
4. Success — auto-navigate

### 5. Wire into `InboxConversation.tsx`
- Νέο Sparkles button στο header (amber χρώμα)
- Render `EmailToProjectBanner` μεταξύ header και ScrollArea
- Χωρίς αλλαγές στην υπόλοιπη λογική

## Τεχνικές προσαρμογές vs. αρχείο prompt
| Θέμα | Prompt λέει | Πραγματικό schema | Λύση |
|------|-------------|-------------------|------|
| Project priority | Insert `priority` | Δεν υπάρχει column | Αποθήκευση σε `metadata` JSONB |
| Task sort_order | Insert `sort_order` | Δεν υπάρχει column | Παράλειψη, χρήση `created_at` |
| Company_id σε tasks | `company_id` | Δεν υπάρχει column σε tasks | Παράλειψη |
| AI call | Anthropic direct | ANTHROPIC_API_KEY exists | Direct fetch to Anthropic API |

## Αρχεία

| Αρχείο | Ενέργεια |
|--------|----------|
| Migration | `ALTER TABLE email_messages ADD COLUMN ...` |
| `supabase/functions/email-to-project/index.ts` | Νέο |
| `src/hooks/useEmailToProject.ts` | Νέο |
| `src/components/inbox/EmailToProjectBanner.tsx` | Νέο |
| `src/components/inbox/InboxConversation.tsx` | Μικρή αλλαγή (button + banner) |

