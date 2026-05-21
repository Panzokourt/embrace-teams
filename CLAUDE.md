# Olseny — Agency Management SaaS

## Project overview

Olseny is a full-featured agency management platform built for digital marketing agencies.
It covers projects, tasks, clients, media planning, knowledge base, chat, timesheets,
financials, HR, campaigns, tenders, and an AI secretary.

**Live app:** https://app.olseny.com  
**Repo:** https://github.com/Panzokourt/embrace-teams  
**Supabase project:** qsykyiqplslvmxdfudxq  
**Supabase URL:** https://qsykyiqplslvmxdfudxq.supabase.co

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite 5 |
| UI components | shadcn/ui (Radix UI primitives) + Tailwind CSS 3 |
| Routing | react-router-dom v6 |
| Server state | @tanstack/react-query v5 |
| Forms | react-hook-form + zod |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Rich text | Tiptap v3 |
| Charts | Recharts |
| Drag & drop | @dnd-kit |
| Package manager | bun (bun.lock present) — use `bun` not `npm` |
| Testing | vitest + @testing-library/react + playwright |
| Lovable integration | lovable-tagger (devDep) — keeps Lovable in sync |

---

## Dev commands

```bash
bun install          # install deps
bun run dev          # dev server → http://localhost:5173
bun run build        # production build → dist/
bun run preview      # preview production build
bun run lint         # eslint check
bun run test         # vitest run (unit)
bun run test:watch   # vitest watch
```

---

## Environment variables

Create `.env.local` for local overrides (never commit secrets):

```env
VITE_SUPABASE_PROJECT_ID=qsykyiqplslvmxdfudxq
VITE_SUPABASE_URL=https://qsykyiqplslvmxdfudxq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from .env>
```

The `.env` file in the repo contains the anon/publishable key (safe to commit).
Never commit service_role keys.

---

## Directory structure

```
src/
├── App.tsx                  # Root: providers, router, auth guard
├── main.tsx                 # Entry point
├── assets/                  # Static assets (logos)
├── components/
│   ├── ui/                  # shadcn/ui base components — DO NOT hand-edit
│   ├── layout/              # Sidebar, topbar, shell
│   ├── topbar/              # Top navigation bar
│   ├── dock/                # Floating dock
│   ├── shared/              # Reusable cross-feature components
│   ├── activity/            # Activity feed & log
│   ├── auth/                # Auth forms
│   ├── blueprints/          # Brief templates & exports
│   ├── brain/               # AI insights (Brain Pulse)
│   ├── calendar/            # Calendar views (day/week/month/year/zoom)
│   ├── campaigns/           # Campaign management
│   ├── chat/                # Internal chat (channels, DMs, threads)
│   ├── clients/             # Client CRM + detail cards
│   ├── coaching/            # Coaching features
│   ├── command-center/      # Command palette
│   ├── comments/            # Comment threads
│   ├── contacts/            # Contact management
│   ├── dashboard/           # Dashboard widgets
│   ├── dialogs/             # Global dialogs
│   ├── dnd/                 # Drag-and-drop wrappers
│   ├── files/               # File manager
│   ├── finance/             # Financials & billing
│   ├── focus/               # Focus mode
│   ├── gamification/        # Leaderboard & points
│   ├── hr/                  # HR & org chart
│   ├── import/              # CSV import
│   ├── inbox/               # Notifications inbox
│   ├── knowledge/           # Knowledge base (articles, playbooks, templates)
│   ├── media-plan/          # Media planning workspace
│   ├── mentions/            # @mentions
│   ├── my-work/             # Personal work view
│   ├── notifications/       # Notification system
│   ├── onboarding/          # Welcome wizard
│   ├── org-chart/           # Organization chart
│   ├── organization/        # Company/workspace settings
│   ├── portal/              # Client portal
│   ├── pricing/             # Pricing page
│   ├── projects/            # Project management
│   ├── quick-chat/          # Floating chat bubble
│   ├── reports/             # Reports & analytics
│   ├── secretary/           # AI Secretary agent
│   ├── settings/            # Settings panels
│   ├── system/              # System-level components
│   ├── tasks/               # Task management
│   ├── tenders/             # Tender/procurement
│   ├── time-tracking/       # Timesheets
│   ├── users/               # User management
│   ├── voice/               # Voice features
│   ├── work/                # Work overview
│   └── workflows/           # Workflow automation
├── contexts/                # React contexts (auth, theme, workspace, etc.)
├── hooks/                   # Custom React hooks
├── integrations/
│   └── supabase/
│       ├── client.ts        # Supabase client singleton — import from here
│       └── types.ts         # Auto-generated DB types — NEVER edit manually
├── lib/                     # Utility libraries
├── pages/                   # Route-level page components (one per route)
├── queries/                 # React Query query functions & hooks
├── utils/                   # Pure utility functions
└── test/                    # Test utilities & setup
```

