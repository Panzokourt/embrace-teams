

# Fix: Dialogs με κομμένο περιεχόμενο (non-scrollable)

## Πρόβλημα

Τα dialogs που χρησιμοποιούν `overflow-hidden flex flex-col` με εσωτερικό `ScrollArea` δεν κάνουν scroll σωστά. Το περιεχόμενο κόβεται γιατί τα flex children στο CSS δεν μικραίνουν κάτω από το content size τους (default `min-height: auto`).

## Λύση

Δύο αλλαγές:

### 1. Base DialogContent component (`src/components/ui/dialog.tsx`)
Προσθήκη `min-h-0` στο flex container wrapper ώστε τα flex children να μπορούν να shrink σωστά σε κάθε dialog.

### 2. Dialogs με `overflow-hidden flex flex-col`
Προσθήκη `min-h-0` στα form/div wrappers μέσα στα dialogs που χρησιμοποιούν flex layout, ώστε το ScrollArea να παίρνει σωστό ύψος.

Αφορά τα εξής αρχεία:
- `src/components/users/EditPermissionsDialog.tsx` - form needs `min-h-0`
- `src/components/users/InviteUserDialog.tsx` - form needs `min-h-0`
- `src/components/users/CreateUserDialog.tsx` - form needs `min-h-0`
- `src/components/blueprints/BriefFormDialog.tsx` - content needs `min-h-0`

### Τεχνική εξήγηση
Στο CSS Flexbox, τα children έχουν `min-height: auto` by default. Αυτό σημαίνει ότι δεν μικραίνουν κάτω από το μέγεθος του περιεχομένου τους, ακόμα κι αν ο parent έχει `overflow-hidden`. Προσθέτοντας `min-h-0` (Tailwind class για `min-height: 0`) στα flex children, τους επιτρέπουμε να shrink και το `ScrollArea` / `overflow-y-auto` λειτουργεί κανονικά.

