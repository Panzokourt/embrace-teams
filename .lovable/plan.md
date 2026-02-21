
# Secretary — AI Agent Page

## Τι είναι

Μια νέα full-page σελίδα `/secretary` με ChatGPT-style interface. Ο AI agent μπορεί να **εκτελεί ενέργειες** στην εφαρμογή (create task, upload file, open client, κλπ.) μέσω tool calling, και να **απαντά σε ερωτήσεις** βάσει real-time δεδομένων.

## Αρχιτεκτονική

Η κεντρική ιδέα: το AI model χρησιμοποιεί **tool calling** (function calling) για να εκτελεί ενέργειες. Το edge function:
1. Λαμβάνει τα μηνύματα + user context
2. Στέλνει στο Gemini **με tools definitions**
3. Αν το AI καλέσει ένα tool, το edge function **εκτελεί τη λειτουργία** στη βάση (με τα δικαιώματα του χρήστη via RLS) και επιστρέφει το αποτέλεσμα
4. Το AI συνεχίζει με την απάντηση

```text
Frontend (Chat UI)
    │
    ▼
Edge Function: secretary-agent
    │
    ├── Fetch user context (profile, permissions, projects, tasks...)
    ├── Send to Gemini with tool definitions
    │
    ├── Tool call? ──► Execute via Supabase (RLS-protected)
    │                   └── Return result to AI
    │                   └── AI continues response
    │
    └── Stream final response to frontend
```

## Διαθέσιμα Tools (18 tools)

Κάθε tool εκτελείται server-side μέσω Supabase client **με το JWT του χρήστη**, οπότε τα RLS policies εφαρμόζονται αυτόματα.

| Tool | Περιγραφή | Παράμετροι |
|------|-----------|------------|
| `create_task` | Δημιουργία task σε project | project_id, title, description, priority, due_date, assigned_to, deliverable_id |
| `update_task` | Ενημέρωση task (status, priority κλπ) | task_id, fields to update |
| `list_my_tasks` | Λίστα tasks του χρήστη | status filter, project filter |
| `list_team_tasks` | Tasks της ομάδας (αν manager) | filters |
| `create_brief` | Δημιουργία brief οποιουδήποτε τύπου | brief_type, title, data (JSON), project_id, client_id |
| `list_briefs` | Λίστα briefs | type filter |
| `create_client` | Δημιουργία πελάτη | name, contact_email, phone, address |
| `list_clients` | Λίστα πελατών | search |
| `list_projects` | Λίστα projects | status filter |
| `create_folder` | Δημιουργία φακέλου στην αρχειοθέτηση | name, parent_folder_id, project_id |
| `upload_file_to_folder` | Αρχειοθέτηση (metadata only - actual upload γίνεται client-side) | file_name, folder_id, project_id |
| `request_leave` | Αίτημα άδειας | leave_type_id, start_date, end_date, reason |
| `list_leave_balance` | Υπόλοιπο αδειών | - |
| `get_project_summary` | Σύνοψη project (tasks, budget, progress) | project_id |
| `search_files` | Αναζήτηση αρχείων | query, project_id |
| `create_deliverable` | Δημιουργία παραδοτέου | project_id, name, description, budget, due_date |
| `list_team_members` | Λίστα μελών ομάδας/εταιρείας | department filter |
| `create_expense` | Καταχώρηση εξόδου | project_id, amount, description, category |

## Edge Function: `supabase/functions/secretary-agent/index.ts`

Αυτό είναι το μεγαλύτερο κομμάτι. Η δομή:

```text
secretary-agent/index.ts
├── CORS + Auth validation (JWT)
├── Fetch rich context:
│   ├── Profile + permissions + company role
│   ├── Active tasks (top 50)
│   ├── Active projects (top 30)
│   ├── Clients list
│   ├── Brief types available
│   ├── Leave types + balances
│   └── Team members (if manager/admin)
│
├── Tool definitions (18 tools as JSON Schema)
│
├── System prompt (Greek, agency context)
│
├── Non-streaming loop:
│   1. Call Gemini with messages + tools
│   2. If response has tool_calls:
│      a. Execute each tool via Supabase
│      b. Append tool results to messages
│      c. Call Gemini again (loop)
│   3. If response is text: return to client
│
└── Return final response
```

**Σημαντικό**: Δεν χρησιμοποιούμε streaming εδώ γιατί το tool calling loop απαιτεί πολλαπλά round-trips με το AI. Αντ' αυτού:
- Στέλνουμε ένα request, περιμένουμε το πλήρες response
- Αν υπάρχουν tool calls, τα εκτελούμε και ξαναστέλνουμε
- Επιστρέφουμε το τελικό text response

Αν το tool calling ολοκληρωθεί και θέλουμε streaming στο τελευταίο response, μπορούμε να κάνουμε hybrid: non-streaming για tool loops, streaming για final answer.

## Frontend: Νέα σελίδα `/secretary`

### UI Layout (ChatGPT-inspired)