---

## Pages (routes)

Main app routes (all require auth):

| Page | Path |
|---|---|
| Dashboard | `/` |
| My Work | `/my-work` |
| Tasks | `/tasks` |
| Projects | `/projects` |
| Clients | `/clients` |
| Contacts | `/contacts` |
| Calendar | `/calendar` |
| Media Planning | `/media-planning` |
| Campaigns | `/campaigns` |
| Knowledge | `/knowledge` |
| Files | `/files` |
| Chat | `/chat` |
| Secretary (AI) | `/secretary` |
| Inbox | `/inbox` |
| Reports | `/reports` |
| Financials | `/financials` |
| Timesheets | `/timesheets` |
| HR | `/hr` |
| Tenders | `/tenders` |
| Teams | `/teams` |
| Users | `/users` |
| Settings | `/settings` |
| MCP Consent | `/mcp-consent` |
| Client Portal | `/portal/*` |

---

## Supabase conventions

- **Always import the client from** `src/integrations/supabase/client.ts`
- **Types** are in `src/integrations/supabase/types.ts` — auto-generated, never edit
- All DB queries go through React Query (in `src/queries/`) or custom hooks (in `src/hooks/`)
- RLS is enabled on all tables — queries run as the authenticated user
- Edge Functions live in `supabase/functions/` and are deployed separately
- The MCP server is at: `https://qsykyiqplslvmxdfudxq.supabase.co/functions/v1/mcp-server`

---

## Component conventions

- shadcn/ui components in `src/components/ui/` are **off-limits** — never edit them directly
- New shadcn components: `bunx shadcn@latest add <component>`
- Feature components go in their feature folder under `src/components/<feature>/`
- Shared/reusable components go in `src/components/shared/`
- Use `cn()` from `src/lib/utils.ts` for conditional class merging
- Icons: lucide-react only (already installed)
- Avoid inline styles — use Tailwind utility classes

---

## Lovable compatibility rules

**CRITICAL — these rules prevent conflicts with Lovable:**

1. **Never remove** `lovable-tagger` from devDependencies
2. **Never rename or move** files that Lovable tracks — it uses file paths as IDs
3. **Keep the `.lovable/` folder** untouched
4. **Branch strategy:** make feature changes on `main` — Lovable syncs from `main`
5. **After Claude Code changes:** commit + push to GitHub → Lovable auto-pulls
6. **After Lovable changes:** `git pull origin main` before starting Claude Code work
7. **Conflict prevention:** don't edit the same component in both tools simultaneously

---

## Tauri desktop app (when adding)

When adding Tauri for the desktop wrapper:

```bash
bun add -D @tauri-apps/cli
bun add @tauri-apps/api
bunx tauri init
```

Tauri config (`src-tauri/tauri.conf.json`) should point to:
- `devPath`: `http://localhost:5173`
- `distDir`: `../dist`
- `beforeDevCommand`: `bun run dev`
- `beforeBuildCommand`: `bun run build`

Dev: `bunx tauri dev`  
Build macOS: `bunx tauri build`

---

## Git workflow

```bash
# Before starting work
git pull origin main

# After making changes
git add .
git commit -m "feat: <description>"
git push origin main
# → Lovable auto-syncs within ~30 seconds
```

---

## Key features to know

- **Secretary**: AI agent powered by Anthropic Claude (streaming chat, multi-provider)
- **Brain Pulse**: AI insights dashboard
- **Knowledge Base**: articles, playbooks, templates with semantic search
- **Media Plan Workspace**: full media planning tool
- **MCP Server**: exposes Olseny data to external AI clients (Claude Desktop, Cursor, etc.)
- **Client Portal**: white-label portal for clients at `/portal/*`
- **Blueprints**: brief templates with PDF/DOCX export

---

## Do NOT do

- Edit `src/integrations/supabase/types.ts` manually
- Edit anything in `src/components/ui/` directly
- Use `npm` — this project uses `bun`
- Commit `.env.local` or any file with `service_role` keys
- Break the Lovable tagger setup
- Use `any` TypeScript type without a comment explaining why
