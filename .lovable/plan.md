# Plan: Full Visual Redesign — shadcn/ui Default Aesthetic

Μετάβαση από το Apple-inspired (blue primary, warm neutrals) στο **shadcn/ui v2 default** (neutral primary, clean blacks/whites, oklch colors). Σταδιακή εφαρμογή, ξεκινώντας από globals.  
  
**Βασικό βήμα:** Κάνε εγκατάσταση το npx shadcn@latest init --preset b1VoQo2F --template vite

Με βάση το παραπάνω θα κινηθείς.  
  
Αλλαγές σε 4 φάσεις

### Phase A: Design Tokens & CSS Variables (Global Foundation)

**File: `src/index.css**`

- Αντικατάσταση **όλων** των CSS variables με τις default shadcn v2 neutral τιμές:
  - Primary: Apple Blue → **near-black** (`oklch(0.205 0 0)` / HSL fallback `240 6% 10%`)
  - Background: warm off-white → **pure white** (`0 0% 100%`)
  - Accent: blue tint → **neutral gray** (`240 5% 96%`)
  - Border: subtle warm → **slightly cooler neutral**
  - Radius: `0.625rem` → `0.625rem` (keep same, shadcn default is also 0.625rem)
- Dark mode: update αντίστοιχα με shadcn dark defaults
- Αφαίρεση Apple-specific comments, ανανέωση `.force-light` class
- Κρατάμε: shadows, animations, density system, scrollbar, print styles

**File: `tailwind.config.ts**`

- Minimal changes (colors map already uses CSS vars, so they auto-update)

### Phase B: Core UI Components (~20 files)

Update `src/components/ui/` components ώστε να ακολουθούν shadcn default styling:


| Component           | Key Change                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `button.tsx`        | Remove `rounded-[10px]`, use `rounded-md`. Remove `brightness` hover, use opacity/darker bg |
| `card.tsx`          | Remove `rounded-2xl`, use `rounded-xl`. Simplify border to `border`                         |
| `input.tsx`         | Remove `rounded-[10px]`, use `rounded-md`. Standard focus ring                              |
| `badge.tsx`         | Standard shadcn badge styles                                                                |
| `dialog.tsx`        | Remove `rounded-[20px]`, use `rounded-lg`. Standard overlay                                 |
| `sheet.tsx`         | Simpler overlay, standard border                                                            |
| `dropdown-menu.tsx` | Remove backdrop-blur, standard bg                                                           |
| `popover.tsx`       | Remove backdrop-blur, standard styling                                                      |
| `alert-dialog.tsx`  | Standard rounded, overlay                                                                   |
| `tabs.tsx`          | Standard tab styling                                                                        |
| `toast/sonner.tsx`  | Standard toast look                                                                         |
| All others          | Align border-radius and spacing with shadcn defaults                                        |


### Phase C: Layout Shell (Sidebar, TopBar, PageHeader)


| File             | Change                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| `AppSidebar.tsx` | Remove Apple-specific icon styling (`bg-primary/8`), use neutral active states |
| `PageHeader.tsx` | Icon boxes: neutral instead of blue-tinted, simpler styling                    |
| TopBar           | Neutral tones, remove blue accents                                             |


### Phase D: Page-Level Sweep

Bulk class replacements across all 80+ pages:

- `bg-primary/8` → `bg-muted` or `bg-accent`
- `text-primary` on icons → `text-foreground`
- `rounded-[16px]` → `rounded-xl`
- `rounded-[10px]` → `rounded-md`
- `border-border/30` → `border`
- `shadow-sm` (keep, already standard)

## Σημαντικές αποφάσεις

1. **Primary color**: Θα γίνει near-black (shadcn default). Αν θέλεις να κρατήσεις κάποιο brand color (π.χ. μπλε) ως primary, πες μου.
2. **Accent color**: Γίνεται ουδέτερο γκρι αντί για μπλε tint.
3. **Backward compatibility**: Όλα τα CSS variables αλλάζουν globally, οπότε τα περισσότερα components θα ακολουθήσουν αυτόματα.

## Execution Order

Θα ξεκινήσω με **Phase A + B** (tokens + core UI) σε ένα πέρασμα. Αυτό θα αλλάξει αμέσως ολόκληρη την εφαρμογή. Μετά Phase C + D για τελειοποίηση.