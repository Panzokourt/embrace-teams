# Gamification 2.0 — Ολοκληρωμένο σύστημα κινήτρων

## Τι υπάρχει σήμερα

- **DB**: `user_xp` (transactions), `user_xp_summary` (totals/level/streak), RPC `award_xp`, helper hook `useUserXP`, `useXPEngine`.
- **Πόντοι**: μόνο task completion (+10) με early/on-time/late bonus/penalty (+5/+3/-2) και Kudos (+5 receiver, +1 giver).
- **UI**: `XPBadge`, `LevelProgressBar`, `XPActivityFeed` (απλή λίστα), `SkillRadar` (μόνο από kudos), `LeaderboardTable`, `CCHeroZone` με conic XP ring, `DockXPBadge` (clickable → /leaderboard).
- **Σελίδες**: `/leaderboard`, tab «🏆 Score» στο Employee Profile (μόνο 3 components).
- **Κενά**: Το `on_time_streak` δεν αυξάνεται ποτέ. Καμία ανταμοιβή για logged time, file uploads, comments, kudos given. Δεν υπάρχουν achievements/badges, animations, level-up celebration, ή «How to earn XP» guide. Το «Score» tab είναι φτωχό.

---

## Φάση 1 — Επέκταση XP engine (logic + DB)

### 1.1 Νέες πηγές πόντων στο `useXPEngine`
| Action | XP | Reason |
|---|---|---|
| Task completed (base) | +10 | `task_completed` |
| + early (πριν το due) | +5 | `task_completed_early` |
| + on time (ίδια μέρα) | +3 | `task_completed_on_time` |
| + late | −2 | `task_completed_late` |
| **Kudos received** | +5 | `kudos_received` |
| **Kudos given** | +1 | `kudos_given` |
| **Time entry stopped** (≥15 min) | +1/30min, max +5/day | `time_logged` |
| **File uploaded σε task/project** | +2 (max +10/day) | `file_uploaded` |
| **Comment / mention** σε task | +1 (max +5/day) | `comment_added` |
| **Daily streak**: εργάστηκε ≥1 task σε διαδοχικές μέρες | +5 ανά μέρα streak (max +25) | `daily_streak` |
| **Weekly goal** (5+ on-time tasks σε εβδομάδα) | +20 | `weekly_goal_met` |
| **First-time bonus** (1ο task, 1ο project, 1ο kudos) | +15 | `first_*` |

### 1.2 On-time streak fix
- Ενημέρωση RPC `award_xp` ώστε όταν το `reason ∈ {task_completed_early, task_completed_on_time}`, να αυξάνει `on_time_streak += 1`. Όταν `task_completed_late`, να μηδενίζει.
- Daily caps μέσω query στο `user_xp` του τρέχοντος `date_trunc('day', now())`.

### 1.3 Νέοι πίνακες
- **`achievements`** (catalog, seeded): `id, code, title, description, icon, tier (bronze/silver/gold/platinum), xp_reward, criteria jsonb`.
- **`user_achievements`**: `user_id, achievement_id, unlocked_at, progress`. Με RLS per-company.

### 1.4 Achievements catalog (seed)
Examples (~20 αρχικά):
- *First Steps* — 1ο completed task
- *On Fire* — 5 on-time tasks σε σειρά
- *Punctuality King* — 25 on-time tasks
- *Marathoner* — 100 ώρες logged
- *Team Player* — 10 kudos given
- *Crowd Favorite* — 25 kudos received
- *Knowledge Sharer* — 10 files uploaded
- *Level 5 / 10 / 15 / 20* — milestones
- *Streak 7 / 30 days* — consecutive workdays
- *Quality Specialist* — 5 kudos σε ίδιο skill

### 1.5 Auto-detection
Edge trigger ή client-side check μετά από κάθε `award_xp` (στο `useXPEngine`): query progress, αν ξεπεραστεί κατώφλι → insert `user_achievements` + emit event για animation + bonus XP.

---

## Φάση 2 — Visual feedback & animations

### 2.1 Νέο `XPGainToast` (αντικαθιστά απλό sonner)
- Floating animated badge (`+10 XP`) με Zap icon και sparkle, θέση κοντά στο dock badge.
- Stack αν έρχονται πολλαπλά (e.g., task + early bonus = 2 toasts).
- Ποπ + fade animation (`scale-in` → `fade-out`).

### 2.2 `LevelUpModal` (full-screen celebration)
- Trigger όταν `useUserXP` ανιχνεύσει αύξηση level (compare prev/new).
- Confetti (από library `canvas-confetti`), μεγάλο ring, νέο level title (π.χ. *Expert*), unlocked perks/achievements list, CTA «Συνέχισε».

### 2.3 `AchievementUnlockToast`
- Όταν ξεκλειδώνει achievement: gold/silver/bronze badge slides από δεξιά με glow + sound (optional).

### 2.4 Animated `DockXPBadge` & `XPRing`
- Pulse animation στο dock όταν αυξάνεται XP.
- Tween animation στο ring progress (από προηγούμενη τιμή στη νέα μέσω `requestAnimationFrame`).

