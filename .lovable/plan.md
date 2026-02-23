

# Gamification System -- Employee Score & Rewards

## Summary

An integrated gamification system where each user earns points (XP) based on productivity, punctuality, and data completeness. Colleagues can also award "kudos" points to each other across different skill categories. The system includes leaderboards, level progression, and profile badges to boost engagement and reward performance.

---

## Database Schema

### New Tables

**1. `user_xp` -- Stores individual XP transactions (audit trail)**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to profiles |
| company_id | uuid | FK to companies |
| points | integer | Can be positive or negative |
| reason | text | e.g. "task_completed_on_time", "kudos_received" |
| source_type | text | "system" or "kudos" |
| source_entity_id | uuid | Optional: task/project ID that triggered it |
| given_by | uuid | Nullable: who gave kudos (null for system) |
| skill_tag | text | Nullable: e.g. "leadership", "creativity", "speed" |
| created_at | timestamptz | Default now() |

**2. `user_xp_summary` -- Materialized/cached totals for fast reads**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to profiles, unique |
| company_id | uuid | FK to companies |
| total_xp | integer | Running total |
| level | integer | Computed from total_xp |
| tasks_completed | integer | Counter |
| on_time_streak | integer | Current consecutive on-time completions |
| kudos_received | integer | Total kudos count |
| updated_at | timestamptz | |

**3. `skill_tags` -- Predefined skill categories for the company**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK to companies |
| name | text | e.g. "Leadership", "Creativity", "Speed", "Teamwork" |
| icon | text | Emoji or lucide icon name |
| color | text | Hex color |
| created_at | timestamptz | |

### RLS Policies
- All users can SELECT xp data within their company
- System inserts via security definer function (for automated XP)
- Users can INSERT kudos (source_type = 'kudos') with `given_by = auth.uid()`
- Only admin/manager can manage skill_tags
- Users cannot give kudos to themselves (enforced via check constraint or trigger)

### Database Functions

**`award_xp(p_user_id, p_points, p_reason, p_source_type, p_source_entity_id, p_given_by, p_skill_tag)`**
- Security definer function
- Inserts into `user_xp`
- Upserts `user_xp_summary` (increments total_xp, recalculates level)
- Level formula: `level = floor(sqrt(total_xp / 100)) + 1` (Level 1 = 0-99, Level 2 = 100-399, etc.)

---

## XP Point Rules (System-Awarded)

| Action | Points | Reason Code |
|--------|--------|-------------|
| Complete a task | +10 | task_completed |
| Complete task before due date | +5 bonus | task_completed_early |
| Complete task on due date | +3 bonus | task_completed_on_time |
| Complete task after due date | -2 penalty | task_completed_late |
| Fill task description (>50 chars) | +2 | task_detailed |
| Log time entry | +3 | time_logged |
| Upload file attachment | +2 | file_uploaded |
| Start work day on time | +3 | attendance_on_time |
| Complete 5 tasks in a day | +10 bonus | daily_streak |
| Receive kudos from colleague | +5 per kudos | kudos_received |
| Give kudos to colleague | +1 (giver reward) | kudos_given |

These will be triggered via the existing `useActivityLogger` pattern -- we'll create a `useXPEngine` hook that listens to task completions and other events, calling `award_xp` RPC.

---

## New Files

### 1. `src/hooks/useXPEngine.ts`
- Hook that provides `awardXP(userId, points, reason, ...)` function
- Calls the `award_xp` database function via RPC
- Used by existing flows (task completion, time logging, etc.)

### 2. `src/hooks/useUserXP.ts`
- Hook to fetch `user_xp_summary` for a user
- Returns `{ totalXP, level, levelProgress, tasksCompleted, onTimeStreak, kudosReceived, loading }`
- Level progress = percentage toward next level threshold

### 3. `src/hooks/useLeaderboard.ts`
- Hook to fetch company leaderboard from `user_xp_summary` joined with `profiles`
- Returns sorted list with rank, user info, XP, level
- Supports time filters (all-time, this month, this week)

### 4. `src/components/gamification/XPBadge.tsx`
- Small inline badge showing user level + XP
- Circular level indicator with color gradient based on level
- Used in TopBar, EmployeeProfile, UserDetail, sidebar user menu

### 5. `src/components/gamification/LevelProgressBar.tsx`
- Animated progress bar showing XP toward next level
- Shows current level, XP count, and next level threshold
- Celebratory animation when leveling up

