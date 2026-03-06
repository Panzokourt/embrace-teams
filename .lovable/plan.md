

# Τεχνική Αναβάθμιση & Hardening — Multi-Tenant Production Readiness

Αυτό είναι ένα τεράστιο scope. Θα το χωρίσω σε 4 εκτελέσιμες φάσεις, κάθε μία αυτοτελής και ασφαλής.

---

## Τρέχουσα Κατάσταση (Audit Summary)

### Tables με `company_id` NULL (10 πίνακες)
`projects`, `clients`, `tenders`, `contracts`, `services`, `briefs`, `billing_notifications`, `project_templates`, `task_templates`, `project_creatives`, `teams`

### `activity_log` — χωρίς `company_id` καθόλου

### `is_super_admin` — global, χωρίς company_id filter

### Legacy `user_roles` — χρησιμοποιείται ακόμα στο AuthContext, Users.tsx, και σε RLS policies

### Edge Functions — 15 functions, ΟΛΕΣ με `verify_jwt = false`

### Indexes — υπάρχουν αρκετοί αλλά λείπουν composite indexes σε `projects(company_id)`, `tasks(assigned_to)`, `user_company_roles(user_id,company_id)`, κ.α.

### RLS — Πολλά policies χρησιμοποιούν `is_admin_or_manager(auth.uid())` χωρίς company_id parameter (global check)

---

## PHASE 1 — Database Schema Hardening (Migration)

### 1A. Backfill & NOT NULL enforcement

```sql
-- Step 1: Backfill orphan rows where possible
-- projects: derive from client if possible
UPDATE projects SET company_id = c.company_id 
FROM clients c WHERE projects.client_id = c.id AND projects.company_id IS NULL;

-- clients, tenders, contracts, services, briefs, etc: 
-- derive from user_company_roles of creator or related project
-- Delete truly orphan rows that can't be mapped

-- Step 2: SET NOT NULL on all 11 tables
ALTER TABLE projects ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE tenders ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE contracts ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE services ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE briefs ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE billing_notifications ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE project_templates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE task_templates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE project_creatives ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE teams ALTER COLUMN company_id SET NOT NULL;
```

### 1B. Add `company_id` to `activity_log`
```sql
ALTER TABLE activity_log ADD COLUMN company_id uuid REFERENCES companies(id);
-- Backfill from related entities where possible
-- Then SET NOT NULL
```

