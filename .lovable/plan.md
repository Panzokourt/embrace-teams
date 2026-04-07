

# Secretary Page — ChatGPT-style Redesign

## Τρέχουσα κατάσταση
- Messages σε bubbles (user = primary bg, assistant = card with border)
- Full-width message area
- Header bar με Bot icon + "Νέα συνομιλία" button
- Input stuck to bottom with border-top
- Sidebar = light, 256px wide

## ChatGPT Pattern — Τι αλλάζει

### Layout
- Messages σε **centered column** (`max-w-3xl mx-auto`) αντί full-width
- **Αφαίρεση header bar** — ο τίτλος/new chat button μετακομίζει στο sidebar
- Input area: centered στο κάτω μέρος, `max-w-3xl`, με **shadow + rounded-2xl border**, χωρίς border-top στο container

### Messages
- **User messages**: Απλό text, `bg-muted/50 rounded-2xl px-4 py-3` (subtle γκρι background, όχι primary color)
- **Assistant messages**: Χωρίς border/card background — plain text με μικρό icon αριστερά
- Αφαίρεση `justify-end` / `justify-start` — όλα aligned αριστερά στο centered column

### Empty State
- Μεγαλύτερο greeting χωρίς Bot icon box
- Quick actions σε **2x grid** αντί flex-wrap, με `border rounded-xl p-4` κάρτες (τίτλος + description style)

### Input
- Rounded container με `shadow-lg border bg-background rounded-2xl`
- Quick action chips μέσα στο input container (πάνω από το textarea)
- Send button μέσα στο container, δεξιά

### Sidebar
- Σκούρο background (ήδη inverted από Luma tokens — χρησιμοποιεί `--sidebar-*`)
- Πιο minimal styling

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/secretary/SecretaryChat.tsx` | Centered column, remove header, ChatGPT message layout, new input container, grid quick actions |
| `src/components/secretary/MentionInput.tsx` | Remove outer gap layout, adapt to fit inside the new container |
| `src/components/secretary/ConversationSidebar.tsx` | Dark bg using sidebar tokens, minimal tweaks |

All className-level changes. No API or logic changes.

