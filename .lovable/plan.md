

# Fix Navigation for Chat/Inbox + Fix Tab-Switch Reload Issue

## Issue 1: Chat & Inbox Missing from Navigation

Chat (`/chat`) and Inbox (`/inbox`) routes exist but are not listed in any sidebar navigation category. They need a new "Communication" domain in the sidebar.

### Changes

**`src/components/layout/AppSidebar.tsx`**:
- Add a new category `communication` to the `categories` array with a `MessageSquare` icon and label "Communication"
- Add `communication` to the `CategoryId` type
- Add nav items to `categoryNavItems.communication`:
  - Chat (`/chat`, MessageSquare icon)
  - Inbox (`/inbox`, Mail icon)
- Update `detectCategory()` to handle `/chat` and `/inbox` route prefixes

---

## Issue 2: Page Reloads When Switching Browser Tabs

**Root Cause**: When the user switches away from the tab and comes back, the Supabase auth client fires a `TOKEN_REFRESHED` event via `onAuthStateChange`. The current `AuthContext` handler calls `applySession()` which sets `loading=true` every time a session is received. This causes `AppLayout` to render the loading spinner, unmounting all children (including open dialogs/forms). When `fetchUserData` completes, `loading` becomes `false` again and everything re-mounts from scratch.

### Fix

**`src/contexts/AuthContext.tsx`**:
- In the `onAuthStateChange` callback, check whether we already have loaded user data (profile, companyRole). If we do, do NOT set `loading=true` -- just silently update the session/user references and skip re-fetching.
- Only set `loading=true` and re-fetch on actual sign-in/sign-out events, not on token refreshes.
- Specifically: check the `event` parameter -- if it's `TOKEN_REFRESHED` or `SIGNED_IN` when user is already loaded, just update session without triggering loading state.

```
// Pseudocode change in onAuthStateChange:
if (event === 'TOKEN_REFRESHED') {
  // Just update session reference, don't reload everything
  setSession(session);
  setUser(session?.user ?? null);
  return; // skip fetchUserData + loading=true
}
```

This ensures forms, dialogs, and page state survive tab switches completely.

---

## Files Modified (2)

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Add "Communication" category with Chat + Inbox nav items |
| `src/contexts/AuthContext.tsx` | Skip loading state on TOKEN_REFRESHED events to prevent page remount |