### 2.5 Νέα keyframes στο `tailwind.config.ts`
- `xp-pop`, `level-up-glow`, `confetti-burst`, `badge-unlock`.

---

## Φάση 3 — Redesigned «Score» tab (Employee Profile)

Αντί για 3 απλά cards, νέο layout 2-στηλο με 6 enότητες:

```text
┌──────────────────────────────────────────────┐
│  HERO: Big level ring + title + XP/next      │
│  + 4 mini stats (XP τρέχουσα εβδομάδα,       │
│    streak, rank στην εταιρεία, kudos)        │
├──────────────────────────────────────────────┤
│  Level Path  │  XP Trend (sparkline 30d)     │
│  (next 3     │  + breakdown by source        │
│   levels +   │  (donut: tasks/kudos/time/...)│
│   perks)     │                               │
├──────────────────────────────────────────────┤
│  Achievements Grid (locked/unlocked με tier) │
├──────────────────────────────────────────────┤
│  Skill Radar (now from kudos + task tags)    │
│  How to earn XP (collapsible tip cards)      │
├──────────────────────────────────────────────┤
│  XP History (filter by reason, paginated)    │
└──────────────────────────────────────────────┘
```

### Νέα components
- `ScoreHeroCard` — μεγάλο ring + 4 stats + rank.
- `LevelPathCard` — δείχνει τα επόμενα 3 levels με required XP και unlocks.
- `XPBreakdownChart` — donut από `user_xp` group by reason (recharts).
- `XPTrendSparkline` — line chart 30 ημερών.
- `AchievementsGrid` — 3-col grid, locked με grayscale + progress bar, unlocked με glow.
- `EarnXPGuide` — collapsible cards «Πώς κερδίζεις XP» (tabs ή accordion με όλες τις πηγές).
- Refactor `XPActivityFeed` με filters & «Load more».

---

## Φάση 4 — Κίνητρα στην εφαρμογή

### 4.1 Inline coaching prompts
- Στο dock badge: tooltip «Σου λείπουν 45 XP για Level 6 🚀».
- Στο task list, αν task overdue: subtle hint «Κλείσε σήμερα για −2 XP αντί για −5 αύριο».
- Στο Focus mode end: «+13 XP κερδίσατε σε αυτό το session».

### 4.2 Weekly digest banner στο My Work
- Compact card πάνω-πάνω (dismissable): «Αυτή την εβδομάδα: 145 XP, +2 levels, #3 στην εταιρεία 🔥».

### 4.3 Empty states με κίνητρο
- Στο `/leaderboard` αν user δεν έχει XP: CTA «Ολοκλήρωσε το πρώτο σου task για 10 XP».

### 4.4 Quick-Kudos shortcut
- Στο Activity feed item «X completed task», κουμπί «🎉 Στείλε kudos».

---

## Φάση 5 — Leaderboard upgrade

- Time-range filter: **Today / Week / Month / All-time** (query από `user_xp` με date filter).
- Top 3 podium UI (μεγαλύτερα avatars, gold/silver/bronze).
- Δικός σας χρήστης highlighted row (sticky αν εκτός top 50).
- Tab «By skill» (από kudos skill_tag → ranking ανά skill).

---

## Τεχνικά (συνοπτικά)

- **Migrations**:
  1. `achievements` + `user_achievements` tables με RLS (company_id scope).
  2. Update RPC `award_xp` για streak logic + daily-cap awareness (νέα param `p_daily_cap`).
  3. Optional: trigger για achievement detection μετά από insert στο `user_xp`.
  4. Seed `achievements` rows (~20 records).

- **Hooks**:
  - `useXPEngine` — νέα methods: `awardTimeXP`, `awardFileXP`, `awardCommentXP`, `awardStreakIfApplicable`.
  - `useAchievements(userId)` — επιστρέφει all + unlocked + progress.
  - `useXPNotifications()` — global emitter (CustomEvent + context) για XP toasts & level-up modal, ώστε να ακούει το `AppLayout`.

- **Integrations**:
  - `useTimeTracking.stopTimer` → καλεί `awardTimeXP`.
  - File upload paths (Files page, task attachments) → `awardFileXP`.
  - Mentions/comments → `awardCommentXP`.

- **Animations**: `canvas-confetti` (ήδη available ή `bun add`), νέα keyframes στο tailwind.

- **Routing**: Δεν αλλάζει· αξιοποιούμε υπάρχον `/leaderboard` και `?section` deep links.

---

## Παραδοτέα τάξης

1. **Phase 1** (DB & engine) — βάση
2. **Phase 2** (animations + toasts + level-up modal) — άμεσο visual impact
3. **Phase 3** (Score tab redesign) — αναλυτική προβολή
4. **Phase 4** (κίνητρα/prompts) — engagement loops
5. **Phase 5** (leaderboard upgrade) — competitive layer

Κάθε φάση είναι αυτόνομα deploy-able. Συνιστώ να εκτελεστούν διαδοχικά στο ίδιο approval cycle, εκτός αν θέλετε να σταματήσετε στο τέλος της Phase 2 και να αξιολογήσετε.
