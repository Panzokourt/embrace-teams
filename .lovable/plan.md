

# Digital Governance Module -- Πλήρης Σχεδιασμός

## Σύνοψη

Νέο module "Governance" στο sidebar (ανάμεσα σε "Οικονομικά" και "Διαχείριση") για παρακολούθηση ψηφιακών λογαριασμών, assets, δικαιωμάτων πρόσβασης, security controls και audit trail σε όλους τους πελάτες. ISO-27001 friendly.

---

## 1. Navigation

Νέα κατηγορία `governance` στο Icon Rail (Shield icon):

```text
Icon Rail:
  ...
  Οικονομικά
  Governance    <-- ΝΕΟ (Shield icon)
  Διαχείριση
```

Sub-links στο Category Panel:
- **Dashboard** (`/governance`) -- KPIs, risk overview
- **Digital Assets** (`/governance/assets`) -- All assets across clients
- **Access Control** (`/governance/access`) -- Access grants + review queue
- **Credentials Vault** (`/governance/vault`) -- Vault references (no passwords)
- **Compliance** (`/governance/compliance`) -- Audit log + review workflows

---

## 2. Database Schema (9 tables)

### A) `gov_platforms`
Κατάλογος πλατφορμών (Meta, Google, LinkedIn, κλπ.)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| name | text | Meta, Google, κλπ. |
| category | text | ads/analytics/social/crm/cms/infrastructure |
| icon_name | text | Optional icon identifier |
| created_at | timestamptz | |

### B) `gov_assets`
Κάθε ψηφιακό asset (Ad Account, Page, Pixel, Domain, κλπ.)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK companies | |
| client_id | uuid FK clients | Nullable |
| platform_id | uuid FK gov_platforms | |
| asset_type | text | BM, Ad Account, Page, Pixel, κλπ. |
| asset_name | text | |
| asset_external_id | text | Platform-specific ID |
| url | text | |
| status | text | active/inactive |
| owner_entity | text | Agency entity name or "client" |
| billing_owner | text | Who pays |
| created_by_person | text | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### C) `gov_access_roles`
Ρόλοι ανά πλατφόρμα (Admin, Editor, Advertiser, κλπ.)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| platform_id | uuid FK gov_platforms | |
| role_name | text | Admin, Editor, κλπ. |
| permissions_description | text | |

### D) `gov_access_grants`
Ποιος έχει πρόσβαση σε τι

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| asset_id | uuid FK gov_assets | |
| person_name | text | Name of person |
| person_email | text | |
| person_type | text | internal/external/client |
| role_id | uuid FK gov_access_roles | Nullable |
| role_name_override | text | If role not in catalog |
| granted_on | date | |
| granted_by | text | |
| removal_date | date | Nullable |
| status | text | active/revoked |
| last_review_date | date | |
| review_cycle_days | integer | Default 90 |
| notes | text | |
| created_at / updated_at | timestamptz | |

### E) `gov_security_controls`
Security status ανά asset

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| asset_id | uuid FK gov_assets | UNIQUE |
| mfa_enabled | boolean | Default false |
| mfa_method | text | app/sms/email/none |
| backup_admin_present | boolean | Default false |
| personal_login_used | boolean | Default false |
| recovery_email | text | |
| recovery_phone | text | |
| last_password_change_date | date | |
| password_rotation_policy | text | 90/180/none |
| risk_level | text | low/medium/high (auto-calculated) |
| risk_score | integer | 1-5 (auto-calculated) |
| created_at / updated_at | timestamptz | |

### F) `gov_vault_references`
Αναφορές σε password managers (χωρίς passwords)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| asset_id | uuid FK gov_assets | |
| vault_provider | text | 1Password/Bitwarden/Other |
| vault_location | text | Folder/path |
| vault_entry_name | text | |
| last_verified_date | date | |
| created_at | timestamptz | |

### G) `gov_audit_events`
Immutable audit log

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| client_id | uuid FK clients | Nullable |
| asset_id | uuid FK gov_assets | Nullable |
| actor_name | text | Who did it |
| event_type | text | access_granted/revoked/role_changed/mfa_updated/owner_changed/asset_created/asset_archived |
| before_state | jsonb | |
| after_state | jsonb | |
| notes | text | |
| created_at | timestamptz | Immutable timestamp |

### H) `gov_review_tasks`
Review queue items

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| asset_id | uuid FK gov_assets | |
| due_date | date | |
| status | text | pending/completed/skipped |
| completed_by | uuid FK profiles | |
| completed_at | timestamptz | |
| notes | text | |
| created_at | timestamptz | |

### I) `gov_checklists`
Templates: onboarding, offboarding, quarterly review

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| template_type | text | client_onboarding/user_offboarding/quarterly_review |
| title | text | |
| items | jsonb | Array of checklist items |
| created_at / updated_at | timestamptz | |

---

## 3. RLS Policies

Ολα τα tables θα χρησιμοποιούν `is_company_admin_or_manager(auth.uid(), company_id)` για full access, και `EXISTS (SELECT 1 FROM user_company_roles WHERE user_id = auth.uid() AND company_id = <table>.company_id AND status = 'active')` για read-only access στα μέλη.

