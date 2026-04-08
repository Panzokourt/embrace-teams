

# Ενοποίηση Οικονομικών Έργου — Μία Ενιαία Σελίδα

## Πρόβλημα

4 sub-tabs με μεγάλη επικάλυψη:
- **Budget Overview**: KPI cards (budget, invoiced, paid, expenses) + progress bars
- **Τιμολόγια & Έξοδα**: Τα ίδια summary cards + CRUD λίστα τιμολογίων/εξόδων
- **P&L Report**: Ξανά τα ίδια KPIs + P&L statement + Budget vs Actual + ανά παραδοτέο

Ο χρήστης βλέπει τα ίδια νούμερα σε 3 διαφορετικά tabs. Η μόνη πραγματικά μοναδική λειτουργικότητα είναι: ο stepper, η λίστα τιμολογίων/εξόδων, και το P&L breakdown.

## Λύση — Ενιαία σελίδα χωρίς sub-tabs

Αφαιρούμε τα sub-tabs και δημιουργούμε μία ροή:

```text
┌─────────────────────────────────────────────┐
│  STEPPER (Κοστολόγηση → ... → Είσπραξη)     │
├─────────────────────────────────────────────┤
│  4 KPI Cards (Budget | Έσοδα | Έξοδα | Κέρδος) │
├─────────────────────────────────────────────┤
│  Budget Progress Bars (2)                    │
├─────────────────────────────────────────────┤
│  Τιμολόγια (λίστα + CRUD)                   │
├─────────────────────────────────────────────┤
│  Έξοδα (λίστα + CRUD)                       │
├─────────────────────────────────────────────┤
│  P&L Statement (collapsible)                 │
└─────────────────────────────────────────────┘
```

### Τι κρατάμε
- **Stepper** — ως έχει, πάνω-πάνω
- **4 KPI cards** — ένα μόνο σετ (Budget, Εισπράξεις, Έξοδα, Κέρδος/Margin)
- **2 Progress bars** — budget utilization + collection rate
- **Τιμολόγια λίστα** — CRUD (από ProjectFinancialsManager)
- **Έξοδα λίστα** — CRUD (από ProjectFinancialsManager)
- **P&L Statement** — collapsible section στο τέλος (summary + ανά κατηγορία εξόδων)

### Τι αφαιρούμε
- Όλα τα duplicate KPI cards (Budget Overview + Τιμολόγια summary + P&L summary)
- Budget vs Actual tab (ενσωματώνεται στα progress bars)
- Ανά Παραδοτέο tab (τα παραδοτέα έχουν ήδη δικό τους tab στο project)
- Τα nested tabs μέσα στο P&L

## Αλλαγές αρχείων

| Αρχείο | Αλλαγή |
|--------|--------|
| `ProjectFinancialsHub.tsx` | Αφαίρεση tabs, ενιαία ροή: Stepper → KPIs → Progress → Invoices/Expenses → P&L |
| `ProjectFinancialsManager.tsx` | Αφαίρεση summary cards (εμφανίζονται στο Hub), export μόνο τις λίστες |
| `ProjectPLReport.tsx` | Απλοποίηση: μόνο P&L statement section, χωρίς KPIs/tabs |

