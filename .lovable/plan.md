

# Fix XP Ring Progress Display

## Bug

`strokeDasharray="100"` means a single dash of 100 units — the full circle length (since `pathLength=100`). Offsetting a 100-unit dash on a 100-unit circle still wraps around and fills everything.

## Fix

In `src/components/command-center/CCHeroZone.tsx`, line 29-30, change:

```tsx
// Before (broken):
strokeDasharray="100"
strokeDashoffset={100 - normalizedProgress}

// After (correct):
strokeDasharray={`${normalizedProgress} ${100 - normalizedProgress}`}
strokeDashoffset={0}
```

This creates a dash exactly as long as the progress (e.g. 31 units for 31%), followed by a gap for the rest. No offset needed.

## File

| File | Change |
|------|--------|
| `src/components/command-center/CCHeroZone.tsx` | Fix strokeDasharray to use progress-based dash/gap values |

