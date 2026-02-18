
# Λογιστήριο - Finance Section

## Συνοπτική Περιγραφή

Αναβάθμιση του υπάρχοντος "Οικονομικά & P&L" σε ένα πλήρες Finance Section (Λογιστήριο) με 6 tabs, νέους πίνακες για Services/Pricing και εμπλουτισμένα Expenses/Invoices. Στόχος: "τι πουλάμε, τι χρωστάνε, τι κοστίζει, ποια η εικόνα".

## Τρέχουσα Κατάσταση

Υπάρχουν ήδη:
- Πίνακας `invoices` (βασικό: amount, paid, issued_date, due_date)
- Πίνακας `expenses` (βασικό: amount, category, project_id)
- Πίνακας `contracts` (πλήρες: contract_type, billing_frequency, payment_terms, status, file_path)
- `ProjectFinancialsManager` και `ProjectPLReport` components
- `Reports.tsx` page με charts (revenue trend, expenses by category, client P&L)
- Σελίδα `Financials.tsx` (909 γραμμές) με invoices + expenses CRUD + charts

## Δομή Finance Section (6 Tabs)

### Tab 1: Dashboard (Επισκόπηση)
KPI cards + γραφήματα - ενοποίηση αυτών που υπάρχουν στο Financials.tsx και Reports.tsx:
- Revenue / Expenses / Net Profit / Outstanding
- Monthly trend chart (area)
- Expenses by category (pie)
- Aging analysis (bar chart: 0-30, 31-60, 61-90, 90+ ημέρες)
- Top 5 clients by revenue

### Tab 2: Services & Pricing (ΝΕΟ)
Κατάλογος υπηρεσιών της εταιρείας ("τι πουλάμε"):
- Κατηγορία (Retainer / Project / Add-on / Media fee)
- Τιμή (list price) + Μονάδα χρέωσης (μήνας, ώρα, έργο, τεμάχιο)
- Εσωτερικό κόστος: ώρες ανά ρόλο + rate ανά ρόλο
- Target margin %
- Link σε deliverable template

### Tab 3: Contracts (υπάρχει ήδη πίνακας)
Ενοποίηση: τα contracts υπάρχουν στη DB αλλά δεν έχουν κεντρική σελίδα.
- Λίστα όλων των συμβάσεων (filterable ανά πελάτη/status)
- Status: draft / active / ended / renewed
- Auto-renewal flag + expiry alerts
- Link σε PDF attachment
- Quick view: πελάτης, πακέτο, μηνιαίο fee, payment terms

### Tab 4: Invoices & Collections (αναβάθμιση)
Εμπλουτισμός υπάρχοντος:
- Προσθήκη: client_id link, contract_id link, VAT fields, partial payments, attachment (PDF), σχόλια
- Status: unpaid / partially_paid / paid / overdue / cancelled
- Αυτόματος υπολογισμός: aging (ημέρες καθυστέρησης), outstanding balance ανά πελάτη
- Filters: ανά πελάτη, ανά project, ανά status, ανά περίοδο

### Tab 5: Expenses (αναβάθμιση)
Εμπλουτισμός υπάρχοντος:
- Προσθήκη: vendor/supplier name, expense_type (vendor/media/overhead), client_id link, attachment, approval workflow (submitted/approved/paid)
- Expenses μπορεί να μην συνδέονται με project (π.χ. overheads)
- Filters: ανά κατηγορία, ανά vendor, ανά project/client

### Tab 6: Reports / Profitability
Ενοποίηση Reports.tsx + νέα views:
- Client P&L: Revenue - Direct costs = Gross profit per client
- Project P&L: ήδη υπάρχει (ProjectPLReport), θα εμφανίζεται εδώ σε list view
- Monthly P&L statement
- Budget vs Actual (αν υπάρχουν budgets)

## Database Changes

