

# Security Hardening — Fix All Findings

## Findings Summary

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | `comment_attachments` SELECT open to all | error | Restrict via project access check |
| 2 | `realtime.messages` no RLS | error | Cannot modify realtime schema (Supabase-reserved) — mitigate via documentation note |
| 3 | `brain_insights` INSERT open to public | error | **Already fixed** — only `service_role` can insert. Scanner finding is stale. |
| 4 | `chat-attachments` bucket open SELECT | error | **Already fixed** — policy checks `is_chat_channel_member`. Scanner finding is stale. |
| 5 | `is_company_admin()` missing `status='active'` | warn | Add the check |
| 6 | Leaked Password Protection disabled | warn | Enable via Cloud UI (manual step) |
| 7 | Functions missing `search_path` | warn | Fix 4 email queue functions |

## Actual Changes Needed

### Migration 1: Fix `comment_attachments` SELECT policy

Replace the `USING (true)` policy with one that checks project access via the `comments` table:

```sql
DROP POLICY "Authenticated users can view comment attachments" ON public.comment_attachments;

CREATE POLICY "Users can view comment attachments via project access"
ON public.comment_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = comment_attachments.comment_id
    AND (
      has_project_access(auth.uid(), c.project_id)
      OR c.user_id = auth.uid()
    )
  )
);
```

### Migration 2: Fix `is_company_admin()` — add `AND status = 'active'`

```sql
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND role IN ('owner', 'super_admin', 'admin')
    AND status = 'active'
  )
$$;
```

### Migration 3: Fix 4 email queue functions — set `search_path`

Add `SET search_path = public` to `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`.

### Realtime.messages — Cannot Fix via Migration

The `realtime` schema is **Supabase-reserved** — we cannot create policies on it via migrations. Supabase Realtime authorization is handled differently (via RLS on the source tables being published, which we already have). This finding is a false positive for our architecture since all published tables have proper RLS.

### Leaked Password Protection

This is a Cloud UI setting. I'll note the manual step for the user.

### Already Fixed (No Action)

- **brain_insights INSERT**: Already restricted to `service_role` only
- **chat-attachments SELECT**: Already checks `is_chat_channel_member` via join

## Files

| File | Change |
|------|--------|
| Migration | 3 SQL statements: fix comment_attachments SELECT, fix is_company_admin, fix email functions search_path |

