

# Knowledge Base Restructure

## Current Problem

7 tabs with overlap and confusion:
- **Άρθρα** and **Playbook** show the same articles, just filtered by category — redundant
- **Templates** (KB templates like SOPs/checklists) overlaps conceptually with the separate **Blueprints** page (briefs + project templates)
- Too many tabs cluttering the navigation

## Proposed New Structure

4 clean tabs instead of 7:

```text
┌──────────┬────────────┬──────────┬──────────┐
│  📚 Wiki │ 📋 Blueprints │ 🤖 Ask AI │ ⚙️ Manage │
└──────────┴────────────┴──────────┴──────────┘
```

### Tab 1: Wiki (merges Άρθρα + Playbook)
- All articles in one view with the category tree sidebar (which already includes Company/Departments/Clients etc.)
- Clicking "Company" categories = the old Playbook behavior
- No need for a separate Playbook tab — it's just a category filter
- Search bar works across all articles

### Tab 2: Blueprints (merges Templates + old Blueprints page)
- Sub-tabs or sections within:
  - **Προ-φόρμες (Briefs)** — the existing `BriefsList` component from `/blueprints`
  - **Project Templates** — the existing `ProjectTemplatesManager` from `/blueprints`
  - **Document Templates** — the existing KB templates (SOPs, checklists, reports)
- Remove `/blueprints` as a standalone route; redirect to `/knowledge?tab=blueprints`
- Update sidebar link accordingly

### Tab 3: Ask AI (unchanged)
- The existing Ask Wiki chat — no changes needed

### Tab 4: Manage (merges Reviews + Πηγές + Health)
- Three sections/sub-tabs:
  - **Reviews** — article review queue
  - **Πηγές (Sources)** — raw source upload & compile
  - **Health Check** — wiki health analysis
- These are all "maintenance" tools, grouped together

## KPI Cards
Keep them but simplify — show only 4:
- Total Articles | Drafts | Pending Review | Sources

## Sidebar Changes
- Remove `/blueprints` route from sidebar
- Change its link to point to `/knowledge?tab=blueprints`
- Update category detection in sidebar

## Files to Change

| File | Change |
|------|--------|
| `src/pages/Knowledge.tsx` | Restructure tabs: Wiki, Blueprints, Ask AI, Manage |
| `src/pages/Blueprints.tsx` | Redirect to `/knowledge?tab=blueprints` |
| `src/App.tsx` | Update `/blueprints` route to redirect |
| `src/components/layout/AppSidebar.tsx` | Update blueprints link to `/knowledge?tab=blueprints` |
| `src/hooks/useOnboardingProgress.ts` | Update route if blueprints was referenced |

## What stays untouched
- All AI Wiki infrastructure (kb-compiler edge function, ask/compile/health)
- Article editor, version history, backlinks
- Category tree and category management
- All existing components — we're reorganizing, not rewriting

