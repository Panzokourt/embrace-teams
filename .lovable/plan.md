

# Universal Mention & Slash Command System

## Πρόβλημα

Σήμερα υπάρχουν **3 ασύμβατες υλοποιήσεις mention**, καθεμία περιορισμένη:

| Σημείο | Τι υποστηρίζει | Σύνταξη |
|--------|----------------|---------|
| `src/components/chat/MentionInput.tsx` (Chat panel) | users, projects, tasks, email threads | `@Όνομα ` (plain) |
| `src/components/secretary/MentionInput.tsx` | profiles, projects, tasks, files | `@[name](type:id)` |
| `CommentsSection > MentionTextarea` | μόνο users του project | `@name ` |
| `QuickChatBar` (κάτω-κέντρο) | **τίποτα** — απλό `<input>` | — |
| `InboxComposeInput` | τίποτα | — |
| `/` slash commands | **πουθενά** δεν υπάρχει | — |

Ο χρήστης ζητά: σε **όλα τα input** όπου γράφει, με `@` ή `/` να βρίσκει **πάντα** τα ίδια entities (people, projects, tasks, contracts, deliverables, invoices, campaigns, tenders, clients, files, emails, wiki articles).

## Λύση: Ένα Universal Component

Φτιάχνουμε **`<MentionTextarea>`** ως ενιαίο component που αντικαθιστά και τις 3+ υπάρχουσες υλοποιήσεις. Τοποθετείται σε **όλα** τα input points.

```text
src/components/mentions/
├── useMentionSearch.ts        ← React Query hook με debounce + 6h cache
├── mentionRegistry.ts         ← Type definitions + colors + icons + table mapping
├── MentionTextarea.tsx        ← Universal textarea wrapper (auto-grow)
├── MentionPopover.tsx         ← Dropdown UI (grouped by type, keyboard nav)
├── MentionChip.tsx            ← Render για display (read-only με click-to-navigate)
└── parseMentions.ts           ← Server-friendly parser για το serialized format
```

### Σύνταξη (single source of truth)

```text
@[Όνομα](type:id)        ← mention ενός entity
/[command](payload)      ← slash command (action)
```

Παράδειγμα μηνύματος μετά από input:
```
Συζητώντας με @[Γιάννη](user:abc-123) για το @[Project Apollo](project:def-456),
έκλεισα το @[Contract #2024-08](contract:ghi-789). Δες /summary(today).
```

## Entities που υποστηρίζονται

Όλα query-able από τη βάση με ενιαίο interface:

| Type | Πίνακας | Πεδία αναζήτησης | Icon |
|------|---------|------------------|------|
| `user` | `profiles` | `full_name, email` | User |
| `project` | `projects` | `name` | FolderKanban |
| `task` | `tasks` | `title` | CheckSquare |
| `client` | `clients` | `name, contact_email` | Building2 |
| `contract` | `contracts` + `project_contracts` | `title, contract_type` | FileSignature |
| `deliverable` | `deliverables` | `name` | Package |
| `invoice` | `invoices` | `invoice_number, notes` | Receipt |
| `campaign` | `campaigns` | `name` | Megaphone |
| `tender` | `tenders` | `name` | Gavel |
| `file` | `file_attachments` | `file_name` | File |
| `email` | `email_messages` (group by thread) | `subject, from_*` | Mail |
| `wiki` | `kb_articles` | `title` | BookOpen |

Όλα φιλτράρονται με **company_id** (multi-tenant), respect σε RLS.

## Slash Commands (`/`)

Μόνο σε **AI chats** (Secretary, Quick, Sidebar Chat) — όχι σε comments/inbox.

| Command | Action |
|---------|--------|
| `/summary` | Δημιουργεί σύνοψη ημέρας/εβδομάδας |
| `/task` | Άνοιγμα task creation flow |
| `/find` | Καθαρή αναζήτηση χωρίς AI |
| `/calendar` | Εμφανίζει σημερινό schedule |
| `/help` | Λίστα όλων |

Το set έρχεται από registry, εύκολα επεκτάσιμο.

## Hook: `useMentionSearch(query, opts)`

```text
- Debounce 200ms
- Παράλληλα queries σε όλους τους πίνακες (Promise.all)
- React Query cache (staleTime 5min)
- opts.types?: filter by allowed types (π.χ. comments → μόνο 'user')
- opts.companyId: scoping
- Returns: { results: GroupedResults, loading: boolean }
```

## Integration plan ανά σημείο

| Σημείο | Πριν | Μετά |
|--------|------|------|
| `src/components/chat/ChatMessageInput.tsx` | custom textarea + παλιό MentionInput | `<MentionTextarea>` με όλα τα types |
| `src/components/secretary/MentionInput.tsx` | local impl | proxy → `<MentionTextarea>` με `enableSlash` |
| `src/components/secretary/SecretaryChat.tsx` | inline textarea (γρ. 630) | `<MentionTextarea enableSlash>` |
| `src/components/quick-chat/QuickChatBar.tsx` | plain `<input>` (γρ. 543) | `<MentionTextarea enableSlash compact>` |
| `src/components/comments/CommentsSection.tsx` | local MentionTextarea (γρ. 99-213) | `<MentionTextarea types={['user']}>` (διατηρεί behavior) |
| `src/components/inbox/InboxComposeInput.tsx` | plain Textarea (γρ. 156) | `<MentionTextarea>` στο body |
| `ChatThread.tsx` (αν στέλνει μηνύματα) | check & migrate | `<MentionTextarea>` |