```text
┌──────────────────────────────────────────────────────────────┐
│  ◀  Secretary                                    [+ New Chat]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              🤖 Γεια! Είμαι ο Secretary.                     │
│              Πώς μπορώ να σε βοηθήσω;                       │
│                                                              │
│  ┌──────────────────────────────────────────┐                │
│  │ Δημιούργησε ένα task "Σχεδιασμός logo"   │                │
│  │ στο project "Rebranding ACME" με         │  ← user msg   │
│  │ deadline αύριο                            │                │
│  └──────────────────────────────────────────┘                │
│                                                              │
│  ┌──────────────────────────────────────────┐                │
│  │ ✅ Δημιούργησα το task:                   │                │
│  │ • Τίτλος: Σχεδιασμός logo                │  ← AI reply   │
│  │ • Project: Rebranding ACME               │                │
│  │ • Deadline: 22/02/2026                   │                │
│  │ • Priority: medium                        │                │
│  │                                           │                │
│  │ Θέλεις να το αναθέσω σε κάποιον;         │                │
│  └──────────────────────────────────────────┘                │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Quick actions:                                              │
│  [📋 Tasks μου] [📝 Νέο Brief] [📁 Αρχεία] [🏖 Άδεια]     │
│                                                              │
│  ┌────────────────────────────────────┐  [Send]              │
│  │ Γράψε μήνυμα...                   │                      │
│  └────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### Χαρακτηριστικά UI:
- **Full-page layout** μέσα στο AppLayout (sidebar visible)
- **Message bubbles** με markdown rendering
- **Quick action chips** πάνω από το input (shortcut prompts)
- **Loading indicator** ("Secretary σκέφτεται..." + animated dots) κατά τη διάρκεια tool execution
- **Tool execution feedback**: Inline badges/cards που δείχνουν τι εκτέλεσε (π.χ. "Task δημιουργήθηκε" με link)
- **Conversation memory**: Κρατά τα μηνύματα στο local state (δεν αποθηκεύεται σε DB - fresh start κάθε φορά, εκτός αν ζητηθεί αργότερα)

### Component: `src/pages/Secretary.tsx`

State:
```typescript
const [messages, setMessages] = useState<ChatMsg[]>([]);
const [input, setInput] = useState('');
const [loading, setLoading] = useState(false);
```

Κάθε μήνυμα θα στέλνεται στο edge function `secretary-agent` μαζί με ολόκληρο το conversation history.

## Αρχεία που δημιουργούνται/αλλάζουν

| Αρχείο | Τύπος |
|--------|-------|
| `supabase/functions/secretary-agent/index.ts` | **Νέο** — Edge function με tool calling |
| `src/pages/Secretary.tsx` | **Νέο** — Full-page chat UI |
| `src/App.tsx` | **Edit** — Προσθήκη route `/secretary` |
| `src/components/layout/AppSidebar.tsx` | **Edit** — Προσθήκη nav item "Secretary" (icon: Bot) |
| `supabase/config.toml` | **Edit** — Register new function |

## System Prompt (περίληψη)

```text
Είσαι ο Secretary, ο AI βοηθός της εταιρείας [company name].
Μπορείς να εκτελείς ενέργειες στο σύστημα χρησιμοποιώντας τα tools σου.

Κανόνες:
- Πάντα ρώτα για επιβεβαίωση πριν εκτελέσεις κάτι σημαντικό
- Αν λείπουν παράμετροι, ρώτα τον χρήστη
- Χρησιμοποίησε markdown
- Μιλάς ελληνικά εκτός αν σε ρωτήσουν αγγλικά
- Αν δεν μπορείς να κάνεις κάτι, εξήγησε γιατί
- Αν δεν έχεις δικαιώματα, ενημέρωσε τον χρήστη

Context: [user profile, tasks, projects, clients, team...]
```

## Ασφάλεια

- Όλα τα tool executions γίνονται με τον Supabase client που χρησιμοποιεί το JWT του χρήστη
- Τα RLS policies εφαρμόζονται αυτόματα — αν ο χρήστης δεν έχει δικαίωμα, η query αποτυγχάνει
- Ο agent δεν μπορεί να κάνει τίποτα που δεν θα μπορούσε να κάνει ο χρήστης χειροκίνητα
- JWT validation στην αρχή του edge function

## Ροή Εκτέλεσης Tool (παράδειγμα)

```text
User: "Φτιάξε ένα task Σχεδιασμός Logo στο ACME project"

1. Edge function fetches context → knows ACME project_id
2. Sends to Gemini with tools
3. Gemini calls: create_task({ project_id: "abc", title: "Σχεδιασμός Logo", priority: "medium" })
4. Edge function executes: supabase.from('tasks').insert(...)
5. Returns result: { success: true, task_id: "xyz", title: "Σχεδιασμός Logo" }
6. Gemini gets result, generates final message: "Δημιούργησα το task..."
7. Response sent to frontend
```