Το `gov_audit_events` θα έχει INSERT-only policy (immutable) -- κανένα UPDATE/DELETE.

---

## 4. UI Screens

### A) Governance Dashboard (`/governance`)
- KPI cards: Total Assets, Assets χωρίς MFA, χωρίς Backup Admin, High-Risk, Pending Reviews, Personal Logins
- Filters: Client, Platform, Owner, Risk Level, Status
- Quick tables: Top risks, upcoming reviews

### B) Digital Assets (`/governance/assets`)
- Table view με columns: Client, Platform, Type, Name, Owner, Status, Risk Score
- Click row -> Asset Detail page
- Create/Edit asset dialog
- Bulk actions

### C) Asset Detail (`/governance/assets/:id`)
- Sections: Asset Info, Security Controls, Access List, Vault Reference, Audit Timeline
- Inline edit για security controls
- Add/remove access grants

### D) Access Control (`/governance/access`)
- Tab 1: All Access Grants (filterable table)
- Tab 2: Reviews Due (queue -- assets needing review)
- Approve/Remove/Change role buttons -> auto-create audit events

### E) Credentials Vault (`/governance/vault`)
- Table: Asset, Vault Provider, Location, Entry Name, Last Verified
- No actual passwords -- just references

### F) Compliance (`/governance/compliance`)
- Full audit log (filterable timeline)
- Checklist templates (onboarding, offboarding, quarterly)
- Generate review tasks

---

## 5. Automations (Frontend Logic)

- **Risk auto-calculation** on security controls save:
  - `mfa_enabled = false` -> risk_score >= 4
  - `backup_admin_present = false` -> risk_score >= 3
  - `personal_login_used = true` -> risk_score = 5, risk_level = "high"

- **Review reminders**: Dashboard shows overdue reviews based on `last_review_date + review_cycle_days`

- **Audit trail**: Every CRUD action on assets/access/security creates `gov_audit_events` entry automatically

---

## 6. Default Checklist Templates

Seeded on first visit or via "Create defaults" button:

**Client Onboarding Governance:**
1. Collect all platform credentials from client
2. Document asset ownership (agency vs client)
3. Add all assets to governance registry
4. Verify MFA on all accounts
5. Set backup admin on all platforms
6. Store credentials in vault (1Password/Bitwarden)
7. Document billing ownership per platform
8. Initial access review -- grant minimum necessary access

**User Offboarding:**
1. List all active access grants for departing user
2. Revoke access on each platform
3. Update governance registry (status -> revoked)
4. Rotate passwords on shared accounts
5. Verify vault entries updated
6. Create audit event for each revocation
7. Final review sign-off

**Quarterly Access Review:**
1. Pull list of all active access grants
2. Verify each person still needs access
3. Check MFA status on all assets
4. Verify backup admin presence
5. Flag personal login usage
6. Update risk scores
7. Document review completion

---

## 7. Αρχεία

### Νέα αρχεία

| File | Purpose |
|------|---------|
| `src/pages/Governance.tsx` | Main dashboard page |
| `src/pages/GovernanceAssets.tsx` | Assets list page |
| `src/pages/GovernanceAssetDetail.tsx` | Asset detail page |
| `src/pages/GovernanceAccess.tsx` | Access control + review queue |
| `src/pages/GovernanceVault.tsx` | Vault references |
| `src/pages/GovernanceCompliance.tsx` | Audit log + checklists |
| `src/components/governance/GovernanceDashboardKPIs.tsx` | KPI cards |
| `src/components/governance/AssetForm.tsx` | Create/edit asset dialog |
| `src/components/governance/SecurityControlsEditor.tsx` | Security controls form |
| `src/components/governance/AccessGrantForm.tsx` | Add/edit access grant |
| `src/components/governance/AccessReviewQueue.tsx` | Review queue component |
| `src/components/governance/VaultReferenceForm.tsx` | Vault reference form |
| `src/components/governance/AuditTimeline.tsx` | Audit events timeline |
| `src/components/governance/ChecklistManager.tsx` | Checklist templates |
| `src/components/governance/RiskBadge.tsx` | Risk level/score badge |
| `src/hooks/useGovernance.ts` | CRUD hook for all governance tables |
| Migration SQL | 9 tables + RLS + seed platforms |

### Τροποποιημένα αρχεία

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Add "governance" category to icon rail |
| `src/App.tsx` | Add `/governance/*` routes |

---

## 8. Seed Data -- Default Platforms

Θα δημιουργηθούν αυτόματα 12+ πλατφόρμες:

| Name | Category |
|------|----------|
| Meta (Facebook) | social/ads |
| Google | ads/analytics |
| LinkedIn | social/ads |
| TikTok | social/ads |
| X (Twitter) | social |
| YouTube | social |
| Mailchimp | crm |
| WordPress | cms |
| Shopify | cms |
| Cloudflare | infrastructure |
| GoDaddy | infrastructure |
| Papaki | infrastructure |