## Display των mentions

Φτιάχνουμε **`<MentionRenderer text={...}>`** που:
- Parse-άρει `@[name](type:id)` και `/[cmd](payload)`
- Render-άρει inline chips (color-coded ανά type)
- Click → navigate στο σωστό route (π.χ. `project:xxx` → `/projects/xxx`)
- Tooltip με preview (όνομα + type + status)

Χρησιμοποιείται σε:
- ChatMessageItem (μηνύματα chat)
- CommentsSection (renderCommentContent)
- SecretaryChat message rendering
- Inbox message body
- Όπου αλλού δείχνουμε user-generated content

## Backend awareness

Τα Edge Functions ήδη γνωρίζουν το format `@[name](type:id)` (γρ. 2207 στο `secretary-agent`). Επεκτείνουμε:

- `parseMentions(text)` helper στο shared `_shared/mentions.ts` (Deno)
- Όταν το AI λάβει mentions → auto-fetch το αντίστοιχο entity context πριν την απάντηση (π.χ. mention contract → φέρνει contract details, parties, dates)
- Notifications: αν user mention σε comment/chat → δημιουργείται `notifications` row για τον αναφερόμενο

## UX leverages

- **Keyboard**: `↑↓` navigation, `Enter`/`Tab` insert, `Esc` close, `@` ή `/` ξανά για re-trigger
- **Grouped popover**: Όλα τα results γκρουπαρισμένα ανά type με headers (όπως Linear/Slack)
- **Recents**: Top 3 πιο πρόσφατα mentions του χρήστη φαίνονται όταν `@` πατηθεί χωρίς query
- **Empty state**: αν query > 1 char και 0 results → "Πρόσθεσε νέο…" CTA (όπου έχει νόημα)
- **Loading skeleton**: shimmer rows όσο ψάχνει
- **Mobile**: popover γίνεται bottom sheet σε <640px

## Edge cases

- Text μέσα σε email (`user@example.com`) → δεν ενεργοποιείται popover (regex απαιτεί whitespace πριν)
- Stripping σε email subjects/SMS exports → `parseMentions(text, { format: 'plain' })` βγάζει μόνο τα labels
- RLS: queries επιστρέφουν μόνο entities που ο user βλέπει — δεν διαρρέει info

## Αρχεία

| Ενέργεια | Αρχείο |
|----------|--------|
| **Νέο** | `src/components/mentions/mentionRegistry.ts` |
| **Νέο** | `src/components/mentions/useMentionSearch.ts` |
| **Νέο** | `src/components/mentions/MentionTextarea.tsx` |
| **Νέο** | `src/components/mentions/MentionPopover.tsx` |
| **Νέο** | `src/components/mentions/MentionRenderer.tsx` |
| **Νέο** | `src/components/mentions/parseMentions.ts` |
| **Νέο** | `supabase/functions/_shared/mentions.ts` |
| **Refactor** | `src/components/chat/ChatMessageInput.tsx` (αντικατάσταση) |
| **Refactor** | `src/components/chat/ChatMessageItem.tsx` (renderer) |
| **Refactor** | `src/components/secretary/SecretaryChat.tsx` (textarea) |
| **Refactor** | `src/components/secretary/MentionInput.tsx` (γίνεται wrapper) |
| **Refactor** | `src/components/quick-chat/QuickChatBar.tsx` (input → textarea) |
| **Refactor** | `src/components/comments/CommentsSection.tsx` (local → universal) |
| **Refactor** | `src/components/inbox/InboxComposeInput.tsx` (body field) |
| **Διαγραφή** | `src/components/chat/MentionInput.tsx` (αντικατάσταση από νέο) |
| **Update** | `supabase/functions/secretary-agent/index.ts` (use shared parser, auto-fetch context) |
| **Update** | `supabase/functions/quick-chat-gemini/index.ts` (ίδιο) |

## Τι ΔΕΝ αλλάζει

- DB schemas (όλα τα entities ήδη υπάρχουν)
- AI model selector (Claude/Gemini/GPT routing)
- Voice commands, file processing, conversation history
- Comments business logic (μόνο το input UI αλλάζει)

## Migration ασφάλεια

- Backwards-compatible: παλιά messages με `@Όνομα` (plain) εξακολουθούν να φαίνονται κανονικά (ο renderer fallback-άρει σε plain text αν δεν matchάρει `@[]()`)
- Συνταξη `@[name](type:id)` ήδη γνωστή στο secretary-agent → δεν σπάει nothing

