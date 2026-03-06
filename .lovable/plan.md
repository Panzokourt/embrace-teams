

# Module: Υπηρεσίες, Πακέτα & Προσφορές

## Scope

Πλήρες module αντικαθιστώντας τον υπάρχοντα ServicesCatalog, με νέο data model, proper cost engine, package builder, proposal builder, και service detail page.

---

## 1. Database Schema (Migration)

### Alter existing `services` table
Προσθήκη στηλών:
- `subcategory text`
- `department_id uuid references departments(id)`
- `pricing_model text default 'fixed'` (fixed, hourly, retainer, value_based)
- `deliverables text[]`
- `notes text`
- `estimated_turnaround text`
- `external_cost numeric default 0` (3rd party costs, media buys, etc.)
- `archived_at timestamptz`

### New table: `service_role_costs`
Γραμμές κοστολόγησης ομάδας ανά υπηρεσία (αντί JSON).

```sql
CREATE TABLE public.service_role_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id),
  role_title text NOT NULL,        -- e.g. "Account Manager"
  level text,                      -- e.g. "Senior", "Junior"
  department_id uuid REFERENCES departments(id),
  estimated_hours numeric NOT NULL DEFAULT 0,
  hourly_cost numeric NOT NULL DEFAULT 0,  -- resolved cost
  cost_source text DEFAULT 'manual', -- 'employee', 'role_default', 'manual'
  employee_id uuid REFERENCES profiles(id),
  total_cost numeric GENERATED ALWAYS AS (estimated_hours * hourly_cost) STORED,
  created_at timestamptz DEFAULT now()
);
```

### New table: `role_default_costs`
Default hourly rates ανά ρόλο/level/εταιρεία.

```sql
CREATE TABLE public.role_default_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  role_title text NOT NULL,
  level text,
  hourly_cost numeric NOT NULL DEFAULT 0,
  UNIQUE(company_id, role_title, level)
);
```

### New table: `employee_cost_overrides`
Override κόστους ανά εργαζόμενο.

```sql
CREATE TABLE public.employee_cost_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  hourly_cost numeric NOT NULL,
  effective_from date DEFAULT CURRENT_DATE,
  UNIQUE(company_id, employee_id)
);
```

### New table: `service_packages`

```sql
CREATE TABLE public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  description text,
  list_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  final_price numeric GENERATED ALWAYS AS (list_price * (1 - discount_percent/100)) STORED,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### New table: `package_items`

```sql
CREATE TABLE public.package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id),
  quantity integer DEFAULT 1,
  duration_months integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0
);
```

### New table: `proposals`

```sql
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  client_id uuid REFERENCES clients(id),
  name text NOT NULL,
  status text DEFAULT 'draft', -- draft, sent, negotiation, won, lost
  version integer DEFAULT 1,
  notes text,
  assumptions text,
  discount_percent numeric DEFAULT 0,
  valid_until date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### New table: `proposal_items`

```sql
CREATE TABLE public.proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  package_id uuid REFERENCES service_packages(id),
  item_type text DEFAULT 'service', -- service, package, custom
  custom_name text,
  custom_description text,
  quantity integer DEFAULT 1,
  duration_months integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,  -- snapshot at creation
  discount_percent numeric DEFAULT 0,
  sort_order integer DEFAULT 0
);
```

### New table: `proposal_snapshots`

```sql
CREATE TABLE public.proposal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot_data jsonb NOT NULL, -- full frozen copy of items + costs
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);
```

RLS: Όλοι οι πίνακες θα έχουν RLS βάσει `company_id` με τα υπάρχοντα patterns (`is_company_admin_or_manager`, membership checks).

---

## 2. Frontend Architecture

### Νέα σελίδα: `/pricing` (αντικατάσταση Coming Soon)

Tabs:
- **Υπηρεσίες** — Λίστα + filters + actions (create, duplicate, archive, import)
- **Πακέτα** — Package builder
- **Προσφορές** — Proposals list + builder
- **Κοστολόγηση** — Role default costs + employee overrides management
- **Dashboard** — Margin health, profitability charts

### Νέα σελίδα: `/pricing/services/:id` (Service Detail)

Tabs: Overview, Pricing, Costing, Deliverables, Packages, Proposals, History

### Νέα components (στο `src/components/pricing/`)

| Component | Περιγραφή |
|-----------|-----------|
| `ServicesList.tsx` | Table view με filters (category, department, pricing model, margin health), bulk actions |
| `ServiceForm.tsx` | Full-page dialog/drawer: γενικά, pricing, deliverables, notes |
| `ServiceCostingTable.tsx` | Repeatable rows table: role, level, dept, hours, hourly cost, total. Auto-resolve cost. |
| `ServiceDetailPage.tsx` | Tabbed detail view |
| `PackageBuilder.tsx` | Service picker, quantities, discount, live margin preview |
| `PackagesList.tsx` | Table of packages |
| `ProposalBuilder.tsx` | Client picker + service/package/custom items + live margin summary |
| `ProposalsList.tsx` | Table of proposals with status badges |
| `ProposalDetail.tsx` | Read view + versioning + snapshot comparison |
| `RoleCostsManager.tsx` | CRUD for role_default_costs + employee_cost_overrides |
| `PricingDashboard.tsx` | Charts: margin health distribution, top services, package profitability, proposal win rates |
| `ServiceImportWizard.tsx` | CSV/XLSX upload, column mapping, preview, insert |

### Computed fields (frontend)

Για κάθε υπηρεσία:
```
labor_cost = SUM(service_role_costs.total_cost)
total_cost = labor_cost + external_cost
margin_eur = list_price - total_cost
margin_pct = (margin_eur / list_price) * 100
```

Για packages: sum of item costs vs final_price.
Για proposals: sum of all items (after discounts) vs sum of costs.

---

## 3. Routing Changes

- `/pricing` → PricingPage (tabs)
- `/pricing/services/:id` → ServiceDetailPage

Update `App.tsx` routing + sidebar navigation.

---

## 4. Cost Resolution Logic

Κατά τη δημιουργία/επεξεργασία `service_role_costs` row:
1. Αν `employee_id` specified → fetch `employee_cost_overrides.hourly_cost`
2. Αν δεν βρεθεί → fetch `role_default_costs.hourly_cost` by role_title + level
3. Αν δεν βρεθεί → manual input required
4. Update `cost_source` accordingly

---

## 5. Import Wizard

- File upload (CSV/XLSX) via FileReader
- Auto-detect columns
- Map columns to service fields
- Preview with validation
- Batch insert

---

## 6. Σημαντικές σχεδιαστικές αποφάσεις

- **Κανένα JSON field** στο UI — όλα repeatable rows / table editors
- Ο υπάρχων `services` table **δεν διαγράφεται** αλλά **επεκτείνεται** (backward compatible)
- Τα `role_hours`/`role_rates` JSON columns παραμένουν στη βάση αλλά **δεν χρησιμοποιούνται** πλέον — αντικαθίστανται από `service_role_costs`
- Τα proposals κρατάνε **snapshot** τιμών/κόστους τη στιγμή δημιουργίας κάθε version
- Η σελίδα `/financials?tab=services` θα κάνει redirect στο `/pricing`

Λόγω μεγέθους, η υλοποίηση θα γίνει σε **2-3 phases**:
1. DB migration + Services (list, form, costing table, detail) + Role costs manager
2. Packages + Proposals + Snapshots
3. Dashboard + Import wizard + AI suggestions

