

# Plan: Secretary ↔ Brain Integration (Level 2)

## Overview

Connect the Secretary agent to the Brain intelligence system so the Secretary can trigger on-demand analysis, present Brain insights as actionable items, and receive proactive alerts from scheduled Brain runs.

## Changes

### 1. New Secretary Tools (Edge Function: `secretary-agent/index.ts`)

Add 3 new tools:

| Tool | Description |
|---|---|
| `run_brain_analysis` | Triggers a full Brain analysis by calling the `brain-analyze` edge function internally and returns a summary of generated insights |
| `get_brain_insights` | Fetches recent/active Brain insights from `brain_insights` table with optional filters (category, priority, client/project entity) |
| `action_brain_insight` | Marks an insight as actioned and optionally creates a project/task/brief from it based on the insight's evidence and recommendations |

**Tool definitions:**

- `run_brain_analysis`: No required params. Optional `focus` (string: "client", "project", "market", "team") to hint the analysis scope.
- `get_brain_insights`: Optional `category` (strategic/sales/productivity/market/alert/neuro), `priority` (high/medium/low), `limit` (number), `entity_id` (string to filter evidence by specific client/project ID).
- `action_brain_insight`: Required `insight_id`. Optional `action_type` (enum: "create_project", "create_task", "dismiss", "note"), plus `project_id` / `task_title` / `note` for the specific action.

### 2. Tool Executors

**`run_brain_analysis`**: Makes an internal fetch to `${SUPABASE_URL}/functions/v1/brain-analyze` passing the user's auth header. Returns the count and top 3 insights summaries.

**`get_brain_insights`**: Queries `brain_insights` table filtered by `company_id`, optional category/priority. If `entity_id` provided, filters where `evidence` JSONB contains matching ID. Returns up to 10 insights with title, body, category, priority, evidence, neuro_tactic.

**`action_brain_insight`**: 
- `create_project`: Extracts insight title/body → creates project via existing `create_project` logic, marks `is_actioned = true`
- `create_task`: Creates a task from insight recommendation, marks `is_actioned = true`  
- `dismiss`: Sets `is_dismissed = true`
- `note`: Appends a note (stores in insight metadata or just marks actioned)

### 3. System Prompt Enhancement

Add to the Secretary's system prompt:

```
Brain Integration:
- Μπορείς να τρέξεις AI ανάλυση Brain (run_brain_analysis) για να πάρεις fresh insights
- Μπορείς να δεις υπάρχοντα Brain insights (get_brain_insights) 
- Όταν παρουσιάζεις insight, πρότεινε actionable επόμενα βήματα: "Θες να φτιάξω project/task γι' αυτό;"
- Αν ο χρήστης ρωτά "τι ρίσκα βλέπεις", "ανάλυσε τον πελάτη Χ", "τι λέει το Brain" → χρησιμοποίησε τα Brain tools
```

### 4. Proactive Brain Alerts in Context

In the context-building phase of the secretary-agent, add a query to fetch the latest high-priority, non-dismissed Brain insights (last 48h). Inject a summary into the system prompt:

```
Brain Alerts (τελευταία 48h):
- [high] Ο πελάτης X χάνει €5K/μήνα χωρίς SEO (sales/upsell)
- [high] 2 projects πίσω στο timeline (alert)
Αν σχετίζονται με αυτά που ρωτά ο χρήστης, ανέφερέ τα.
```

### 5. Frontend Quick Actions (SecretaryChat.tsx)

Add Brain-related quick actions:
- "🧠 Brain Analysis" → "Τρέξε ανάλυση Brain"
- "💡 Insights" → "Δείξε μου τα τελευταία Brain insights"

Add to contextual actions on `/brain` page.

## Files to Edit

| File | Change |
|---|---|
| `supabase/functions/secretary-agent/index.ts` | Add 3 tool definitions, 3 executors, Brain insights query in context-building, system prompt update |
| `src/components/secretary/SecretaryChat.tsx` | Add Brain quick actions (default + `/brain` page context) |

No database changes needed — `brain_insights` table and `brain-analyze` function already exist.

