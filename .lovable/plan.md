

# Plan: Secretary Level 1 — New Tools, Context Awareness, Proactive Suggestions & Daily Briefing

## Overview

Expand the Secretary agent with 6 new tools, pass the user's current page for contextual behavior, add proactive suggestions based on data analysis, and generate a daily briefing on first interaction.

## Changes

### 1. Edge Function: New Tools (`supabase/functions/secretary-agent/index.ts`)

Add 6 new tool definitions and their executors:

| Tool | Description | Key params |
|---|---|---|
| `create_project` | Create a new project | `name`, `client_id`, `budget`, `start_date`, `end_date`, `status`, `description` |
| `update_project_status` | Change project status | `project_id`, `status` (enum: tender/active/completed/cancelled/lead/proposal/negotiation/won/lost) |
| `assign_team_member` | Add user to project team | `project_id`, `user_id`, `role` (optional) |
| `create_calendar_event` | Create a meeting/event | `title`, `start_time`, `end_time`, `event_type`, `attendee_ids[]`, `project_id`, `description`, `location`, `video_link` |
| `log_time_entry` | Log time for a project/task | `project_id`, `task_id`, `duration_minutes`, `description`, `start_time` |
| `send_chat_message` | Send message to a chat channel | `channel_id`, `content` |

Also add a new `get_daily_briefing` tool that fetches today's tasks, overdue tasks, today's calendar events, and project risk indicators in one call.

### 2. Context Awareness

**Frontend (`SecretaryChat.tsx`)**: Pass `location.pathname` in the request body alongside messages:
```typescript
body: JSON.stringify({
  messages: newMessages.map(m => ({ role: m.role, content: m.content })),
  current_page: location.pathname,
})
```

**Backend**: Extract `current_page` from the request and inject it into the system prompt:
```
Ο χρήστης βρίσκεται στη σελίδα: ${currentPage}
Προσάρμοσε τις προτάσεις σου ανάλογα (π.χ. αν είναι σε /projects/:id, πρότεινε ενέργειες για αυτό το project).
```

Also add contextual quick actions in the frontend based on the current route (e.g., on `/projects/:id` show "Πρόσθεσε task σε αυτό το project").

### 3. Proactive Suggestions

In the backend context-building phase, add queries for:
- **Overdue tasks**: tasks with `due_date < today` and `status != done`
- **Projects behind schedule**: projects with `end_date < today` and status `active`

Inject these counts into the system prompt as a "proactive alerts" section:
```
Proactive Alerts:
- Υπάρχουν 3 overdue tasks
- 1 project έχει ξεπεράσει το deadline
Αν ο χρήστης ρωτήσει γενικά ή ξεκινάει νέα συνομιλία, ανέφερε αυτά τα alerts.
```

### 4. Daily Briefing

When the conversation starts (messages array has only 1 user message and it's a greeting or first message of the day), the system prompt instructs the AI to proactively include a daily briefing:

```
Αν είναι η πρώτη συνομιλία της ημέρας, ξεκίνα με ένα σύντομο Daily Briefing:
- Πόσα tasks έχει σήμερα ο χρήστης
- Overdue tasks
- Σημερινά meetings/events
- Projects σε κρίσιμη κατάσταση
```

Add a `get_daily_briefing` tool that fetches all this data in one call so the AI can present it structured.

### 5. Frontend Quick Actions Update

Update `quickActions` in `SecretaryChat.tsx` to include new actions and make them contextual:
- Add: "🚀 Νέο Project", "📅 Νέο Meeting", "⏱ Log Time"
- When on a project page, show project-specific quick actions

## Files to Edit

| File | Change |
|---|---|
| `supabase/functions/secretary-agent/index.ts` | Add 7 tool definitions + executors, accept `current_page`, enrich system prompt with context/alerts, add overdue/calendar queries to context building |
| `src/components/secretary/SecretaryChat.tsx` | Pass `location.pathname` in request body, add contextual quick actions based on route |

No database changes needed — all tables already exist.

