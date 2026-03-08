

# Plan: Workflow Builder for Project Intake

## Overview

Ένα σύστημα ορισμού workflows (Request → Review → Approval → Kickoff) που επιτρέπει στους admins να δημιουργούν intake pipelines με οπτικό builder. Τα workflows συνδέονται με intake forms για εξωτερικά/εσωτερικά αιτήματα, και κατά την ολοκλήρωση δημιουργούν αυτόματα projects στην υπάρχουσα δομή.

## Αρχιτεκτονική

```text
┌─────────────────────────────────────────────────┐
│  intake_workflows (template/definition)         │
│  - id, company_id, name, description, is_active │
│  - auto_create_project (bool)                   │
│  - project_template_id (FK → project_templates) │
│  - created_by                                   │
└─────────────┬───────────────────────────────────┘
              │ 1:N
┌─────────────▼───────────────────────────────────┐
│  intake_workflow_stages                         │
│  - id, workflow_id, name, sort_order            │
│  - stage_type: request|review|approval|kickoff  │
│  - required_fields (JSONB)                      │
│  - approver_role / approver_user_id             │
│  - sla_hours (integer)                          │
│  - notify_on_enter (bool)                       │
│  - auto_advance (bool)                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  intake_requests (runtime instances)            │
│  - id, workflow_id, company_id                  │
│  - title, description, form_data (JSONB)        │
│  - current_stage_id (FK → stages)               │
│  - status: draft|in_progress|approved|rejected  │
│  - requested_by, client_id                      │
│  - project_id (populated after kickoff)         │
│  - created_at, updated_at                       │
└─────────────┬───────────────────────────────────┘
              │ 1:N
┌─────────────▼───────────────────────────────────┐
│  intake_request_history                         │
│  - id, request_id, stage_id                     │
│  - action: entered|approved|rejected|commented  │
│  - actor_id, comment, created_at                │
└─────────────────────────────────────────────────┘
```

## Database: 4 νέοι πίνακες

1. **`intake_workflows`** — Workflow definitions (company-scoped, RLS)
2. **`intake_workflow_stages`** — Stages per workflow with config (required_fields JSONB, approver, SLA)
3. **`intake_requests`** — Runtime instances of submitted requests
4. **`intake_request_history`** — Audit trail per request/stage transition

RLS: Company-scoped via `company_id`. Admins/managers can CRUD workflows. All authenticated users can create requests. Approvers can advance stages.

## Frontend Components

### Σελίδα: `/workflows` (νέα)

**WorkflowsPage** — List of workflows (admin) + "New Request" button (all users)

### Workflow Builder (admin)

- **WorkflowBuilder.tsx** — Visual stage editor:
  - Horizontal pipeline view showing stages as connected cards
  - Each stage card: name, type badge, SLA indicator, approver info
  - Add/remove/reorder stages via drag (dnd-kit already installed)
  - Stage edit dialog: name, type, required fields checkboxes, approver selector, SLA hours, notification toggle
  - Link to project template for auto-creation on kickoff

### Intake Request Flow (all users)

- **IntakeRequestDialog.tsx** — Multi-step form following the workflow's stages:
  - Step 1 (Request): Dynamic form based on `required_fields` (title, description, client, budget, urgency, attachments)
  - Submission creates `intake_requests` record
  
- **IntakeRequestDetail.tsx** — Timeline view of request progress:
  - Stage progress bar at top
  - History timeline with approvals/comments
  - Action buttons for approvers (Approve / Reject / Comment)
  - On final stage approval → auto-create project if configured

### Sidebar Integration

Add "Workflows" entry under the **work** category in `AppSidebar.tsx`.

### Quick Actions

Add "📋 New Request" to Secretary `QuickActionsMenu`.

## Auto-Project Creation

When the final stage is approved and `auto_create_project = true`:
- Uses the linked `project_template_id` to create a project with deliverables/tasks (reuses existing template logic)
- Copies `client_id`, `budget`, `description` from the intake request's `form_data`
- Updates `intake_requests.project_id` with the new project ID
- Creates a notification for the requester

This logic lives in a new edge function **`process-intake-approval`** called when an approver clicks "Approve" on the final stage.

## Files to Create/Edit

| File | Action |
|---|---|
| DB migration | Create 4 tables + RLS policies |
| `src/pages/Workflows.tsx` | New page: workflow list + request list |
| `src/components/workflows/WorkflowBuilder.tsx` | Visual stage pipeline editor |
| `src/components/workflows/WorkflowStageCard.tsx` | Individual stage card component |
| `src/components/workflows/WorkflowStageDialog.tsx` | Stage configuration dialog |
| `src/components/workflows/IntakeRequestDialog.tsx` | Multi-step intake form |
| `src/components/workflows/IntakeRequestDetail.tsx` | Request detail with timeline |
| `src/components/workflows/IntakeRequestsList.tsx` | Table of requests with status |
| `supabase/functions/process-intake-approval/index.ts` | Auto-create project on final approval |
| `src/App.tsx` | Add `/workflows` route |
| `src/components/layout/AppSidebar.tsx` | Add Workflows nav item |
| `src/components/secretary/QuickActionsMenu.tsx` | Add "New Request" action |

## Implementation Phases

Αυτό είναι ένα μεγάλο feature. Προτείνω να το χωρίσουμε σε **3 phases**:

**Phase 1**: Database + Workflow Builder (admin creates/edits workflows with stages)
**Phase 2**: Intake Request flow (submit, review, approve/reject with timeline)
**Phase 3**: Auto-project creation + notifications + Secretary integration

Θα ξεκινήσω με το **Phase 1** (database + builder UI). Εγκρίνεις;

