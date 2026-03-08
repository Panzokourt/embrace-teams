

# Πλάνο: Visual Flow Builder για Workflows

## Επισκόπηση

Μετατροπή του υπάρχοντος linear pipeline σε πλήρες visual flow editor με canvas, nodes, βελάκια, branching, pan/zoom, inline editing, και ελληνική γλώσσα. Λόγω μεγέθους, το χωρίζω σε **4 Phases** — προτείνω να ξεκινήσουμε με τα **Phases 1+2** μαζί (canvas + DB).

---

## Phase 1: Visual Canvas + DB Schema Updates

### Database Migration

**Αλλαγές στον πίνακα `intake_workflow_stages`:**
- `position_x FLOAT DEFAULT 0` — θέση node στον canvas
- `position_y FLOAT DEFAULT 0`
- `on_enter_actions JSONB DEFAULT '[]'` — ενέργειες εισόδου (create task, notify, assign)
- `on_exit_actions JSONB DEFAULT '[]'` — ενέργειες εξόδου (update status, create project)

**Νέος πίνακας `intake_workflow_connections`:**
```text
id UUID PK
workflow_id UUID FK → intake_workflows
from_stage_id UUID FK → intake_workflow_stages (nullable, null = Start node)
to_stage_id UUID FK → intake_workflow_stages (nullable, null = End node)
label TEXT (π.χ. "Εγκρίθηκε", "Απορρίφθηκε")
condition JSONB (π.χ. {"field": "budget", "op": ">", "value": 5000})
sort_order INTEGER DEFAULT 0
created_at TIMESTAMPTZ
```

**Αλλαγές στον πίνακα `intake_workflows`:**
- `version INTEGER DEFAULT 1`
- `published_version INTEGER DEFAULT 0`
- `is_draft BOOLEAN DEFAULT true`

### Frontend: Visual Canvas

**Νέα components:**

| Component | Περιγραφή |
|---|---|
| `WorkflowCanvas.tsx` | Κεντρικός canvas container με pan (drag) + zoom (wheel), CSS transform-based |
| `WorkflowNode.tsx` | Node card: type badge, name (inline editable), SLA, icons. Start/End nodes ξεχωριστά |
| `WorkflowConnection.tsx` | SVG βελάκι μεταξύ nodes, με label chip. Κλικ για edit condition |
| `WorkflowMinimap.tsx` | Μικρογραφία overview κάτω-δεξιά |
| `WorkflowToolbar.tsx` | Zoom controls, "Προσθήκη Κόμβου", "Δοκιμή", "Δημοσίευση" |
| `WorkflowSidePanel.tsx` | Δεξί panel για advanced settings (required fields, actions, rules) όταν κάνω κλικ σε node |
| `WorkflowConnectionDialog.tsx` | Dialog για edit condition σε βελάκι |

**Canvas μηχανική (χωρίς εξωτερική βιβλιοθήκη):**
- Container div με `transform: translate(panX, panY) scale(zoom)` 
- Mouse drag = pan, wheel = zoom, node drag = reposition
- SVG overlay layer για connections (bezier curves)
- Nodes rendered ως absolute-positioned divs μέσα στον canvas

**Inline editing:**
- Double-click σε node name → contentEditable
- Double-click σε SLA → μικρό input field
- Single click → select node, δείχνει side panel

**Start/End nodes:**
- Αυτόματο "Αρχή" node (circle, πράσινο) — πάντα υπάρχει, δεν σβήνεται
- Αυτόματο "Τέλος" node (circle, κόκκινο) — μπορεί να υπάρχουν πολλαπλά (Αρχειοθέτηση, Μετατροπή σε Project)

**Branching:**
- Drag από output handle ενός node σε input handle άλλου → δημιουργεί connection
- Κάθε node μπορεί να έχει πολλαπλά outgoing connections
- Κάθε connection μπορεί να φέρει label + optional condition

---

## Phase 2: Logic, Validation & Versioning

**Validation (κουμπί "Δημοσίευση"):**
- Ελέγχει: dead-ends (nodes χωρίς εξερχόμενο βελάκι), orphans (nodes χωρίς εισερχόμενο), loops, stages χωρίς Approver σε Approval type
- Εμφανίζει warnings toast

**Versioning:**
- Κάθε "Δημοσίευση" αυξάνει version, αποθηκεύει snapshot (JSONB) στο workflow record
- Draft mode: τρέχουσα επεξεργασία δεν επηρεάζει ενεργά requests
- Rollback: dropdown με versions

**Stage types με default rules (Ελληνικά):**
- Αίτημα, Αξιολόγηση, Έγκριση, Εκκίνηση, Εσωτερικό βήμα

---

## Phase 3: Test Mode & Field Sets (μελλοντικό)

- Κουμπί "Δοκιμή" → step-by-step simulation
- Reusable field sets (Standard Brief, Performance Brief)
- Duplicate workflow / subtree

## Phase 4: Entity Actions & Deep Integration (μελλοντικό)

- On enter/exit actions (create task, assign, notify, create project)
- Workflow usage report στη λίστα

---

## Αρχεία

| Αρχείο | Αλλαγή |
|---|---|
| DB migration | ALTER stages (position, actions), CREATE connections table, ALTER workflows (version) |
| `src/components/workflows/WorkflowCanvas.tsx` | **Νέο** — Canvas με pan/zoom |
| `src/components/workflows/WorkflowNode.tsx` | **Νέο** — Node component (αντικαθιστά WorkflowStageCard στο builder) |
| `src/components/workflows/WorkflowConnection.tsx` | **Νέο** — SVG connection arrows |
| `src/components/workflows/WorkflowMinimap.tsx` | **Νέο** — Minimap overview |
| `src/components/workflows/WorkflowToolbar.tsx` | **Νέο** — Toolbar controls |
| `src/components/workflows/WorkflowSidePanel.tsx` | **Νέο** — Right side panel for advanced settings |
| `src/components/workflows/WorkflowConnectionDialog.tsx` | **Νέο** — Connection condition editor |
| `src/components/workflows/WorkflowBuilder.tsx` | **Αντικατάσταση** — Orchestrator με canvas + side panel layout |
| `src/hooks/useIntakeWorkflows.ts` | **Update** — Connections CRUD, positions update, validation logic |
| `src/pages/Workflows.tsx` | **Update** — Ελληνικά labels |
| `src/components/workflows/WorkflowStageDialog.tsx` | **Update** — Ελληνικά, νέα πεδία (actions) |

Θα υλοποιήσω **Phases 1 + 2** μαζί. Εγκρίνεις;

