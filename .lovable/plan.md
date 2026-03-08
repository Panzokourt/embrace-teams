

# Plan: Level 3 — Smart Intake & Planning Workflows

## Overview

Add a new `smart_project_plan` tool to the Secretary that uses AI to generate a complete project plan (project + deliverables + tasks + team) from a natural language description. Also add a `get_risk_radar` tool for continuous risk monitoring, and enhance the system prompt for smart intake behavior.

## How It Works

1. **User describes a project** in natural language (e.g. "SEO campaign for Client X, budget 5000€, 3 months")
2. **Secretary calls `smart_project_plan`** which:
   - Takes: `description`, optional `client_id`, `budget`, `duration_months`, `template_hint`
   - Uses AI (Gemini via Lovable gateway) to generate a structured JSON plan: project name, deliverables (with budgets), tasks (with priorities, estimated hours, day offsets), and suggested team roles
   - Returns the plan as structured data for the Secretary to present as a preview
3. **Secretary presents the plan** with a confirm action block
4. **On confirmation, Secretary calls `execute_project_plan`** which creates all entities in the DB (project → deliverables → tasks → team assignments)

For **Risk Radar**, a new `get_risk_radar` tool queries multiple signals: overdue tasks, budget overruns (expenses > budget), unassigned tasks, projects without recent activity, team members with too many tasks. Returns a structured risk report.

## New Tools

| Tool | Description |
|---|---|
| `smart_project_plan` | AI generates a full project plan from natural language description |
| `execute_project_plan` | Creates all entities (project, deliverables, tasks, team) from a structured plan |
| `get_risk_radar` | Comprehensive risk analysis: overdue tasks, budget overruns, capacity issues, stale projects |

## Tool Details

### `smart_project_plan`
- Params: `description` (required), `client_id`, `budget`, `duration_months`, `template_hint`
- Internally calls Lovable AI gateway with a structured prompt that asks for JSON output: `{ name, description, deliverables: [{name, budget_pct, tasks: [{title, priority, days_offset_start, days_offset_due, estimated_hours, role_hint}]}], suggested_roles: ["project_lead", "designer", ...] }`
- Returns the generated plan for preview

### `execute_project_plan`
- Params: `plan` (the JSON plan object), `client_id`, `budget`, `start_date`, `team_members` (array of `{user_id, role}`)
- Creates project → deliverables → tasks (with deliverable linking) → project_user_access entries
- Returns summary of created entities

### `get_risk_radar`
- No required params
- Queries in parallel:
  - Overdue tasks (grouped by project)
  - Projects where total expenses > budget
  - Tasks due in next 3 days without assignee
  - Projects with no task activity in 14+ days
  - Users with 10+ open tasks (capacity)
- Returns structured risk report

## System Prompt Updates

Add to the system prompt:
```
Smart Intake & Planning:
- Αν ο χρήστης περιγράφει ένα αίτημα/project σε φυσική γλώσσα, χρησιμοποίησε smart_project_plan
- Παρουσίασε το πλάνο αναλυτικά (deliverables, tasks, timeline) και ζήτα επιβεβαίωση
- Μετά την επιβεβαίωση, χρησιμοποίησε execute_project_plan

Risk Radar:
- Αν ο χρήστης ρωτά "τι ρίσκα υπάρχουν", "τι πρέπει να προσέξω", "risk check" → get_risk_radar
- Στο daily briefing, αν υπάρχουν σοβαρά ρίσκα, ανέφερέ τα
```

## Frontend Updates (SecretaryChat.tsx)

Add quick actions:
- Default: "🎯 Smart Plan" → "Θέλω να σχεδιάσω ένα νέο project"
- Default: "⚠️ Risk Radar" → "Τρέξε Risk Radar analysis"

## Files to Edit

| File | Change |
|---|---|
| `supabase/functions/secretary-agent/index.ts` | Add 3 tool definitions + executors, update system prompt with intake/risk instructions |
| `src/components/secretary/SecretaryChat.tsx` | Add "Smart Plan" and "Risk Radar" quick actions |

No database changes needed.

