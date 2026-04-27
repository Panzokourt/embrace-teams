## Στόχος

Απόκρυψη της "AI Μνήμης" από όλα τα σημεία του UI όπου είναι εμφανής στον χρήστη, διατηρώντας πλήρως την backend λειτουργία (auto save/recall μέσω secretary-agent & quick-chat-gemini). Το μόνο σημείο όπου ο χρήστης θα μπορεί να την δει και να την διαχειριστεί θα είναι μέσα στις **Ρυθμίσεις**, ως κάρτα διαφάνειας/διαχείρισης.

## Αλλαγές

### 1. Αφαίρεση από το Floating Dock
**`src/components/dock/FloatingDock.tsx`**
- Αφαίρεση του item `{ id: 'memory', label: 'AI Μνήμη', icon: Brain, ... }` από τη λίστα `items`.
- Αφαίρεση του `case 'memory'` από το `renderPanelContent`.
- Αφαίρεση του import `MemoryManager` και του `Brain` (αν δεν χρησιμοποιείται αλλού στο αρχείο).

### 2. Αφαίρεση από το Secretary Panel (right dock tabs)
**`src/components/secretary/SecretaryPanel.tsx`**
- Αφαίρεση του tab `{ id: "memory", label: "AI Μνήμη", icon: Brain }`.
- Αφαίρεση του render `{activeTab === "memory" && <MemoryManager ... />}`.
- Αφαίρεση του τύπου `"memory"` από το `RightPanelTab` union (ή κράτημα για συμβατότητα — προτείνεται αφαίρεση).
- Αφαίρεση imports `MemoryManager`, `Brain`.

### 3. Αφαίρεση από το ConversationSidebar (Secretary full mode)
**`src/components/secretary/ConversationSidebar.tsx`**
- Αφαίρεση του κουμπιού "AI Μνήμη" στο footer (το `{onOpenMemory && ...}` block).
- Αφαίρεση του prop `onOpenMemory` από το interface και τη signature.

**`src/components/secretary/SecretaryChat.tsx`**
- Αφαίρεση του prop `onOpenMemory` και του pass-through στο `<ConversationSidebar onOpenMemory={...} />`.

**`src/pages/Secretary.tsx`**
- Αφαίρεση του `memoryOpen` state, του `Dialog` με τον `MemoryManager`, του prop `onOpenMemory` που δίνεται στο `SecretaryChat`.
- Αφαίρεση imports `MemoryManager`, `Dialog`, `useState` (αν δεν χρησιμοποιούνται αλλού).

### 4. Προσθήκη στις Ρυθμίσεις
**`src/components/settings/AIMemoryCard.tsx`** (νέο)
- Νέο card component με τίτλο "AI Μνήμη" + περιγραφή ("Τα δεδομένα που θυμάται ο AI Assistant για να σου παρέχει συνέχεια στις συνομιλίες").
- Κουμπί "Διαχείριση μνήμης" που ανοίγει `Dialog` με τον υπάρχον `MemoryManager` μέσα.
- Optional: μικρό count των μνημών (από `secretary_memory` count για τον user).

**`src/pages/Settings.tsx`**
- Import του `AIMemoryCard`.
- Τοποθέτηση κάτω από το `AIUsageCard` (γραμμή ~519), έτσι ώστε όλες οι AI-related ρυθμίσεις να είναι μαζί.

### 5. Backend — καμία αλλαγή
Τα tools `save_memory` / `recall_memory` στο `secretary-agent` και η αυτόματη αποθήκευση στο `quick-chat-gemini` παραμένουν ως έχουν. Ο πίνακας `secretary_memory` και τα RLS policies δεν αλλάζουν. Έτσι, όλα τα secretary chats (Floating Dock Secretary, full Secretary page, QuickChatBar, FocusAIChat) συνεχίζουν να έχουν persistent memory σιωπηλά.

## Τεχνικές σημειώσεις

- Καμία database migration δεν απαιτείται.
- Το component `MemoryManager.tsx` παραμένει ως έχει — απλώς αλλάζει το σημείο όπου mount-άρεται (μόνο μέσω Settings).
- Δεν χρειάζεται αλλαγή στο `DockContext` (αν το `'memory'` panel id υπάρχει, δεν θα ενεργοποιείται από κάπου, οπότε είναι ασφαλές να μείνει).

## Αρχεία που τροποποιούνται

- `src/components/dock/FloatingDock.tsx` (αφαίρεση memory entry)
- `src/components/secretary/SecretaryPanel.tsx` (αφαίρεση memory tab)
- `src/components/secretary/SecretaryChat.tsx` (αφαίρεση onOpenMemory prop)
- `src/components/secretary/ConversationSidebar.tsx` (αφαίρεση κουμπιού)
- `src/pages/Secretary.tsx` (αφαίρεση Dialog)
- `src/pages/Settings.tsx` (προσθήκη AIMemoryCard)
- `src/components/settings/AIMemoryCard.tsx` (νέο)

## Αποτέλεσμα

Ο χρήστης δεν βλέπει πλέον την "AI Μνήμη" στο dock, στο secretary sidebar ή στα tabs — η λειτουργία γίνεται εντελώς αόρατη και αυτόματη σε όλα τα secretary chats. Μόνο όποιος θέλει να την επιθεωρήσει/καθαρίσει μπορεί να το κάνει από τις **Ρυθμίσεις → AI Μνήμη**.