### 6. `src/components/gamification/KudosDialog.tsx`
- Dialog triggered from user profiles or team views
- Select a skill tag (from company's skill_tags)
- Optional message
- Awards +5 XP to recipient, +1 XP to giver
- Prevents self-kudos

### 7. `src/components/gamification/Leaderboard.tsx`
- Table/card view showing company rankings
- Columns: Rank, Avatar, Name, Level, XP, Streak, Kudos
- Top 3 highlighted with gold/silver/bronze styling
- Time period filter (Week / Month / All Time)

### 8. `src/components/gamification/XPActivityFeed.tsx`
- Recent XP transactions for a user
- Shows what actions earned points, when, and how many
- Used in EmployeeProfile and UserDetail pages

### 9. `src/components/gamification/SkillRadar.tsx`
- Visual chart showing skill distribution based on kudos tags received
- Uses recharts RadarChart
- Skills like: Leadership, Creativity, Speed, Quality, Teamwork, Communication

### 10. `src/pages/Leaderboard.tsx`
- Dedicated leaderboard page
- Contains Leaderboard component + company-wide stats
- Accessible from sidebar

---

## Modified Files

### 11. `src/components/layout/AppSidebar.tsx`
- Add "Leaderboard" link with Trophy icon in the navigation
- Position it near the bottom nav items (after HR, before admin section)

### 12. `src/components/layout/TopBar.tsx`
- Add small XPBadge next to the user area or Work Mode button showing current user's level

### 13. `src/pages/EmployeeProfile.tsx`
- Add new tab "Gamification" or "Score" showing:
  - LevelProgressBar
  - SkillRadar
  - XPActivityFeed
  - KudosDialog button ("Give Kudos" button)

### 14. `src/pages/UserDetail.tsx`
- Add XPBadge in the header next to user info
- Add "Give Kudos" button
- Add XP summary card in the info column

### 15. `src/components/hr/EmployeeHeader.tsx`
- Add XPBadge inline with name/badges showing level

### 16. `src/App.tsx`
- Add route for `/leaderboard` page

### 17. Task completion flows (FocusControlBar, MyWork, TaskDetail)
- Integrate `useXPEngine` to award points on task status changes

---

## Visual Design

**Level Badge:**
- Circular badge with level number
- Color progression: Gray (1-4), Green (5-9), Blue (10-14), Purple (15-19), Gold (20+)
- Subtle glow effect on higher levels

**Leaderboard:**
- Clean card layout
- Top 3 with crown/medal icons
- Alternating row backgrounds
- Animated rank changes

**Kudos:**
- Colorful skill tag chips
- Confetti animation on sending
- Toast notification for recipient

**XP Toast:**
- When user earns XP, brief floating "+10 XP" notification in the corner
- Green for gains, red for penalties

---

## Level Thresholds

| Level | XP Required | Title |
|-------|-------------|-------|
| 1 | 0 | Rookie |
| 2 | 100 | Apprentice |
| 3 | 300 | Contributor |
| 4 | 600 | Professional |
| 5 | 1000 | Expert |
| 6 | 1500 | Specialist |
| 7 | 2100 | Master |
| 8 | 2800 | Elite |
| 9 | 3600 | Champion |
| 10 | 4500 | Legend |

Formula: `threshold(n) = 50 * n * (n - 1)` -- quadratic growth

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | **New** - 3 tables + RLS + award_xp function |
| `src/hooks/useXPEngine.ts` | **New** - XP awarding logic |
| `src/hooks/useUserXP.ts` | **New** - Fetch user XP data |
| `src/hooks/useLeaderboard.ts` | **New** - Leaderboard data |
| `src/components/gamification/XPBadge.tsx` | **New** - Level badge component |
| `src/components/gamification/LevelProgressBar.tsx` | **New** - XP progress bar |
| `src/components/gamification/KudosDialog.tsx` | **New** - Give kudos dialog |
| `src/components/gamification/Leaderboard.tsx` | **New** - Rankings component |
| `src/components/gamification/XPActivityFeed.tsx` | **New** - XP history feed |
| `src/components/gamification/SkillRadar.tsx` | **New** - Skill radar chart |
| `src/pages/Leaderboard.tsx` | **New** - Leaderboard page |
| `src/components/layout/AppSidebar.tsx` | **Edit** - Add leaderboard nav |
| `src/components/layout/TopBar.tsx` | **Edit** - Add XP badge |
| `src/pages/EmployeeProfile.tsx` | **Edit** - Add gamification tab |
| `src/pages/UserDetail.tsx` | **Edit** - Add XP info + kudos |
| `src/components/hr/EmployeeHeader.tsx` | **Edit** - Add level badge |
| `src/App.tsx` | **Edit** - Add leaderboard route |
| `src/components/focus/FocusControlBar.tsx` | **Edit** - Award XP on task complete |

