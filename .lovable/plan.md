
# Media Plan — 6 Βελτιώσεις

## Ανάλυση τρέχουσας κατάστασης

Έχω διαβάσει ολόκληρο το `ProjectMediaPlan.tsx` (1530 γραμμές) και το `generate-media-plan` edge function. Εντόπισα ακριβώς τι πρέπει να αλλάξει:

---

## Πρόβλημα 1: AI κατανέμει περισσότερο από το net budget

**Αιτία**: Στο edge function, το prompt λέει να χρησιμοποιεί το net budget (`€${Math.round(netBudget)}`) αλλά το AI το παραβλέπει. Επίσης, δεν γίνεται καμία server-side επικύρωση/normalization μετά τη γέννηση.

**Λύση (2 επίπεδα)**:
1. **Edge function**: Μετά το parsing του AI response, normalize το budget: αν `Σ(items.budget) > netBudget`, scale down αναλογικά όλα τα items. Αυτό διασφαλίζει 100% ότι δεν θα ξεπεραστεί ποτέ το όριο, ανεξαρτήτως τι βγάλει το AI.
2. **Prompt**: Προσθήκη ακόμα πιο αυστηρής οδηγίας (`CRITICAL: Sum of all budget values MUST be EXACTLY €X`) και παράδειγμα budget allocation.

```typescript
// Μετά το parse, στο edge function:
const totalAI = result.mediaPlanItems.reduce((s, i) => s + (i.budget || 0), 0);
if (totalAI > netBudget * 1.01) { // 1% tolerance
  const scale = netBudget / totalAI;
  result.mediaPlanItems = result.mediaPlanItems.map(i => ({
    ...i,
    budget: Math.round(i.budget * scale),
  }));
}
```

---

## Πρόβλημα 2: Editable total budget + re-allocation

**Τρέχουσα κατάσταση**: Το budget είναι ήδη editable inline (`EditableCell` στη γραμμή ~1080). Αυτό που λείπει είναι ένα **"Re-allocate" κουμπί** δίπλα στο budget που να ανοίγει ένα dialog με sliders για να ανακατανείμει αναλογικά τα υπάρχοντα items.

**Λύση**: Νέο `ReAllocateModal` component:
- Δείχνει το νέο total budget
- Προτείνει αναλογική ανακατανομή (scale existing budgets)
- Ή επιτρέπει custom allocation ανά κανάλι/medium
- "Εφαρμογή" → update όλα τα items με batch update

---

## Πρόβλημα 3: "Actual Spent" Wizard

**Τι ζητείται**: Κουμπί "Καταχώρηση Actual" που ανοίγει wizard για bulk καταχώρηση πραγματικών εξόδων ανά medium item.

**Λύση**: Νέο `ActualSpentWizard` modal:
- Λίστα όλων των items (medium + campaign name + budget)
- Input για actual cost δίπλα σε κάθε item
- "Αποθήκευση Όλων" → batch update `actual_cost` σε όλα τα items
- Τοποθέτηση: νέο κουμπί "Actual Costs" στο header δίπλα στο "AI Wizard"

---

## Πρόβλημα 4: Φίλτρα + Grouping στον Πίνακα και Gantt

**Τρέχουσα κατάσταση**: Ο πίνακας κάνει groupBy medium πάντα. Το Gantt επίσης. Δεν υπάρχει καμία δυνατότητα φιλτραρίσματος.

**Λύση**: Προσθήκη toolbar πάνω από τον πίνακα/gantt:

```text
[Group by: Κανάλι ▼]  [Φάση: Όλες ▼]  [Objective: Όλα ▼]  [Κατηγορία ▼]  [🔍 Search]
```

- **Group by**: Κανάλι (medium) | Φάση (phase) | Objective | Κατηγορία (TV & Radio, Social, etc.)
- **Φίλτρο Φάση**: Multi-select από τις φάσεις που υπάρχουν στα items
- **Φίλτρο Objective**: Multi-select
- **Φίλτρο Κατηγορία**: TV & Radio / Digital Paid / Social / Outdoor / Print / Influencers/PR / Events
- **Search**: Free text search σε campaign_name και medium

State: `groupBy: 'medium' | 'phase' | 'objective' | 'category'`, `filterPhase: string[]`, `filterObjective: string[]`, `filterCategory: string`, `searchQuery: string`

Εφαρμογή και στο GanttView (pass filtered/grouped items).

---

## Πρόβλημα 5: Αφαίρεση εικονιδίων από κανάλια

