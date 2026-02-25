

# Knowledge Base Module -- Πλήρης Σχεδιασμός

## Σύνοψη

Νέο module "Knowledge Base" στο sidebar για κεντρική διαχείριση γνώσης: playbooks, SOPs, templates, per-client documentation, meeting notes. Κάθε άρθρο έχει ownership, lifecycle (draft/approved/deprecated), review cycles και full-text search.

---

## 1. Navigation

Νέα κατηγορία `knowledge` στο Icon Rail (BookOpen icon), ανάμεσα σε "Αρχείο" και "Χρόνος":

```text
Icon Rail:
  ...
  Αρχείο
  Knowledge Base  <-- ΝΕΟ (BookOpen icon)
  Χρόνος
  ...
```

Sub-links στο Category Panel:
- **Αρχική KB** (`/knowledge`) -- Quick links, search, browse
- **Company Playbook** (`/knowledge/playbook`) -- Εταιρικά articles (Operations, Quality, Security, Tools)
- **Templates & SOPs** (`/knowledge/templates`) -- Template library with "Use template" action
- **Review Queue** (`/knowledge/reviews`) -- Articles pending review

---

## 2. Database Schema (5 tables)

### A) `kb_categories`
3-level taxonomy (Company > Operations, Department > Performance, κλπ.)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| name | text | |
| slug | text | URL-friendly |
| parent_id | uuid FK kb_categories | Nullable (for nesting) |
| level | integer | 1, 2, or 3 |
| sort_order | integer | Default 0 |
| created_at | timestamptz | |

### B) `kb_articles`
Articles, playbooks, meeting notes, client docs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| title | text | |
| body | text | Markdown/rich text |
| article_type | text | article/meeting_note/decision |
| category_id | uuid FK kb_categories | Nullable |
| tags | text[] | Array of tags |
| owner_id | uuid FK profiles | Who owns this article |
| status | text | draft/approved/deprecated |
| visibility | text | internal/client-visible |
| client_id | uuid FK clients | Nullable |
| project_id | uuid FK projects | Nullable |
| gov_asset_id | uuid FK gov_assets | Nullable |
| source_links | text[] | Drive/Confluence/URLs |
| version | integer | Default 1 |
| next_review_date | date | Nullable |
| attendees | text[] | For meeting notes |
| decisions | jsonb | For meeting notes/decisions |
| action_items | jsonb | Links to tasks |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### C) `kb_templates`
Reusable templates (briefs, SOPs, checklists, reports)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| title | text | |
| template_type | text | brief/media-plan/report/checklist/sop |
| description | text | |
| content | jsonb | Structured fields + text |
| default_tasks | jsonb | Optional tasks to auto-generate |
| owner_id | uuid FK profiles | |
| status | text | draft/approved/deprecated |
| usage_count | integer | Default 0 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### D) `kb_article_versions`
Version history (immutable)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| article_id | uuid FK kb_articles | |
| version | integer | |
| title | text | |
| body | text | Snapshot |
| changed_by | uuid FK profiles | |
| change_notes | text | |
| created_at | timestamptz | |

### E) `kb_template_usage`
Log when templates are used

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| template_id | uuid FK kb_templates | |
| used_by | uuid FK profiles | |
| project_id | uuid FK projects | Nullable |
| client_id | uuid FK clients | Nullable |
| created_at | timestamptz | |

---

## 3. RLS Policies

- Ολα τα tables: `is_company_admin_or_manager(auth.uid(), company_id)` για full access
- Read access: active company members μέσω `user_company_roles`
- `kb_article_versions`: INSERT-only (immutable history)
- Client-visible articles: future extension for client portal

---

## 4. UI Screens

### A) KB Home (`/knowledge`)
- Search bar (full-text across articles + templates)
- Quick sections: Recently Updated, Review Due, Most Used Templates
- Browse by Category tree (collapsible)
- KPI cards: Total Articles, Drafts, Pending Review, Deprecated

### B) Company Playbook (`/knowledge/playbook`)
- Filtered view: articles with company-level categories
- Tree navigation on left, article content on right
- Category management for admins

### C) Article Page (`/knowledge/articles/:id`)
- Full markdown body with sidebar:
  - Metadata: Owner, Status badge, Version, Last Updated
  - Related items: Client, Project, Governance Asset
  - Source links
  - Tags
- Action buttons: Edit, New Version, Deprecate, Request Review
- Version history timeline

### D) Templates & SOPs (`/knowledge/templates`)
- Grid/list view with filters by type (brief/sop/checklist/report)
- Each card shows: title, type, description, usage count, owner
- "Use Template" button -> creates linked entity in project
- Usage log visible to admins

### E) Review Queue (`/knowledge/reviews`)
- Table of articles where `next_review_date <= today` or status = 'draft' pending approval
- Columns: Title, Owner, Category, Last Updated, Review Due
- Actions: Approve, Request Changes, Deprecate

---

## 5. Automations (Frontend Logic)

- **Version tracking**: On article edit + save, auto-create `kb_article_versions` entry, increment version
- **Review reminders**: Dashboard shows articles with `next_review_date <= today`
- **Deprecate instead of delete**: Status changes to "deprecated", article remains searchable
- **Template usage logging**: When "Use Template" is clicked, create `kb_template_usage` entry
- **Search**: Client-side filtering across title, body, tags -- articles and templates combined

---

## 6. Αρχεία

### Νέα αρχεία

| File | Purpose |
|------|---------|
| `src/pages/Knowledge.tsx` | KB Home page |
| `src/pages/KnowledgePlaybook.tsx` | Company Playbook (filtered articles) |
| `src/pages/KnowledgeArticle.tsx` | Article detail page |
| `src/pages/KnowledgeTemplates.tsx` | Template library |
| `src/pages/KnowledgeReviews.tsx` | Review queue |
| `src/components/knowledge/KBSearchBar.tsx` | Search component |
| `src/components/knowledge/KBCategoryTree.tsx` | Category tree navigation |
| `src/components/knowledge/KBArticleEditor.tsx` | Article create/edit form |
| `src/components/knowledge/KBArticleCard.tsx` | Article preview card |
| `src/components/knowledge/KBTemplateCard.tsx` | Template card with "Use" button |
| `src/components/knowledge/KBReviewQueue.tsx` | Review queue table |
| `src/components/knowledge/KBVersionHistory.tsx` | Version timeline |
| `src/components/knowledge/KBCategoryManager.tsx` | Category CRUD for admins |
| `src/hooks/useKnowledgeBase.ts` | CRUD hook for all KB tables |
| Migration SQL | 5 tables + RLS + seed categories |

### Τροποποιημένα αρχεία

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Add "knowledge" category to icon rail + nav items |
| `src/App.tsx` | Add `/knowledge/*` routes |

---

## 7. Seed Data -- Default Categories

Αυτόματη δημιουργία κατηγοριών κατά την πρώτη επίσκεψη:

**Level 1:**
| Name | Slug |
|------|------|
| Company | company |
| Departments | departments |
| Clients | clients |
| Templates | templates |

**Level 2 (under Company):**
Operations, Quality, Security, Tools & Platforms

**Level 2 (under Departments):**
Performance, Creative, Social Media, Account Management, Tech/Dev

**Level 2 (under Templates):**
Briefs, Reports, Checklists, SOPs

