

# Plan: Unified Onboarding Wizard for All Users

## Current Flow
1. User signs up → `AuthContext` checks roles → no roles → routes to `/onboarding`
2. `Onboarding.tsx` calls `auto_onboard_user()` RPC which silently creates companies (corporate email) or shows a simple "Create org / Join via domain" choice (personal email)
3. `WelcomeWizard.tsx` (`/welcome`) is only shown after invitation acceptance or if `onboarding_completed` is false

## Problem
Corporate email users never see a proper wizard — `auto_onboard_user` auto-creates companies and redirects to `/` immediately. Personal email users see a bare-bones "choose" screen. Neither gets a rich, guided experience.

## New Flow

Merge `Onboarding.tsx` and `WelcomeWizard.tsx` into a single multi-step wizard at `/onboarding`. All users go through it.

### Steps

| Step | Content |
|---|---|
| **1. Welcome** | Greeting with user name, logo, "Let's set up your workspace" |
| **2. Company Setup** | Smart detection based on email domain: if corporate email found matching a company → show it pre-filled with "Join this company" option; if corporate email with no match → pre-fill company name from domain; if personal email → blank form. Options: Create new company / Join existing / Request to join |
| **3. Profile** | Phone, job title (pre-filled if available from invitation data) |
| **4. Preferences** | Theme selection (light/dark) |
| **5. Ready** | Summary + "Enter workspace" button |

### Smart Domain Detection (Step 2)
- On mount, silently call `find_companies_by_domain` for corporate emails
- If companies found → show them as suggested matches with "Request to join" buttons, plus a "Create new instead" option
- If no companies found → pre-fill company name field with `initcap(domain.split('.')[0])` and domain field with the email domain
- If personal email → show blank create form only
- Still handle pending invitations: if `auto_onboard_user` returns `invitation_accepted`, skip to step 3 (profile) with the company already set

### Key Changes

| File | Change |
|---|---|
| `src/pages/Onboarding.tsx` | **Rewrite** — Merge into a unified multi-step wizard with steps: welcome → company-setup → profile → preferences → ready. Include domain detection, pre-filling logic, theme selector. Handle create/join/request flows within the wizard. On finish, set `onboarding_completed = true` and navigate to `/`. |
| `src/pages/WelcomeWizard.tsx` | **Keep as thin redirect** — If user arrives at `/welcome` with `onboarding_completed = false`, redirect to `/onboarding`. If already completed, redirect to `/`. This preserves backward compatibility for invitation links. |
| `src/contexts/AuthContext.tsx` | Update routing: when user has no roles, always route to `/onboarding`. When user has roles but `onboarding_completed` is false, also route to `/onboarding` (instead of `/welcome`). |

### Invitation Flow Integration
- The `auto_onboard_user` RPC is still called on mount but only to check for pending invitations
- If `invitation_accepted` → skip company setup step, go directly to profile step
- If `already_member` → check `onboarding_completed`, skip to profile if needed
- All other cases (personal_email, created_company, join_requested) → handled by the wizard UI instead of the RPC's auto-actions

### Database Changes
- Update `auto_onboard_user` function to add a new action `'needs_onboarding'` that returns domain info and matched companies WITHOUT auto-creating anything. The wizard will call `create_company_with_owner` or insert `join_requests` explicitly based on user choices.
- Add a new RPC `onboard_check` (or modify `auto_onboard_user`) that only handles invitations automatically but returns domain/company info for the wizard to use — without side effects like auto-creating companies.

Actually, simpler approach: keep `auto_onboard_user` for invitation handling only, and use `find_companies_by_domain` + `create_company_with_owner` directly from the wizard. Modify `auto_onboard_user` to NOT auto-create companies — only handle invitations, then return the domain info.

### Modified `auto_onboard_user` behavior
- Still auto-accept invitations (keep this)
- Still check `already_member` (keep this)
- Remove auto company creation for corporate emails
- Remove auto join request creation
- Return `'needs_onboarding'` with domain info for all other cases

### Summary
Two files rewritten (`Onboarding.tsx`, `WelcomeWizard.tsx`), one migration to update `auto_onboard_user`, and a small routing change in `AuthContext.tsx`.

