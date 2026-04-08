

# Merge Command Center + My Work → Unified Page

## Overview

Συγχωνεύουμε τις δύο σελίδες σε μία ενιαία στη θέση του My Work (`/`). Η σελίδα Command Center (`/command-center`) αφαιρείται. Κρατάμε τα gaming elements (XP ring, glowing cards, mission styling) και ενσωματώνουμε **όλα** τα features του My Work (projects, calendar, approvals, time tracking, quick notes, task side panel).

## Τι κρατάμε από κάθε σελίδα

**Από Command Center (gaming UI)**:
- CCHeroZone (XP ring, streak, greeting) → αντικαθιστά το απλό header του MyWork
- CCMissionCards (glowing KPI cards) → αντικαθιστά τα plain badge KPIs
- CCTeamRadar + CCIntelFeed (admin/manager only panels)
- CCQuickActions (floating action bar)
- Gaming styling (glow borders, scan-lines, mission terminology)

**Από My Work (productivity features)**:
- Projects view + Calendar view toggle
- TodayTasksCard
- Expandable project rows με tasks/deliverables
- Approvals section (sent + need approval)
- Time tracking widget με active timer
- QuickNotes
- TaskSidePanel (docked side panel)
- Task completion, review approve/reject actions

## Τι συγχωνεύεται (overlapping)

| Feature | CC version | MyWork version | Merged |
|---------|-----------|----------------|--------|
| Greeting + name | CCHeroZone | Header greeting | CCHeroZone (gaming) |
| Tasks count KPI | MissionCard | Badge chip | MissionCard (glowing) |
| Hours today | StatPill | Badge chip | CCHeroZone StatPill |
| Overdue count | MissionCard | Badge chip | MissionCard |
| Active timer | — | Time Tracking Card | Keep MyWork version (functional) |
| Task list | CCActiveMissions (simple) | TodayTasksCard + Projects (rich) | Keep MyWork versions (more functional) |

## Νέα δομή σελίδας

```text
┌─────────────────────────────────────────────────────┐
│  CCHeroZone (XP ring, streak, greeting, stat pills) │
├─────────────────────────────────────────────────────┤
│  CCMissionCards (glowing KPIs, role-filtered)        │
├─────────────────────────────────────────────────────┤
│  [Projects/Calendar toggle]                          │
│  ┌──────────────────┬────────────────────┐          │
│  │ TodayTasksCard   │ Active Projects    │          │
│  │ (or Calendar)    │ (expandable rows)  │          │
│  └──────────────────┴────────────────────┘          │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┬────────────────────┐          │
│  │ Approvals        │ Time Tracking      │          │
│  └──────────────────┴────────────────────┘          │
├─────────────────────────────────────────────────────┤
│  [TeamRadar + IntelFeed] (admin/manager only)        │
├─────────────────────────────────────────────────────┤
│  QuickNotes                                          │
├─────────────────────────────────────────────────────┤
│  CCQuickActions (floating bar)                       │
└─────────────────────────────────────────────────────┘
                                        ┌─────────────┐
                                        │ TaskSidePanel│
                                        │ (docked)     │
                                        └─────────────┘
```

## Changes

| File | Change |
|------|--------|
| `src/pages/MyWork.tsx` | Replace header section with CCHeroZone + CCMissionCards. Add CCTeamRadar, CCIntelFeed, CCQuickActions (role-filtered). Import role flags from useAuth. Keep all existing productivity features intact. |
| `src/App.tsx` | Remove `/command-center` route + dashboard redirects. Redirect `/command-center` → `/` |
| `src/components/layout/AppSidebar.tsx` | Remove `overview` category entirely (Command Center disappears as separate nav). My Work icon at `/` remains the single entry point. |
| `src/pages/CommandCenter.tsx` | Keep file but no longer routed (can delete later) |
| `src/components/command-center/CCActiveMissions.tsx` | No longer used (MyWork has richer task views) |
| `src/components/command-center/CCHeroZone.tsx` | Minor: pass tasksCompletedToday from MyWork data instead of CC data |
| `src/components/command-center/CCMissionCards.tsx` | No changes, reused as-is |

## KPI Data Mapping

The CCMissionCards needs pipeline/winRate data that MyWork doesn't currently fetch. We add a lightweight projects query (already done in CC) to the MyWork fetchAll:

```typescript
// Add to fetchAll:
const allProjectsRes = await supabase.from('projects').select('id, status, budget');
// Calculate pipelineValue, winRate, activeProjects count from this
```

CCHeroZone gets `tasksCompletedToday` from a count of completed tasks today (add query) and `hoursToday` from existing `todayHours`.

