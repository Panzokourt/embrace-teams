

# Brain: Deep Dive + Auto-Create + Fix Market/Neuro Insights

## Προβλημα με Market & Neuro Insights

Η ανάλυση βγάζει σωστά insights αλλά ο AI δεν δημιουργεί insights με κατηγορίες `market` και `neuro`. Αν και τα neuro tactics εφαρμόζονται σωστά σε κάθε insight (loss aversion, anchoring κλπ), λείπουν αυτόνομα insights τύπου "Market News" (ειδήσεις αγοράς) και "Neuro" (ψυχολογικές τακτικές πώλησης).

**Fix**: Ενισχύω το prompt στο `brain-analyze` ώστε να απαιτεί ρητά τουλάχιστον 1 `market` και 1 `neuro` insight, με σαφείς οδηγίες τι σημαίνει κάθε κατηγορία.

---

## Νέες Δυνατότητες

### 1. Deep Dive Analysis (Αναλυσε Περισσότερο)

Κάθε insight card αποκτά κουμπί **"Ανάλυση"** που:
- Καλεί νέο edge function `brain-deep-analyze`
- Στέλνει το insight + evidence entities
- Το AI κάνει εστιασμένη βαθιά ανάλυση
- Επιστρέφει extended report + action plan + suggested project/task data
- Εμφανίζεται σε Dialog με markdown report

### 2. Auto-Create Project / Task

Κάθε insight card αποκτά dropdown **"Δημιούργησε..."** με:
- **Νέο Έργο**: Pre-filled form (name, description, client, budget) βάσει AI suggestion
- **Νέο Task**: Pre-filled form (title, description, priority) βάσει AI suggestion
- Insert στη βάση + navigate στο νέο entity

---

## Τεχνικές Λεπτομέρειες

### Νέα Αρχεία

| Αρχείο | Περιγραφή |
|--------|-----------|
| `supabase/functions/brain-deep-analyze/index.ts` | Edge function: δέχεται insight, φέρνει related data, καλεί Gemini + Perplexity για deep analysis, επιστρέφει extended_analysis + action_plan + suggested_project + suggested_task |
| `src/components/brain/BrainDeepDiveDialog.tsx` | Dialog: loading animation, markdown report, action plan steps, κουμπιά create project/task |
| `src/components/brain/BrainCreateActionDialog.tsx` | Dialog: form toggle Project/Task, pre-filled fields, insert to DB |

### Τροποποιήσεις

| Αρχείο | Αλλαγή |
|--------|--------|
| `supabase/functions/brain-analyze/index.ts` | Fix prompt: ρητή απαίτηση market + neuro insights, fix auth (getClaims -> getUser), βελτιωμένες οδηγίες ανά κατηγορία |
| `src/components/brain/BrainInsightCard.tsx` | Νέα κουμπιά: "Ανάλυση" + dropdown "Δημιούργησε..." (Έργο / Task), νέα props onDeepDive, onCreateProject, onCreateTask |
| `src/pages/Brain.tsx` | Handlers deep dive + create, state management dialogs, edge function call |
| `supabase/config.toml` | Entry `[functions.brain-deep-analyze]` |

### Edge Function: brain-deep-analyze

```text
Input: { insight_id, insight }
1. Fetch evidence entities (clients, projects, tasks) by IDs
2. Call Perplexity for focused market research on insight topic
3. Call Gemini with:
   - Original insight + evidence data + market research
   - Request: extended_analysis (markdown), action_plan [{step, timeline}],
     suggested_project {name, description, client_id, budget},
     suggested_task {title, description, priority}
4. Return structured response
```

### BrainInsightCard - Νέα κουμπιά

Δίπλα στα υπάρχοντα Dismiss/Take Action προστίθενται:
- **Ανάλυση** (Microscope icon): triggers deep dive dialog
- **Δημιούργησε** (Plus icon, dropdown): "Νέο Έργο" ή "Νέο Task"

### BrainCreateActionDialog

- Toggle: Project / Task
- Project fields: name, description, client (select), budget, status=lead
- Task fields: title, description, priority, estimated hours
- Ολα pre-filled απο AI suggestions (αν υπάρχουν)
- Submit: insert to `projects` ή `tasks` table, navigate to entity

### Prompt Fix για Market & Neuro

Προσθήκη στο system prompt:
```text
MANDATORY CATEGORY DISTRIBUTION:
- At least 1 insight with category "market" (pure market news/trends from Perplexity data)
- At least 1 insight with category "neuro" (psychological selling tactics for specific clients)
- Category "market": External news, industry shifts, competitor moves - NOT internal data
- Category "neuro": Pure neuromarketing play - specific selling script using psychology
```

