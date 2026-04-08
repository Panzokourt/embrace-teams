

# Secretary ↔ Wiki ↔ Files ↔ Brain Integration

## Τι αλλάζει

Ο Secretary agent αποκτά 3 νέα tools που συνδέουν το Wiki (Knowledge Base), τα Files και το Brain σε ενιαίο context:

### Νέα Tools στο secretary-agent

**1. `search_wiki`** — Αναζήτηση στα kb_articles
- Ψάχνει τίτλους/tags/body με text matching
- Ο agent το καλεί αυτόματα όταν ο χρήστης ρωτάει κάτι σχετικό με γνώσεις, πολιτικές, διαδικασίες
- Επιστρέφει relevant articles με snippets

**2. `save_to_wiki`** — Αποθήκευση στο Wiki
- Δημιουργεί ή ενημερώνει kb_article από context (file analysis, Brain insight, συζήτηση)
- Ο agent μπορεί αυτόματα μετά από ανάλυση αρχείου να προτείνει "Θες να το αποθηκεύσω στο Wiki;"

**3. `list_project_files`** — Λίστα αρχείων project/folder
- Φέρνει αρχεία από `project_files` + `file_folders` για συγκεκριμένο project ή φάκελο
- Ο agent μπορεί να δώσει context για τα αρχεία ενός project

### System Prompt Ενημέρωση

Νέο section στο system prompt:

```
Wiki Integration:
- Αν ο χρήστης ρωτά για διαδικασίες, πολιτικές, know-how → κάλεσε search_wiki πρώτα
- Αν ανεβάζει αρχείο → μετά την ανάλυση, πρότεινε save_to_wiki
- Αν κάνεις Brain analysis → πρότεινε σύνδεση με σχετικά wiki articles
- Αν δεν βρεθεί στο wiki → πρότεινε δημιουργία νέου article

Files Integration:
- Μπορείς να δεις αρχεία project (list_project_files) 
- Μετά από file analysis, πρότεινε αποθήκευση στο Wiki
- Συνδύασε file context + wiki context + brain insights
```

### Cross-connections

| Από | Προς | Πώς |
|-----|-------|-----|
| File upload → | Wiki | Agent αναλύει, προτείνει save_to_wiki |
| File upload → | Brain | Ήδη υπάρχει μέσω save_memory |
| Wiki → | Brain | Agent κάνει search_wiki + get_brain_insights μαζί |
| Brain insight → | Wiki | Agent προτείνει save_to_wiki από insight |
| Ερώτηση χρήστη → | Wiki + Brain + Files | Agent κάνει search_wiki + recall_memory + list_project_files |

## Files

| File | Αλλαγή |
|------|--------|
| `supabase/functions/secretary-agent/index.ts` | +3 tool definitions (search_wiki, save_to_wiki, list_project_files), +3 executeTool cases, ενημέρωση system prompt |

