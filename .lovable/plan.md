## Στόχος

Έξυπνο voice input σε όλα τα chats (channel, threads, Quick Chat, Secretary), με global shortcut, ζωντανή καταγραφή ως κανονικό κείμενο, και AI που καταλαβαίνει context, έχει internet access, και όλα τα tools του Secretary.

## Αρχιτεκτονική

Έχουμε ήδη: useVoiceRecognition hook (Web Speech API, el-GR), VoiceCommandProvider με shortcut Cmd/Ctrl+Shift+V, secretary-agent edge function με πλήρες toolset.

Θα επεκτείνουμε σε 3 επίπεδα:

1. Inline Mic Button σε κάθε chat input — γεμίζει textarea ζωντανά, ο user πατά Send κανονικά
2. Global Quick Voice (Cmd+Shift+V) — smart routing προς ενεργό chat ή Secretary
3. Smart AI brain — page context + web_search tool + όλα τα secretary tools

## Τι θα φτιάξουμε

### 1. Reusable component VoiceInputButton

`src/components/voice/VoiceInputButton.tsx`
- Compact mic button με pulse animation όταν ακούει
- Click-to-toggle (αξιόπιστο σε mobile + desktop)
- Props: onTranscript(text, isFinal), lang, size, disabled
- Live interim text feedback μέσα στο textarea
- Fallback αν ο browser δεν υποστηρίζει — tooltip "Δοκίμασε Chrome/Edge"
- Esc = ακύρωση

### 2. Ενσωμάτωση σε όλα τα chat inputs

- `src/components/chat/ChatMessageInput.tsx` — channel/group/DM chats (το thread reply input χρησιμοποιεί το ίδιο, οπότε είναι δωρεάν)
- `src/components/quick-chat/QuickChatBar.tsx` — Quick Chat (Cmd+I)
- `src/components/secretary/SecretaryChat.tsx` — Secretary full page

Σε όλα: το transcript εμφανίζεται ζωντανά στο textarea, ο χρήστης το επεξεργάζεται αν θέλει, πατά Send. Αποθηκεύεται σαν κανονικό text — άρα φαίνεται σαν γραπτή συνομιλία αυτόματα.

### 3. Global Quick Voice — smart target routing

Επεκτείνουμε το VoiceCommandProvider:
- Νέος API `registerChatTarget(label, handler)` — τα active chats κάνουν register σε mount
- Στο popup ο user βλέπει που θα πάει το voice command (π.χ. "Αποστολή στο #marketing" ή "Ρώτα τον Secretary")
- Routing: σε channel/thread chat πάει εκεί, αλλιώς πάει στον Secretary

Files: `VoiceCommandProvider.tsx`, `VoiceCommandPopup.tsx`, `ChatChannelView.tsx`

### 4. Web search tool στον Secretary

Προσθέτουμε νέο tool `web_search({ query })` στο secretary-agent edge function:
- Υλοποίηση μέσω Lovable AI Gateway με google/gemini-3-flash-preview και Google grounding (built-in)
- Δωρεάν, χωρίς νέο API key (χρησιμοποιεί υπάρχον LOVABLE_API_KEY)
- Το LLM αποφασίζει αυτόματα πότε χρειάζεται internet (π.χ. "ποιες είναι οι τάσεις στο SEO το 2026", "βρες info για εταιρία X")
- Επιστρέφει grounded answer με citations που εμφανίζονται inline

File: `supabase/functions/secretary-agent/index.ts`

### 5. UX

- Mic: γκρι idle, κόκκινο pulse όταν ακούει
- Inline status "Ακούω..." κάτω από το input
- Auto-stop σε σιωπή (Web Speech API native)
- Esc = ακύρωση

## Files

Create:
- src/components/voice/VoiceInputButton.tsx

Edit:
- src/components/chat/ChatMessageInput.tsx
- src/components/quick-chat/QuickChatBar.tsx
- src/components/secretary/SecretaryChat.tsx
- src/components/secretary/VoiceCommandProvider.tsx
- src/components/secretary/VoiceCommandPopup.tsx
- src/components/chat/ChatChannelView.tsx
- supabase/functions/secretary-agent/index.ts

Δεν χρειάζονται: migrations, νέα secrets, νέα npm packages.

## Αποτέλεσμα

1. Μικρόφωνο σε κάθε chat input — μιλάς, βλέπεις ζωντανά, στέλνεις
2. Cmd+Shift+V από οπουδήποτε — έξυπνη αποστολή στο σωστό target
3. Στον Secretary/Quick Chat: page-aware + internet + όλα τα tools
4. Όλα τα voice messages φαίνονται ως κανονικό text στο chat history