

# Αναδιάρθρωση Sidebar Navigation & Project Folders

## Επισκόπηση

Μετατροπή του sidebar σε **ιεραρχικό navigation** με expandable sections, αφαίρεση της Επισκόπησης, και δυνατότητα δημιουργίας φακέλων μέσα στα Έργα -- ένα σύστημα που θυμίζει file explorer.

---

## 1. Ιεραρχικό Sidebar Navigation

### "Εργασίες" με υποσελίδες
Το "Εργασίες" γίνεται expandable section στο sidebar:

```text
v Εργασίες
    Έργα
    Tasks
    Ημερολόγιο
```

- Κλικ στο "Εργασίες" expand/collapse τα children
- Κλικ στο "Έργα" πηγαίνει στο `/work?tab=projects`
- Κλικ στο "Tasks" πηγαίνει στο `/work?tab=tasks`
- Κλικ στο "Ημερολόγιο" πηγαίνει στο `/work?tab=calendar`
- Αφαίρεση του tab "Επισκόπηση" από τη σελίδα Work

### "Έργα" με live project tree
Μέσα στο sub-item "Έργα", τα ενεργά projects εμφανίζονται σαν tree nodes:

```text
v Εργασίες
    v Έργα
        [+] Νέος Φάκελος
        v Cosmote
            Cosmote Rebranding
            Cosmote SEO
        Alpha Bank App Launch
        EDYTE
    Tasks
    Ημερολόγιο
```

- Κλικ σε project navigates στο `/projects/:id`
- Φάκελοι ομαδοποιούν projects (π.χ. ανά πελάτη ή θεματικά)
- Drag & drop projects μέσα σε φακέλους
- Context menu (δεξί κλικ / "...") για μετονομασία/διαγραφή φακέλου

---

## 2. Database -- Project Folders

### Νέος πίνακας `project_folders`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| id | uuid PK | |
| company_id | uuid | |
| parent_folder_id | uuid, nullable | Για nested folders |
| name | text | Όνομα φακέλου |
| color | text, nullable | Χρώμα εικονιδίου |
| sort_order | integer, default 0 | Σειρά εμφάνισης |
| created_at | timestamptz | |

### Νέα στήλη στο `projects`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| folder_id | uuid, nullable FK -> project_folders | Σε ποιον φάκελο ανήκει |

### RLS
- SELECT: active users στο ίδιο company
- INSERT/UPDATE/DELETE: admin/manager

---

## 3. Sidebar Component -- Collapsible Nav

### Νέο component: `SidebarNavGroup`
Αντικαθιστά το flat `SidebarLink` για items με children:

- Chevron icon (expand/collapse)
- Expanded state αποθηκεύεται στο localStorage
- Indentation ανά επίπεδο (padding-left)
- Active state: highlight αν κάποιο child route είναι active

### Νέο component: `SidebarProjectTree`
Μικρό tree μέσα στο sidebar που φορτώνει:
- `project_folders` (ιεραρχικά)
- `projects` (ενεργά, grouped by folder)
- Inline "+" για νέο φάκελο
- Context menu για rename/delete/move

---

## 4. Work Page -- Αφαίρεση Επισκόπησης

- Αφαίρεση του tab "Επισκόπηση" και του `WorkOverview` component
- Τα tabs γίνονται 3: Έργα, Tasks, Ημερολόγιο
- Αφαίρεση header/subtitle (αφού πλέον η πλοήγηση γίνεται από sidebar)

---

## 5. Προτεινόμενες Επιπλέον Λειτουργίες

1. **Pinned Projects**: Δυνατότητα "pin" αγαπημένων projects που εμφανίζονται πάντα στην κορυφή του tree
2. **Αυτόματη ομαδοποίηση**: Επιλογή "Group by Client" που δημιουργεί αυτόματα φακέλους ανά πελάτη
3. **Badge counts**: Μικρά badges δίπλα σε κάθε sub-item (π.χ. "Tasks (5)" για εκκρεμή tasks)
4. **Drag & drop reorder**: Αναδιάταξη projects και folders με drag

---

## Αρχεία που Δημιουργούνται / Αλλάζουν

| Αρχείο | Αλλαγή |
|--------|--------|
| **Migration SQL** | Πίνακας `project_folders` + στήλη `projects.folder_id` + RLS |
| `src/components/layout/AppSidebar.tsx` | Ιεραρχικό nav με collapsible groups |
| `src/components/layout/SidebarNavGroup.tsx` | **Νέο** -- Expandable nav group component |
| `src/components/layout/SidebarProjectTree.tsx` | **Νέο** -- Project tree με folders |
| `src/pages/Work.tsx` | Αφαίρεση Επισκόπησης tab |
| `src/App.tsx` | Cleanup routes αν χρειαστεί |

---

## Τεχνικές Σημειώσεις

- Τα expanded states του sidebar αποθηκεύονται σε localStorage (`sidebar-expanded-groups`)
- Το project tree φορτώνει μόνο active/lead/proposal projects (όχι completed/lost) για να μην είναι υπερβολικά μεγάλο
- Σε collapsed sidebar, τα sub-items εμφανίζονται ως popover/tooltip
- Η αναζήτηση projects στο sidebar γίνεται client-side (filter στα ήδη φορτωμένα)

