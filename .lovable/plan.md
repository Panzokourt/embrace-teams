

# Πλάνο: Αναβάθμιση Modal & Side Panel Κόμβου Workflow

## Επισκόπηση

Αναδιοργάνωση του modal (`WorkflowStageDialog`) και side panel (`WorkflowSidePanel`) ώστε να περιέχουν ουσιαστικά, intake-oriented πεδία, χωρισμένα σε **Βασικά** (modal) και **Προχωρημένα** (side panel tabs). Ενσωμάτωση των υπαρχόντων brief definitions και project templates.

## Δομή Modal (WorkflowStageDialog) — Βασικά

Tabs: **Γενικά | Πεδία | Υπεύθυνοι**

### Tab «Γενικά»
- Όνομα κόμβου
- Τύπος (Αίτημα / Αξιολόγηση / Έγκριση / Εκκίνηση / Εσωτερικό)
- SLA: αριθμός + μονάδα (ώρες/ημέρες) + optional tooltip/reason
- Αυτόματη προώθηση (toggle, μόνο για non-Approval types)

### Tab «Πεδία & Φόρμα»
- **Field Set selector**: dropdown με τα υπάρχοντα `briefDefinitions` (Creative Brief, Digital Campaign, κλπ) — επιλογή ενός εφαρμόζει τα fields του ως preset
- **Λίστα πεδίων**: Τίτλος, Πελάτης, Προϋπολογισμός, Προθεσμία, Κανάλι, Στόχος, Αρχεία, Κατηγορία, Custom — κάθε πεδίο με toggle required/optional
- Κουμπί «+ Προσθήκη πεδίου» για custom fields (label + type)

### Tab «Υπεύθυνοι»
- Ρόλος/ρόλοι υπεύθυνοι (multi-select: Account Manager, Director, Legal, κλπ)
- **Μόνο για Approval type**: Ελάχιστος αριθμός εγκρίσεων (number input), Ποιοι μπορούν να εγκρίνουν (role selector)

## Δομή Side Panel (WorkflowSidePanel) — Προχωρημένα

Tabs: **Ρυθμίσεις | Actions | Templates**

### Tab «Ρυθμίσεις»
- Ειδοποιήσεις εισόδου/εξόδου (toggles + σε ποιους: ρόλοι/χρήστες, κανάλι: in-app/email)
- Σύνοψη required fields (read-only preview)

### Tab «Actions»
- **On Enter**: λίστα ενεργειών (δημιουργία task, assignment σε ρόλο, notify group)
- **On Exit**: update status, δημιουργία project, link με template
- Κάθε action = row με type selector + παραμέτρους
- Μόνο σε Kickoff type: toggle «Δημιουργία Project» + selector project template (fetch από `project_templates`)

### Tab «Templates»
- Σύνδεση με Project Template (dropdown από DB `project_templates`)
- Σύνδεση με Brief type (dropdown από `briefDefinitions`)
- Preview: δείχνει ποια deliverables/tasks θα δημιουργηθούν

## Αλλαγές στο Schema

**ALTER `intake_workflow_stages`:**
- `responsible_roles TEXT[] DEFAULT '{}'` — ρόλοι υπεύθυνοι
- `min_approvals INTEGER DEFAULT 1` — ελάχιστες εγκρίσεις
- `sla_unit TEXT DEFAULT 'hours'` — hours ή days
- `sla_reason TEXT` — tooltip/αιτιολογία SLA  
- `field_set_type TEXT` — αναφορά σε briefDefinition type
- `custom_fields JSONB DEFAULT '[]'` — custom πεδία πέρα από τα preset
- `notification_config JSONB DEFAULT '{}'` — ρυθμίσεις ειδοποιήσεων (channels, recipients)
- `linked_template_id UUID` — FK → project_templates

## Αρχεία

| Αρχείο | Αλλαγή |
|---|---|
| DB migration | ALTER `intake_workflow_stages` + νέες στήλες |
| `WorkflowStageDialog.tsx` | **Rewrite** — 3 tabs (Γενικά, Πεδία, Υπεύθυνοι), field set integration, approval config |
| `WorkflowSidePanel.tsx` | **Rewrite** — 3 tabs (Ρυθμίσεις, Actions, Templates), action builder, template linking |
| `useIntakeWorkflows.ts` | **Update** — extend `IntakeWorkflowStage` interface με νέα πεδία |
| `WorkflowNode.tsx` | **Update** — δείξε owner roles badge, field set icon, linked template indicator |

