

# Οικονομικός Κύκλος Ζωής Έργου (Project Financial Lifecycle)

## Ιδέα

Ένα νέο σύστημα **Financial Milestones** ανά έργο, που καταγράφει τα στάδια: **Κοστολόγηση → Προσφορά → Ανάθεση → Παράδοση → Τιμολόγηση → Είσπραξη**, με timestamps και μετρήσεις χρόνου μεταξύ τους. Ενσωματώνεται στο υπάρχον `ProjectFinancialsHub` ως νέο tab και στο overview ως visual stepper.

## Database

### Νέος πίνακας: `project_financial_milestones`

```text
id              UUID PK
project_id      UUID FK → projects (NOT NULL)
company_id      UUID FK → companies (NOT NULL)

-- Κάθε milestone = μία ημερομηνία + optional metadata
costing_at          TIMESTAMPTZ  -- πότε ολοκληρώθηκε η κοστολόγηση
costing_amount      NUMERIC      -- κόστος εκτίμησης
costing_notes       TEXT

proposal_sent_at    TIMESTAMPTZ  -- πότε στάλθηκε η προσφορά
proposal_amount     NUMERIC      -- ποσό προσφοράς
proposal_reference  TEXT         -- αρ. προσφοράς

proposal_accepted_at TIMESTAMPTZ -- πότε εγκρίθηκε η προσφορά
proposal_rejected_at TIMESTAMPTZ -- αν απορρίφθηκε

delivery_at         TIMESTAMPTZ  -- πότε παραδόθηκε το έργο
delivery_notes      TEXT

invoiced_at         TIMESTAMPTZ  -- πότε εκδόθηκε τιμολόγιο
invoice_id          UUID FK → invoices (optional link)

collected_at        TIMESTAMPTZ  -- πότε εισπράχθηκε
collected_amount    NUMERIC

-- Για internal projects
is_internal_costing BOOLEAN DEFAULT false  -- αν δεν υπάρχει πελάτης, skip proposal

updated_by          UUID FK → profiles
created_at          TIMESTAMPTZ DEFAULT now()
updated_at          TIMESTAMPTZ DEFAULT now()
```

Ένα row ανά project. Κάθε πεδίο `_at` γεμίζει όταν ο χρήστης "κλείνει" αυτό το βήμα. Τα `NULL` σημαίνουν "δεν έχει γίνει ακόμα".

## UI Components

### 1. Visual Stepper — `ProjectFinancialStepper.tsx`

Horizontal stepper (παρόμοιο με task status stepper) που δείχνει τα 6 στάδια:

```text
[Κοστολόγηση] → [Προσφορά] → [Ανάθεση] → [Παράδοση] → [Τιμολόγηση] → [Είσπραξη]
     ✓              ✓            ●
```

- Ολοκληρωμένα = πράσινο check + ημερομηνία κάτω
- Τρέχον = highlighted ring
- Μελλοντικά = dimmed
- Κλικ σε step → expand panel κάτω για συμπλήρωση (amount, notes, date)
- Αυτόματος υπολογισμός χρόνων μεταξύ σταδίων (π.χ. "12 ημέρες από κοστολόγηση σε προσφορά")
- Για **internal projects**: τα βήματα Προσφορά/Ανάθεση γίνονται optional/skippable

### 2. Νέο tab στο `ProjectFinancialsHub` — "Οικονομικός Κύκλος"

Προστίθεται ως πρώτο tab, πριν το Budget Overview:
- Πάνω: ο stepper
- Κάτω: timeline cards με τα ολοκληρωμένα milestones + χρόνους
- KPI row: "Μέσος χρόνος κοστολόγησης→τιμολόγησης", "Ημέρες μέχρι είσπραξη"

### 3. Σύνδεση με υπάρχοντα

- Όταν ο χρήστης κλείνει το βήμα "Τιμολόγηση", μπορεί να **συνδέσει υπάρχον invoice** ή να δημιουργήσει νέο
- Όταν κλείνει "Είσπραξη", ελέγχει αν το linked invoice είναι paid
- Η κοστολόγηση μπορεί να τραβήξει τα project expenses ως βάση

## Αλλαγές αρχείων

| Αρχείο | Αλλαγή |
|--------|--------|
| **Migration** | Νέος πίνακας `project_financial_milestones` + RLS |
| `src/components/projects/ProjectFinancialStepper.tsx` | **Νέο** — Visual stepper + edit panels |
| `src/components/projects/ProjectFinancialsHub.tsx` | Νέο tab "Κύκλος Ζωής" με τον stepper |
| `src/pages/ProjectDetail.tsx` | Mini stepper badge στο header area |

## Τι δεν αλλάζει

- Invoices/Expenses/Contracts tables — παραμένουν ως έχουν
- ProjectWorkflowTracker (intake workflows) — ξεχωριστό σύστημα
- P&L Report — παραμένει