### 1C. Composite Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ucr_user_company ON user_company_roles(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_project ON time_entries(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_tenders_company ON tenders(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_services_company ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company_created ON activity_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_company ON user_permissions(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_user_access_assignments_user ON user_access_assignments(user_id, company_id);
```

### 1D. New Enterprise Tables
- `notifications` (company_id NOT NULL, user_id, type, title, body, entity_type, entity_id, is_read, created_at, created_by)
- `api_keys` (company_id NOT NULL, name, key_prefix, hashed_key, scopes jsonb, created_by, last_used_at, expires_at, revoked_at)
- `webhooks` (company_id NOT NULL, name, target_url, subscribed_events text[], secret, is_active, failure_count, last_triggered_at, created_by)
- `feature_flags` (company_id NULL for global, key unique per company, description, enabled, rollout_type, metadata jsonb)

All with proper RLS policies (company-scoped SELECT/INSERT/UPDATE/DELETE).

---

## PHASE 2 — Security Functions & RLS Hardening

### 2A. Refactor `is_super_admin` → company-scoped
```sql
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid, _company_id uuid)
RETURNS boolean ...
-- Check owner/super_admin role ONLY in the specified company
```
Update all RLS policies that call `is_super_admin` to pass company_id.

### 2B. Fix `is_admin_or_manager` — already partially company-scoped but used without company param in some policies
Audit all RLS policies using `is_admin_or_manager(auth.uid())` — these are global checks. Replace with `is_company_admin_or_manager(auth.uid(), company_id)` where the table has company_id.

### 2C. Fix `activity_log` RLS
Replace `is_admin_or_manager(auth.uid())` with company-scoped check using the new `company_id` column.

### 2D. Storage Policies Audit
Verify `project-files`, `hr-documents`, `chat-attachments` buckets have policies that check company membership through parent entity relations.

---

## PHASE 3 — Edge Functions Security

### 3A. JWT Enforcement
Keep `verify_jwt = false` in config.toml (required for Lovable Cloud signing-keys approach) but add explicit `getClaims()` validation at the top of EVERY function:

Functions requiring auth validation (add getClaims check):
- `create-user`, `brain-analyze`, `brain-deep-analyze`, `secretary-agent`, `my-work-ai-chat`, `chat-ai-assistant`, `suggest-package`, `email-fetch`, `email-send`, `send-invitation`, `analyze-project-files`, `generate-media-plan`, `parse-document`

Functions that stay public (callback flows):
- `gmail-auth-callback`
- `seed-dummy-data` (dev only — add environment check)
- `gmail-auth-start` (initiates OAuth — needs anon access)

### 3B. Company Context Validation
In functions like `create-user`, `brain-analyze`, `secretary-agent` — validate that the requesting user belongs to the target company before processing.

### 3C. Basic Rate Limiting
Add a simple in-memory rate limiter pattern (per-user, per-function) with a `Map<string, {count, resetAt}>` structure in each sensitive function.

---

## PHASE 4 — Frontend Refactor

### 4A. AuthContext Cleanup
- Remove legacy `user_roles` fetch — mark as deprecated
- Ensure `permissions` query always filters by `company_id`
- On `switchCompany()` — re-fetch permissions, access assignments
- Remove `isAdmin`/`isEmployee`/`isClient` legacy booleans (or derive solely from `companyRole`)

### 4B. Activity Logger — Pass `company_id`
Update `useActivityLogger` and `logActivity` to accept and insert `company_id` from active company context.

### 4C. Pagination
Add `.range(from, to)` pagination to major listing queries:
- Projects, Tasks, Clients, Tenders, Contracts, Invoices, Expenses, Chat Messages, Activity Logs, KB Articles

### 4D. Legacy `user_roles` Deprecation
- Keep table for backward compat
- Stop writing to it in new flows
- Remove authorization decisions based on it
- Add comment/TODO markers for future removal

---

## Files to Create/Edit

**Migrations (1 large SQL file):**
- Backfill + NOT NULL constraints
- New indexes
- New tables (notifications, api_keys, webhooks, feature_flags)
- Updated functions (is_super_admin)
- Updated RLS policies
- activity_log company_id addition

**Edge Functions (13 files):**
- Add auth validation to each

**Frontend (5-8 files):**
- `src/contexts/AuthContext.tsx` — deprecate legacy, company-scope permissions
- `src/hooks/useActivityLogger.ts` — add company_id
- `src/components/activity/ActivityLog.tsx` — company-scoped queries
- `src/pages/Users.tsx` — remove user_roles writes
- Various listing pages — add pagination

---

## Risks & Manual Verification Points

1. **Backfill accuracy** — Orphan rows with NULL company_id may exist in production. Migration will attempt derivation from parent relations; rows that can't be mapped will be flagged
2. **RLS policy changes** — Any policy update could temporarily block access if applied incorrectly. Will test with existing data patterns
3. **Edge function auth** — Adding JWT validation may break existing unauthenticated flows if any frontend calls don't pass the auth header
4. **Legacy role removal** — Some external integrations or seed data may still depend on user_roles
5. **Storage policies** — Need manual verification that file paths follow company-scoped conventions

---

## Implementation Order

Due to the massive scope, I recommend executing this in **3 batches** across separate messages:

**Batch 1**: Database migrations (Phase 1 + Phase 2 SQL) — schema hardening, new tables, indexes, function updates, RLS fixes

**Batch 2**: Edge functions security (Phase 3) — auth validation in all functions

**Batch 3**: Frontend refactor (Phase 4) — AuthContext, activity logger, pagination, legacy cleanup

Shall I proceed with Batch 1 first?

