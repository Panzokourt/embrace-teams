

# Αναβάθμιση Secretary Main Page — Claude-style UI + Drag & Drop + Memory

## Τι αλλάζει

Η σελίδα `/secretary` θα αποκτήσει Claude-style UI (βάσει του screenshot) με:
1. Κεντρικό greeting "Καλημέρα, [Όνομα]" με μεγαλύτερο, πιο καθαρό design
2. Input bar στυλ Claude — rounded, με `+` κουμπί για αρχεία και paperclip
3. Quick action chips κάτω από το input (Write, Learn, Code style)
4. **Drag & drop αρχείων** (ίδια λογική με QuickChatBar)
5. **File parsing** (PDF, DOCX, images, text) — ίδια λογική με QuickChatBar
6. **AI Memory tab** στο sidebar (ήδη υπάρχει στο SecretaryPanel, θα προστεθεί link/πρόσβαση)

## Αλλαγές

### `src/components/secretary/SecretaryChat.tsx`
Κύριο refactor:

**Input area:**
- Αντικατάσταση του MentionInput με νέο Claude-style input container
- Προσθήκη `+` button (ή paperclip) για file attachment
- Hidden `<input type="file" multiple>` trigger
- File chips row (ίδιο με QuickChatBar) πάνω από το input
- Drag & drop handlers σε ολόκληρο το chat area (dragEnter/Leave/Over/Drop)
- Drop overlay indicator ("Σύρε αρχεία εδώ")

**File processing:**
- Import `useDocumentParser` hook
- Νέα function `processFilesForMessage()` (αντιγραφή λογικής από QuickChatBar)
- Multimodal content building (text parts + image base64 blocks)
- Routing: αν content > 100K chars → `quick-chat-gemini`, αλλιώς `secretary-agent`

**Empty state redesign (Claude-style):**
- Μεγάλος τίτλος "Καλημέρα, [name]" κεντραρισμένο
- Input bar κεντρικά κάτω από τον τίτλο
- Quick action chips σε row: 📋 Tasks, 🎯 Plan, 📝 Brief, 🚀 Project, ☀️ Briefing

**Greeting:**
- Δυναμικό greeting βάσει ώρας: Καλημέρα / Καλησπέρα / Καληνύχτα

### `src/components/secretary/ConversationSidebar.tsx`
- Προσθήκη κουμπιού "🧠 AI Μνήμη" στο κάτω μέρος του sidebar
- Κλικ ανοίγει modal/panel με το `MemoryManager` component

### `src/pages/Secretary.tsx`
- Προσθήκη state για Memory Manager modal
- Render `MemoryManager` ως overlay/dialog

## Τεχνική λεπτομέρεια

**Drag & drop** — ίδιο pattern με QuickChatBar:
```text
dragCounter ref → dragEnter increments, dragLeave decrements
dragging state → shows drop overlay
handleDrop → adds files to attachedFiles[]
processFilesForMessage() → converts to multimodal content parts
```

**Routing logic** (ίδιο με QuickChatBar):
```text
totalContentChars > 100K → quick-chat-gemini (Gemini 2.5 Pro)
else → secretary-agent (Claude + tools)
```

**Memory access** — νέο κουμπί Brain icon στο ConversationSidebar footer, ανοίγει Dialog με MemoryManager.

## Files

| File | Αλλαγή |
|------|--------|
| `src/components/secretary/SecretaryChat.tsx` | Claude-style UI, drag & drop, file attachments, multimodal messages, Gemini routing |
| `src/components/secretary/ConversationSidebar.tsx` | Προσθήκη Memory button |
| `src/pages/Secretary.tsx` | Memory Manager dialog state |

