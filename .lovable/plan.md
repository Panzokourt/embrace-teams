## Στόχος

Όταν ο χρήστης πατάει **Settings** στο rail sidebar, να μην εμφανίζεται flyout/submenu (General, Organization, Workflows, Integrations, Billing, Security). Αντί αυτού, να φορτώνεται απευθείας η ενοποιημένη σελίδα `/settings`, που ήδη έχει όλες τις υποκατηγορίες οργανωμένες σε ομάδες (Λογαριασμός, Προσωποποίηση, Εταιρεία, Δεδομένα & Ενσωματώσεις, Βοήθεια). Τα Workflows θα προστεθούν ως νέα υποκατηγορία μέσα στο Settings page.

## Αλλαγές

### 1. `src/components/layout/AppSidebar.tsx`
- Άδειασμα του `categoryNavItems.settings` (γίνεται `[]`), ώστε το Settings να συμπεριφέρεται σαν standalone rail item — όπως το Files.
- Αφαίρεση του `/workflows` από το `routePrefixes` του Settings category (μένει μόνο `/settings`), και αντίστοιχη αφαίρεση από το `detectCategory`.
- Click στο Settings rail icon → navigate απευθείας στο `/settings`, χωρίς flyout. (Το auto-collapse logic ήδη χειρίζεται κενές κατηγορίες.)

### 2. `src/pages/Settings.tsx`
- Προσθήκη νέου section `workflows` στο group **Δεδομένα & Ενσωματώσεις** (ή νέο group αν προτιμάς), με icon `GitBranch`.
- Το section θα φορτώνει ένα νέο component wrapper (βλ. #3) που εμβολιάζει το υπάρχον περιεχόμενο του `/workflows`.

### 3. `src/components/settings/sections/WorkflowsSection.tsx` (νέο)
- Λεπτό wrapper που κάνει render το ίδιο περιεχόμενο που σήμερα ζει στο `src/pages/Workflows.tsx`, χωρίς το `PageHeader` (γιατί το Settings layout έχει δικό του header).

### 4. Routing (`src/App.tsx`)
- Η route `/workflows` παραμένει για backward-compatibility αλλά γίνεται **redirect** στο `/settings?section=workflows` (όπως ήδη γίνεται για org/billing/security σύμφωνα με το memory "Settings Hub Architecture").

## Τι ΔΕΝ αλλάζει

- Το ίδιο το Settings page UI (sections, layout, content).
- Οι existing redirect routes `/settings/organization`, `/settings/billing`, `/settings/security`, `/settings/integrations`.
- Permissions και RBAC για κάθε section.
- Άλλα rail categories.

## Αποτέλεσμα

```text
ΠΡΙΝ:                              ΜΕΤΑ:
[Settings rail] → flyout panel     [Settings rail] → /settings (direct)
  ├ General                          └ Sidebar του Settings page
  ├ Organization                       με όλες τις υποκατηγορίες
  ├ Workflows                          + νέα: Workflows
  ├ Integrations
  ├ Billing
  └ Security
```
