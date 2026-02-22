

# Focus Mode -- Zen Productivity Experience

## Summary

A full-screen, distraction-free "Focus Mode" that overlays the entire app with a dark, immersive workspace. The user works on one task at a time with Spotify-style playback controls and a discreet sidebar of upcoming tasks.

---

## Architecture

Focus Mode will be a new full-screen overlay component rendered at the `AppLayout` level. It uses existing `useTimeTracking` for timer functionality and fetches the user's daily task queue from Supabase.

**Entry points:**
- A permanent button in the TopBar (next to the panel toggle)
- A "Focus Mode" action in My Work page

**State:** Managed via React context (`FocusContext`) so any component can trigger it.

---

## New Files

### 1. `src/contexts/FocusContext.tsx`
- `FocusModeProvider` wrapping the app inside `AppLayout`
- Exports: `useFocusMode()` with `{ isActive, enterFocus(taskId?), exitFocus, currentTask, upNextTasks }`
- State: `isActive`, `currentTaskId`, `sessionStartTime`, `isPaused`, `pomodoroMinutes` (default 25)
- On enter: fetches user's today tasks (reusing MyWork logic), sets first task as current
- On exit: stops any running timer, restores normal view

### 2. `src/components/focus/FocusOverlay.tsx`
The main full-screen overlay with 3 zones:

**a) Status Shield (Top bar - thin)**
- "Shield Active: Notifications Muted" indicator
- Emergency Exit "X" button (top-right)
- Current time display

**b) Main Workspace (Center)**
- Current task title in large typography (text-3xl/4xl)
- Project name subtitle
- Task description (if any) in muted text
- Priority badge
- Due date display
- Progress indicator (if task has progress %)

**c) Up Next Sidebar (Right - ~280px)**
- Glassmorphism styling: `bg-white/5 backdrop-blur-xl border border-white/10`
- Tasks listed with low opacity (opacity-40), becoming opacity-100 on hover
- Each task shows title, project, due date
- Drag-and-drop support: user can drag a task from sidebar to center to switch focus
- Clicking a task switches focus to it

**d) Control Bar (Bottom Center - Floating Dock)**
- Floating pill shape: `rounded-full bg-white/10 backdrop-blur-xl`
- Large circular Play/Pause button (center, 64px)
- Stop/Finish button (completes current task)
- Forward/Skip button (next task)
- Progress Ring around Play button (SVG circle that fills based on Pomodoro timer)
- Elapsed time display (font-mono)
- Pomodoro countdown display

### 3. `src/components/focus/FocusControlBar.tsx`
Extracted control bar component:
- Play: starts timer via `useTimeTracking.startTimer()`, updates user `work_status` to 'busy'
- Pause: stops timer, changes dock color from blue tint to amber tint
- Stop/Finish: marks task as completed, triggers confetti/success animation, auto-advances to next task
- Forward: skips to next task in queue without completing current
- Progress Ring: SVG `<circle>` with `stroke-dashoffset` animated based on elapsed vs Pomodoro duration

### 4. `src/components/focus/FocusSuccessAnimation.tsx`
- Brief celebratory animation on task completion (checkmark scale-in with particle burst)
- Auto-dismisses after 1.5s, transitions to next task

---

## Modified Files

### 5. `src/components/layout/AppLayout.tsx`
- Import and render `FocusModeProvider` wrapping the content
- Render `<FocusOverlay />` conditionally when `isActive`
- When active, the overlay covers everything (fixed inset-0 z-50)

### 6. `src/components/layout/TopBar.tsx`
- Add a "Focus" button (with `Target` or `Crosshair` icon from lucide) next to the panel toggle
- On click: `enterFocus()` from context

### 7. `src/pages/MyWork.tsx`
- Add a "Focus Mode" button in the header area
- On click: `enterFocus()` starting with the first today task

---

## Visual Design

**Color Palette (Focus Mode only):**
- Background: `bg-[#0f1219]` (deep blue-charcoal, hardcoded for zen experience)
- Text: `text-white`, `text-white/60` for muted
- Accent: cool blue `#3b82f6` for active/playing state
- Pause accent: warm amber `#f59e0b`
- Success: green `#22c55e`
- Glassmorphism: `bg-white/5 backdrop-blur-xl border border-white/10`

**Typography:**
- Current task title: `text-4xl font-bold tracking-tight` (Plus Jakarta Sans)
- Timer: `text-6xl font-mono font-light`
- Sidebar tasks: `text-sm`

**Transitions:**
- Enter/exit Focus Mode: `animate-fade-in` (0.5s ease-out) on overlay
- Task switch: crossfade animation (fade out old, fade in new)
- Pause state: background subtly shifts from blue-tint to amber-tint (CSS transition 0.5s)
- Success animation: checkmark scales in, brief confetti particles via CSS

**Control Bar styling:**
- `fixed bottom-8 left-1/2 -translate-x-1/2`
- `rounded-full px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/10`
- Play button: `w-16 h-16 rounded-full bg-white text-[#0f1219]` with hover scale
- Other buttons: `w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20`

---

## Progress Ring Implementation

SVG circle around the Play button:
- Radius ~36px, stroke-width 3px
- `stroke-dasharray = circumference`
- `stroke-dashoffset = circumference * (1 - elapsed/total)`
- Color transitions from blue to amber when nearing end
- Smooth CSS transition on stroke-dashoffset

---

## Drag and Drop

- Reuse existing `@dnd-kit` setup
- Sidebar tasks are `Sortable` items
- "Center zone" is a `Droppable` area
- On drop: switch `currentTaskId` to dropped task

---

## Notification Muting

- When Focus Mode activates, set a flag in `FocusContext`
- `NotificationBell` component checks this flag and suppresses toast notifications
- The "Shield Active" banner provides visual confirmation
- On exit, notifications resume normally

---

## Files Summary

| File | Action |
|------|--------|
| `src/contexts/FocusContext.tsx` | **New** - Focus mode state management |
| `src/components/focus/FocusOverlay.tsx` | **New** - Main full-screen overlay |
| `src/components/focus/FocusControlBar.tsx` | **New** - Spotify-style playback controls |
| `src/components/focus/FocusSuccessAnimation.tsx` | **New** - Task completion animation |
| `src/components/layout/AppLayout.tsx` | **Edit** - Add FocusProvider + overlay render |
| `src/components/layout/TopBar.tsx` | **Edit** - Add Focus button |
| `src/pages/MyWork.tsx` | **Edit** - Add Focus Mode entry button |

No database changes needed. No new dependencies needed (uses existing dnd-kit, lucide, framer-free CSS animations).

