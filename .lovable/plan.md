## Διόρθωση Claude Model IDs

Ενημέρωση του `src/components/chat/ModelSelector.tsx` με τα επίσημα IDs και αφαίρεση των retired/placeholder μοντέλων.

### Αλλαγές στη λίστα Claude (newest first)

- `claude-opus-4-8` → Claude Opus 4.8 (Most capable)
- `claude-sonnet-4-6` → Claude Sonnet 4.6 (Most efficient)
- `claude-haiku-4-5-20251001` → Claude Haiku 4.5 (Fastest)
- `claude-opus-4-5-20251101` → Claude Opus 4.5
- `claude-sonnet-4-5-20250929` → Claude Sonnet 4.5
- `claude-opus-4-20250514` → Claude Opus 4
- `claude-3-7-sonnet-20250219` → Claude Sonnet 3.7
- `claude-3-5-haiku-20241022` → Claude Haiku 3.5

### Αφαιρούνται

- `claude-opus-4-7-20260301` (placeholder, ανύπαρκτο ID)
- `claude-opus-4-6-20260201` (placeholder, ανύπαρκτο ID)
- `claude-sonnet-4-6-20260401` (λάθος format με date)
- `claude-opus-4-8-20260501` (λάθος format με date)
- `claude-sonnet-4-20250514` (retired 20 Απρ 2026)
- `claude-3-opus-20240229` (legacy, εκτός λίστας ενεργών)

### Έλεγχος σε άλλα σημεία

Γρήγορος έλεγχος σε `supabase/functions/` και `src/` για hardcoded references σε παλιά/λάθος Claude IDs (π.χ. `claude-sonnet-4-20250514`) και αντικατάσταση όπου χρησιμοποιούνται ως defaults.

Καμία αλλαγή σε backend routing — ο `ai-router` ήδη προωθεί Claude IDs απευθείας στο gateway.
