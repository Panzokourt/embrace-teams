
## Full-Width Responsive Layout

### Προβλημα
Ολες οι σελιδες εχουν `max-w-7xl mx-auto` (1280px) η `max-w-6xl` (1152px) που περιοριζει το πλατος του περιεχομενου, αφηνοντας κενο στις μεγαλες οθονες.

### Λυση
Αφαιρεση των `max-w-*` και `mx-auto` περιορισμων απο ολα τα page containers, ωστε το περιεχομενο να καλυπτει ολο το διαθεσιμο πλατος.

### Αλλαγες ανα αρχειο

Σε καθε σελιδα, η κυρια wrapper div αλλαζει απο:
```text
"p-6 lg:p-8 space-y-6 max-w-7xl mx-auto"
```
σε:
```text
"p-6 lg:p-8 space-y-6"
```

Αρχεια που θα τροποποιηθουν:

| Αρχειο | Τρεχον max-width |
|--------|-----------------|
| Dashboard.tsx | max-w-7xl (2 σημεια) |
| Tasks.tsx | max-w-7xl |
| Projects.tsx | max-w-7xl |
| Tenders.tsx | max-w-7xl |
| Clients.tsx | max-w-7xl |
| Calendar.tsx | max-w-7xl |
| UserDetail.tsx | max-w-6xl |
| ClientDetail.tsx | max-w-6xl |
| Settings.tsx | max-w-4xl |

Τα υπολοιπα (OrgChart, Users, UsersAccess, Teams, Financials, Files, Departments) δεν εχουν max-width περιορισμο, αρα ειναι ηδη OK.

### Τεχνικες Λεπτομερειες

- Αφαιρουνται μονο τα `max-w-*` και `mx-auto` απο τα page-level containers
- Τα εσωτερικα `max-w-` (π.χ. σε search inputs, dialogs, empty state text) παραμενουν ως εχουν
- Η αλλαγη ειναι καθαρα CSS, χωρις αλλαγη λογικης
- Ο `App.css` εχει `max-width: 1280px` στο `#root` που επισης πρεπει να αφαιρεθει
