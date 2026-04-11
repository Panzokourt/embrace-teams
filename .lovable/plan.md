

# Navigation Restructure — Πλάνο Υλοποίησης

Αναδιάρθρωση του sidebar navigation από 7 flat κατηγορίες σε 10 domain-based, με workspace-aware visibility.

---

## Τι αλλάζει

### 1. AppSidebar.tsx — Κύριες αλλαγές

**CategoryId type**: Από 7 → 10 κατηγορίες
```
work | clients | marketing | creative | development | finance | operations | intelligence | communication | settings
```

**Categories array**: Νέες κατηγορίες `marketing`, `creative`, `development`, `finance` (αντί `revenue`).

**categoryNavItems**: Πλήρες restructure:
- `marketing`: Campaigns, Media Planning, Briefs, Blueprints, Reports
- `creative`: Briefs, Campaigns, Files & Assets
- `development`: Projects, Backlog, Workflows, Tenders
- `finance`: Dashboard, Pricing, Contracts, Invoices, Expenses, Profitability (αντικαθιστά `revenue`)
- `clients`: Προσθήκη Tenders + Client Portal
- `operations`: Προσθήκη Capacity + Leaderboard
- `settings`: Προσθήκη Integrations + Billing

**detectCategory**: Update για νέα route mappings.

**Work category panel**: Αφαίρεση Campaigns, Backlog, Workflows, Media Planning (μετακινούνται σε marketing/development).

**Workspace visibility**: Κρύβει κατηγορίες ανά workspace type (π.χ. freelancer δεν βλέπει marketing/creative/development/operations).

### 2. AuthContext.tsx — Μικρή αλλαγή

- Προσθήκη `workspace_type` στο `Company` interface
- Κατά το `selectCompany`, αποθήκευση `workspace_type` στο localStorage

### 3. OnboardingWorkspacePreset.tsx — Μικρή αλλαγή

- Προσθήκη `localStorage.setItem('workspace_type', ...)` μετά το save

### 4. Νέα imports

Προσθήκη `Megaphone`, `Code2` στα lucide-react imports.

---

## Αρχεία που τροποποιούνται

| Αρχείο | Αλλαγή |
|--------|--------|
| `src/components/layout/AppSidebar.tsx` | Κύρια αναδιάρθρωση |
| `src/contexts/AuthContext.tsx` | Company interface + localStorage sync |
| `src/components/onboarding/OnboardingWorkspacePreset.tsx` | localStorage save |

Δεν αλλάζει κανένα route στο App.tsx — μόνο sidebar navigation.

