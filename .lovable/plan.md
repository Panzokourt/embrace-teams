

# Fix: Google OAuth Onboarding Bypass (Robust Solution)

## Root Cause

The `<Navigate to="/onboarding" />` component in `AppLayout` is being interrupted by re-renders from concurrent `fetchUserData` calls. When Google OAuth completes:
1. `onAuthStateChange` fires and calls `fetchUserData` via `setTimeout`
2. `getSession` also fires and calls `fetchUserData` directly
3. These concurrent state updates cause re-renders that can interrupt React Router's programmatic navigation before it completes

The `<Navigate>` component schedules navigation internally via `useEffect`, but a re-render can cancel it before it takes effect.

## Solution: 3 Layers of Protection

### 1. AppLayout.tsx - Hard redirect instead of Navigate

Replace `<Navigate to="/onboarding" />` with `window.location.replace('/onboarding')` which is an immediate browser-level redirect that cannot be interrupted by React re-renders.

```typescript
// Instead of <Navigate to="/onboarding" replace />
if (!companyRole) {
  window.location.replace('/onboarding');
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```

### 2. AuthContext.tsx - Prevent double fetchUserData

Add a guard to prevent concurrent `fetchUserData` calls from `onAuthStateChange` and `getSession`:

```typescript
const fetchingRef = useRef(false);

const fetchUserData = async (userId: string) => {
  if (fetchingRef.current) return;
  fetchingRef.current = true;
  try {
    // ... existing fetch logic
  } finally {
    fetchingRef.current = false;
    setLoading(false);
  }
};
```

### 3. Auth.tsx - Google OAuth redirect_uri

Change the Google OAuth `redirect_uri` from `window.location.origin` (root `/`) to `window.location.origin + '/onboarding'`. This sends new users directly to the onboarding page, bypassing AppLayout entirely.

The Onboarding page already handles existing users via `auto_onboard_user` returning `already_member`, which redirects to `/`.

### 4. Database - Clean up test user

Delete the existing test user `advize.kourt@gmail.com` entries so a fresh test can be performed.

---

## Technical Changes

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Replace `<Navigate>` with `window.location.replace()` for the `!companyRole` case |
| `src/contexts/AuthContext.tsx` | Add `useRef` guard to prevent concurrent `fetchUserData` calls |
| `src/pages/Auth.tsx` | Change Google OAuth `redirect_uri` to `window.location.origin + '/onboarding'` |
| Database | Clean up `advize.kourt@gmail.com` profile, roles, requests for fresh test |

## Testing

After implementation:
1. Sign out completely
2. Clear localStorage
3. Go to `/auth`
4. Click "Google sign in" with `advize.kourt@gmail.com`
5. Should land on `/onboarding`, auto_onboard runs, and since it's a gmail.com address, shows the manual onboarding options

