

# Voice Command για τον AI Secretary

## Τι θα γίνει

Προσθήκη voice-to-text λειτουργίας στον Secretary με 3 σημεία πρόσβασης:
- **Μικρόφωνο** δίπλα στο Send button στο input του Secretary
- **Global shortcut** (Ctrl/Cmd + Shift + V) που ανοίγει voice popup από οποιαδήποτε σελίδα
- **Floating popup** με animation ηχογράφησης, που στέλνει το transcript στον Secretary

## Τεχνική Προσέγγιση

Θα χρησιμοποιηθεί το **Web Speech API** (SpeechRecognition) του browser -- δεν χρειάζεται API key ή εξωτερική υπηρεσία. Υποστηρίζεται σε Chrome, Edge, Safari. Fallback μήνυμα για browsers που δεν το υποστηρίζουν.

## Νέα Αρχεία

### 1. `src/hooks/useVoiceRecognition.ts`
Custom hook που αναλαμβάνει:
- Εκκίνηση/διακοπή SpeechRecognition
- Γλώσσα: `el-GR` (ελληνικά) με fallback σε `en-US`
- Real-time interim results (partial transcript)
- Final transcript
- Error handling + browser support check

### 2. `src/components/secretary/VoiceCommandPopup.tsx`
Global floating popup (Dialog) που εμφανίζεται:
- Animated mic icon (pulse animation κατά την ηχογράφηση)
- Live transcript preview
- Κουμπιά: Cancel / Send
- Μετά το Send, στέλνει το κείμενο στον Secretary μέσω ενός shared callback

### 3. `src/components/secretary/VoiceCommandProvider.tsx`
Context provider στο AppLayout που:
- Ακούει το global shortcut (Cmd+Shift+V)
- Διαχειρίζεται το open/close του popup
- Παρέχει `sendToSecretary(text)` function
- Κάνει navigate στο `/secretary` αν χρειαστεί ή χρησιμοποιεί το panel

## Τροποποιήσεις Υφιστάμενων Αρχείων

### `src/components/secretary/MentionInput.tsx`
- Προσθήκη mic button δίπλα στο Send
- Κατά την ηχογράφηση: animated mic icon + interim text στο textarea
- Μετά την ολοκλήρωση: auto-fill textarea με transcript

### `src/components/layout/AppLayout.tsx`
- Wrap με `VoiceCommandProvider`
- Render `VoiceCommandPopup` (global, πάντα διαθέσιμο)

### `src/components/secretary/SecretaryChat.tsx`
- Expose `sendMessage` μέσω ref ή context ώστε το global popup να μπορεί να στείλει μήνυμα

## Ροή Χρήστη

```text
Σενάριο 1: Μέσα στο Secretary
  -> Πατάει mic icon στο input
  -> Μιλάει, βλέπει live transcript στο textarea
  -> Πατάει Enter ή mic ξανά -> στέλνεται στο Secretary

Σενάριο 2: Από οποιαδήποτε σελίδα (shortcut)
  -> Cmd+Shift+V -> popup ανοίγει στο κέντρο
  -> Μιλάει, βλέπει live transcript στο popup
  -> Πατάει Send -> ανοίγει Secretary panel + στέλνεται μήνυμα
  -> Πατάει Cancel ή Escape -> κλείνει χωρίς αποστολή
```

## Σημαντικές Λεπτομέρειες

- Δεν χρειάζεται database migration -- τα voice messages αποθηκεύονται κανονικά ως text στο `secretary_messages`
- Το SpeechRecognition API είναι free και δεν χρειάζεται key
- Continuous mode: ο χρήστης μπορεί να μιλάει συνεχόμενα χωρίς timeout
- Ελληνικά ως default γλώσσα αναγνώρισης

