

# Command Center — Gaming-Style, Role-Adaptive

## Concept

Αντικαθιστούμε τα 4 Dashboard sub-pages με ένα ενιαίο **Command Center** με gaming-inspired UI: hex/radial layouts, glowing cards, animated progress rings, streak counters, XP integration, και real-time pulse effects. Η σελίδα προσαρμόζεται αυτόματα ανάλογα με τον ρόλο (owner/admin/manager/member/viewer).

## UI Design — Gaming Elements

```text
┌─────────────────────────────────────────────────────────────┐
│  ⚡ COMMAND CENTER          [Greeting + Level Badge + Streak]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── HERO ZONE ────────────────────────────────────────┐  │
│  │  XP Progress Ring (animated)  │  Daily Streak 🔥      │  │
│  │  Level title + glow           │  Tasks completed today │  │
│  │  "12 XP μέχρι το Level 6"    │  Hours logged          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── MISSION CARDS (hex-grid style) ───────────────────┐  │
│  │  ╔══════╗  ╔══════╗  ╔══════╗  ╔══════╗              │  │
│  │  ║ Rev  ║  ║ Proj ║  ║ Tasks║  ║ Over ║  (role-based)│  │
│  │  ║ €12k ║  ║  8   ║  ║  23  ║  ║  2!  ║              │  │
│  │  ╚══════╝  ╚══════╝  ╚══════╝  ╚══════╝              │  │
│  │  Glow border based on health (green/amber/red)        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── PANELS (2-3 columns) ─────────────────────────────┐  │
│  │  [Active Missions]     │  [Team Radar]                │  │
│  │  My tasks as quest list│  Workload heatmap / bars     │  │
│  │  with XP rewards shown │  (admin/manager only)        │  │
│  │                        │                              │  │
│  │  [Pipeline Funnel]     │  [AI Intel Feed]             │  │
│  │  (owner only)          │  Brain insights + activity   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── QUICK ACTIONS BAR (floating, bottom) ─────────────┐  │
│  │  [+ Task]  [+ Project]  [Start Timer]  [Secretary]    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Gaming UI Details

- **Hero Zone**: Animated SVG ring (XP progress), pulsing glow ανάλογα με level, streak counter με 🔥 animation
- **Mission Cards (KPIs)**: Cards με glowing borders (green=healthy, amber=warning, red=critical), subtle hover scale effect, icon pulse animation
- **Active Missions**: Tasks σαν "quests" — δείχνουν estimated XP reward, priority badge σαν difficulty tier (Easy/Medium/Hard/Epic)
- **Team Radar** (admin/manager): Horizontal bars ή mini avatars με workload percentage, color-coded
- **AI Intel Feed**: Brain insights + recent activity σαν "intel reports", dark-themed cards με scan-line effect
- **Quick Actions**: Floating bar, pill-shaped buttons με glow hover

## Role-Based Visibility

| Component | Owner/Admin | Manager | Member | Viewer/Client |
|-----------|:-----------:|:-------:|:------:|:-------------:|
| Hero Zone (XP/Streak) | ✓ | ✓ | ✓ | - |
| KPI: Revenue, Pipeline | ✓ | ✓ | - | - |
| KPI: My Tasks, Overdue | ✓ | ✓ | ✓ | - |
| KPI: Active Projects | ✓ | ✓ | ✓ | ✓ |
| Panel: Active Missions | ✓ | ✓ | ✓ | - |
| Panel: Team Radar | ✓ | ✓ | - | - |
| Panel: Pipeline Funnel | ✓ | - | - | - |
| Panel: AI Intel | ✓ | ✓ | - | - |
| Panel: Project Progress | ✓ | ✓ | ✓ | ✓ |
| Quick: +Project, +Client | ✓ | ✓ | - | - |
| Quick: +Task, Timer | ✓ | ✓ | ✓ | - |

## Data Sources

Χρησιμοποιεί τα ίδια queries με το υπάρχον Dashboard.tsx (invoices, projects, tasks, time_entries, tenders) + useUserXP hook για gamification data.

## Sidebar Change

Η κατηγορία `overview` αλλάζει από 4 sub-items σε 1:
```
overview: [
  { title: 'Command Center', href: '/command-center', icon: Radar }
]
```

## Files

| File | Αλλαγή |
|------|--------|
| `src/pages/CommandCenter.tsx` | Νέο — orchestrator, data fetching, role-based layout |
| `src/components/command-center/CCHeroZone.tsx` | Νέο — animated XP ring, streak, level display |
| `src/components/command-center/CCMissionCards.tsx` | Νέο — glowing KPI cards grid |
| `src/components/command-center/CCActiveMissions.tsx` | Νέο — task list as quests with XP rewards |
| `src/components/command-center/CCTeamRadar.tsx` | Νέο — team workload visualization |
| `src/components/command-center/CCIntelFeed.tsx` | Νέο — AI insights + activity feed |
| `src/components/command-center/CCQuickActions.tsx` | Νέο — floating action bar |
| `src/components/layout/AppSidebar.tsx` | Αλλαγή overview category → 1 item "Command Center" |
| `src/App.tsx` | Route `/command-center`, redirect `/dashboards/*` → `/command-center`, default `/` → CommandCenter |

Dashboard.tsx **δεν διαγράφεται** — αφαιρείται μόνο από routes (εύκολη επαναφορά).

