
# Comments Section με @Mentions & Activity History στην Καρτέλα Έργου

## Τι υπάρχει ήδη

Υπάρχει ένα `CommentsSection` component (`src/components/comments/CommentsSection.tsx`) που:
- Φέρνει σχόλια από τον πίνακα `comments` (project_id / task_id / deliverable_id)
- Εμφανίζει avatar, όνομα, χρόνο, edit/delete για τον συγγραφέα
- **Δεν υποστηρίζει**: @mentions, rendering highlights, history/activity log, full-page tab

Το `ProjectDetail.tsx` **δεν έχει** ακόμα tab "Comments" — αυτό θα προσθέσουμε.

---

## Τι θα φτιάξουμε

### 1. Αναβαθμισμένο `CommentsSection` με @Mentions

**Textarea με mention detection**: Όταν ο χρήστης γράψει `@`, εμφανίζεται floating dropdown με λίστα χρηστών που έχουν πρόσβαση στο έργο. Επιλογή χρήστη → εισάγεται `@full_name` στο κείμενο.

**Rendering των mentions**: Το κείμενο του σχολίου αναλύεται για patterns `@Όνομα Χρήστη` και τα mentions εμφανίζονται ως χρωματιστά badges/chips (π.χ. `@Γιώργος Παπαδόπουλος` → μπλε badge).

**Αποθήκευση**: Το `content` αποθηκεύεται ως plain text με `@full_name` — δεν χρειάζεται αλλαγή στη βάση.

```text
┌─────────────────────────────────────────────────────┐
│  Γράψτε ένα σχόλιο...                               │
│                                                     │
│  @Γιώ...                                            │
│  ┌────────────────────────────┐                     │
│  │ 👤 Γιώργος Παπαδόπουλος  │  ← floating popup   │
│  │ 👤 Γιώτα Νικολάου         │                     │
│  └────────────────────────────┘                     │
└─────────────────────────────────────────────────────┘
```

### 2. History/Activity Tab στο panel

Το νέο tab "Comments & Activity" θα έχει 2 sub-views:
- **Σχόλια** (CommentsSection αναβαθμισμένο)
- **Ιστορικό** (Activity Log — υπάρχουσες εγγραφές από `activity_log` για το project)

```text
┌─────────────────────────────────────────────────────┐
│  [💬 Σχόλια (3)]  [📋 Ιστορικό]                     │
│  ─────────────────────────────────────────────────  │
│  Σχόλια view:                                        │
│  👤 Γιώργης • 14 Φεβ, 14:32                         │
│  Ελέγξτε @Μαρία Παπαδοπούλου το deliverable Α       │
│  → @Μαρία γίνεται μπλε badge                        │
│  [✎] [🗑]                                            │
│  ─────────────────────────────────────────────────  │
│  Ιστορικό view:                                      │
│  ⚡ Task "Σχεδιασμός" → "Ολοκληρώθηκε" • Γ.Π.       │
│  ⚡ Deliverable "Καμπάνια" δημιουργήθηκε • Μ.Ν.      │
│  ⚡ Προϋπολογισμός άλλαξε σε €15,000 • Γ.Π.          │
└─────────────────────────────────────────────────────┘
```

---

## Τεχνικές Αλλαγές

### Αρχείο 1: `src/components/comments/CommentsSection.tsx` — Πλήρης αναβάθμιση

**Νέο state & logic**:
```typescript
const [mentionQuery, setMentionQuery] = useState('');        // το string μετά το @
const [mentionAnchor, setMentionAnchor] = useState<number>(-1); // cursor position
const [showMentionDropdown, setShowMentionDropdown] = useState(false);
const [projectUsers, setProjectUsers] = useState<Profile[]>([]); // για το dropdown
```

**`handleTextChange`**: Ανιχνεύει αν ο cursor βρίσκεται μετά από `@` (χωρίς space) και ενεργοποιεί το dropdown.

**`insertMention(user)`**: Αντικαθιστά το `@query` με `@full_name ` στο textarea.

**`renderCommentContent(content)`**: 
```typescript
// Splits text on @mentions, wraps them in styled spans
const parts = content.split(/(@[\w\sΆ-ώά-ω]+)/g);
return parts.map(part => 
  part.startsWith('@') 
    ? <span className="text-primary font-medium bg-primary/10 px-1 rounded">{part}</span>
    : part
);
```

**Mention Dropdown**: Absolute-positioned div κάτω από το textarea, φιλτράρει `projectUsers` βάσει `mentionQuery`.

**Fetch project users**: Νέο prop `projectId` (ήδη υπάρχει) → query `project_user_access + profiles` για να φέρει τους χρήστες με πρόσβαση στο project.

### Αρχείο 2: `src/pages/ProjectDetail.tsx` — Νέο Tab

Προσθήκη tab "Σχόλια & Ιστορικό" με δύο sub-tabs (Radix Tabs εσωτερικά):

```typescript
// Στο TabsList:
<TabsTrigger value="comments">
  <MessageSquare className="h-4 w-4 mr-1.5" />
  Σχόλια
</TabsTrigger>

// Νέο TabsContent:
<TabsContent value="comments">
  <ProjectCommentsAndHistory projectId={project.id} />
</TabsContent>
```

### Αρχείο 3: Νέο `src/components/projects/ProjectCommentsAndHistory.tsx`

Wrapper component με εσωτερικά tabs:
- **Tab "Σχόλια"**: `<CommentsSection projectId={projectId} />` (αναβαθμισμένο)
- **Tab "Ιστορικό"**: Query `activity_log` φιλτραρισμένο με `entity_id = projectId` + activity logs για tasks/deliverables του project

```typescript
// Activity log query:
const { data } = await supabase
  .from('activity_log')
  .select('*, profiles:user_id(full_name, email)')
  .or(`entity_id.eq.${projectId},and(entity_type.eq.task,...)`)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Εμφάνιση activity**:
- Εικονίδιο ανά `entity_type` (task → CheckSquare, deliverable → Package, project → FolderOpen)
- Verb ανά `action` (created → "δημιουργήθηκε", updated → "ενημερώθηκε", deleted → "διαγράφηκε")
- Timestamp σχετικός (π.χ. "πριν 2 ώρες")

---

## Αρχεία που αλλάζουν

| Αρχείο | Τύπος αλλαγής |
|--------|---------------|
| `src/components/comments/CommentsSection.tsx` | Αναβάθμιση: @mentions detection, dropdown, render highlights, fetch project users |
| `src/components/projects/ProjectCommentsAndHistory.tsx` | **Νέο αρχείο** — wrapper με tabs: Comments + Activity History |
| `src/pages/ProjectDetail.tsx` | Προσθήκη tab "Σχόλια" + import |

**Δεν χρειάζεται migration** — το `content` text field στα `comments` χωράει ήδη @mentions ως plain text.

---

## UX Λεπτομέρειες

- **Mentions**: Πατώντας `Escape` ή `space` κλείνει το dropdown χωρίς εισαγωγή
- **Keyboard navigation**: ↑↓ για navigation στο dropdown, `Enter` για επιλογή
- **Edit mode**: Το edit textarea υποστηρίζει κι αυτό @mentions
- **History**: Εμφανίζεται ιστορικό μόνο για αλλαγές που σχετίζονται με το έργο (project + tasks + deliverables)
- **Relative time**: "πριν 2 ώρες", "χθες", "14 Φεβ" (χρησιμοποιώντας `formatDistanceToNow` από date-fns)
- **Realtime**: Το history ενημερώνεται και αυτό σε realtime (υπάρχει ήδη το `activity_log` realtime subscription)