### Νέος πίνακας: `services`
```text
id              uuid PK
company_id      uuid FK -> companies
name            text (π.χ. "Social Media Management")
description     text
category        text ('retainer','project','addon','media_fee')
list_price      numeric
pricing_unit    text ('month','hour','project','piece')
internal_cost   numeric (target cost)
target_margin   numeric (target margin %)
role_hours      jsonb (π.χ. {"account": 10, "designer": 5, "copywriter": 3})
role_rates      jsonb (π.χ. {"account": 50, "designer": 60, "copywriter": 45})
template_id     uuid FK -> project_templates (optional)
is_active       boolean default true
sort_order      integer default 0
created_at      timestamptz
updated_at      timestamptz
```

### Αλλαγές στον πίνακα `invoices`
Προσθήκη columns:
- `contract_id` uuid (FK -> contracts, nullable)
- `vat_rate` numeric default 24
- `net_amount` numeric (ποσό χωρίς ΦΠΑ)
- `vat_amount` numeric (ΦΠΑ)
- `status` text ('unpaid','partially_paid','paid','overdue','cancelled') default 'unpaid'
- `paid_amount` numeric default 0 (για partial payments)
- `notes` text
- `file_path` text (attachment)

### Αλλαγές στον πίνακα `expenses`
Προσθήκη columns:
- `client_id` uuid (FK -> clients, nullable) -- για overhead expenses χωρίς project
- `vendor_name` text
- `expense_type` text ('vendor','media','overhead','subscription') default 'vendor'
- `approval_status` text ('draft','submitted','approved','paid') default 'draft'
- `approved_by` uuid (nullable)
- `file_path` text (attachment)
- `notes` text

Αλλαγή: `project_id` γίνεται nullable (overheads δεν έχουν project)

### RLS Policies
- `services`: SELECT ολοι active users, ALL admin/manager
- Invoices/expenses: ίδια πολιτική με τα υπάρχοντα (admin/manager full access)

## Νέα Αρχεία

### Pages
- `src/pages/Financials.tsx` -- REWRITE: Γίνεται η κεντρική σελίδα Finance με 6 tabs

### Components (νέα)
- `src/components/finance/FinanceDashboard.tsx` -- KPI cards + charts (Tab 1)
- `src/components/finance/ServicesCatalog.tsx` -- CRUD υπηρεσιών (Tab 2)
- `src/components/finance/ContractsList.tsx` -- Λίστα συμβάσεων (Tab 3)
- `src/components/finance/InvoicesManager.tsx` -- Αναβαθμισμένο invoices CRUD (Tab 4)
- `src/components/finance/ExpensesManager.tsx` -- Αναβαθμισμένο expenses CRUD (Tab 5)
- `src/components/finance/ProfitabilityReports.tsx` -- Client/Project/Monthly P&L (Tab 6)

### Αλλαγές σε υπάρχοντα
- `src/App.tsx`: Αφαίρεση `/reports` route (ενσωματώνεται στο Finance), redirect `/reports` -> `/financials`
- `src/components/layout/AppSidebar.tsx`: Αλλαγή label "P&L" -> "Λογιστήριο", αφαίρεση Reports link αν υπάρχει
- `src/pages/ClientDetail.tsx`: Προσθήκη "Financial Snapshot" tab (σύμβαση, invoices, outstanding, costs, margin)

## UI Layout

```text
+--------------------------------------------------+
| Λογιστήριο                                       |
+--------------------------------------------------+
| [Dashboard] [Υπηρεσίες] [Συμβάσεις]             |
| [Τιμολόγια] [Έξοδα] [Αναφορές]                  |
+--------------------------------------------------+
|                                                    |
|  < Περιεχόμενο αντίστοιχου tab >                  |
|                                                    |
+--------------------------------------------------+
```

## Σειρά Υλοποίησης

1. Database migration (νέος πίνακας services + alter invoices + alter expenses + RLS)
2. FinanceDashboard component (KPI + charts)
3. ServicesCatalog component (CRUD)
4. ContractsList component (list + filters)
5. InvoicesManager component (αναβαθμισμένο CRUD)
6. ExpensesManager component (αναβαθμισμένο CRUD)
7. ProfitabilityReports component (P&L views)
8. Κεντρική σελίδα Financials.tsx (tabs)
9. Routing + Sidebar updates
10. ClientDetail Financial Snapshot tab