**Τρέχουσα κατάσταση**: Τα εικονίδια (emoji) εμφανίζονται σε:
- `MEDIA_EMOJI` map (~γραμμές 106-115)
- `SpreadsheetRow` → `SelectCell` για medium (γραμμή 720: `${MEDIA_EMOJI[m] || ''} ${m}`)
- Group headers στον πίνακα (γραμμή 1250: `{MEDIA_EMOJI[medium] || '📌'} {medium}`)
- `GanttView` group headers (γραμμή 597: `{MEDIA_EMOJI[medium] || '📌'} {medium}`)
- `ProjectionsSection` (γραμμή 827)

**Λύση**: Αφαίρεση emoji από όλα τα παραπάνω. Ο `MEDIA_EMOJI` map παραμένει (χρησιμοποιείται αλλού για fallback) αλλά δεν γίνεται render πλέον. Αντικατάσταση με colored dot indicators ή απλά το text.

---

## Πρόβλημα 6: Responsive πίνακας + text wrapping

**Τρέχουσα κατάσταση**: 
- `min-w-[140px]`, `min-w-[120px]`, κλπ. στα `td` + `minWidth: '1100px'` στο table
- `truncate` class σε αρκετά cells που κόβει το text
- Το table overflow-x-auto δουλεύει αλλά δεν είναι ευχάριστο

**Λύση**:
1. Αφαίρεση `truncate` από "Καμπάνια" και "Placement" columns — επιτρέπεται wrapping
2. Μείωση `min-width` όπου δεν χρειάζεται (dates: 90px αντί 105px, status: 100px)
3. Στο table style: `table-layout: fixed` με συγκεκριμένα widths ανά column
4. `whitespace-normal` και `break-words` στα text cells
5. Column widths (approximate):
   - Καμπάνια: 180px (wrap)
   - Μέσο: 130px
   - Format: 90px (wrap)  
   - Φάση: 110px (wrap)
   - Objective: 100px
   - Έναρξη/Λήξη: 88px each
   - Budget/Net/Actual: 80px each (right-aligned, no-wrap)
   - Status: 110px
   - Actions: 32px

---

## Τεχνικές Λεπτομέρειες

### Αρχεία που αλλάζουν:

| Αρχείο | Αλλαγές |
|--------|---------|
| `supabase/functions/generate-media-plan/index.ts` | Budget normalization post-generation + αυστηρότερο prompt |
| `src/components/projects/ProjectMediaPlan.tsx` | Φίλτρα/grouping toolbar, ActualSpentWizard, ReAllocateModal, αφαίρεση emoji, responsive table |

### ReAllocate Modal λογική:
```typescript
// Scale all items proportionally to new budget
const scale = newBudget / currentAllocated;
items.forEach(item => {
  updateItem(item.id, 'budget', Math.round(item.budget * scale));
});
```

### Actual Spent Wizard state:
```typescript
interface ActualEntry { itemId: string; value: number; }
const [entries, setEntries] = useState<ActualEntry[]>(
  items.map(i => ({ itemId: i.id, value: i.actual_cost }))
);
```

### Filter/Group toolbar state (added to PlanDetailView):
```typescript
const [groupBy, setGroupBy] = useState<'medium' | 'phase' | 'objective' | 'category'>('medium');
const [filterPhase, setFilterPhase] = useState<string[]>([]);
const [filterObjective, setFilterObjective] = useState<string[]>([]);
const [filterCategory, setFilterCategory] = useState<string>('all');
const [searchQuery, setSearchQuery] = useState('');
```

### Grouping logic:
```typescript
const getCategory = (medium: string) => {
  return Object.entries(MEDIA_CATEGORIES).find(([, mediums]) => mediums.includes(medium))?.[0] || 'Άλλο';
};

const displayedItems = useMemo(() => {
  let result = items;
  if (searchQuery) result = result.filter(i => 
    i.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.medium.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (filterPhase.length > 0) result = result.filter(i => filterPhase.includes(i.phase || ''));
  if (filterObjective.length > 0) result = result.filter(i => filterObjective.includes(i.objective));
  if (filterCategory !== 'all') result = result.filter(i => getCategory(i.medium) === filterCategory);
  return result;
}, [items, searchQuery, filterPhase, filterObjective, filterCategory]);

const groupedItems = useMemo(() => {
  const groups: Record<string, MediaPlanItem[]> = {};
  displayedItems.forEach(item => {
    const key = groupBy === 'medium' ? item.medium
      : groupBy === 'phase' ? (item.phase || 'Χωρίς Φάση')
      : groupBy === 'objective' ? item.objective
      : getCategory(item.medium);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}, [displayedItems, groupBy]);
```

Δεν χρειάζεται migration — όλες οι αλλαγές είναι frontend + edge function μόνο.
