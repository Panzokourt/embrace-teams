## Στόχος
Διαχωρισμός email σε δύο τύπους και διαφορετική προβολή για το καθένα:
- **Personal** (από πραγματικό άτομο): μόνο καθαρό κείμενο body + attachments. Καμία υπογραφή, καμία εικόνα-υπογραφής.
- **Bulk** (newsletter / promo / notification / transactional): πλήρες rich HTML όπως ακριβώς το έστειλε ο αποστολέας.

## Λογική ταξινόμησης (heuristic, frontend-only)

Νέα συνάρτηση `classifyEmail(message)` στο `inboxUtils.ts` που επιστρέφει `'personal' | 'bulk'`. Έλεγχοι, με προτεραιότητα:

1. **Bulk headers/markers** στο raw HTML ή headers (αν υπάρχουν στο body):
   - `list-unsubscribe`, `unsubscribe`, `view in browser`, `email preferences`, `δείτε στο πρόγραμμα περιήγησης`, `διαγραφή εγγραφής`
2. **Sender pattern**:
   - `from_address` που ξεκινά με `noreply`, `no-reply`, `donotreply`, `notifications@`, `news@`, `newsletter@`, `marketing@`, `info@` (όταν συνδυάζεται με rich HTML), `mailer@`, `bounce@`, `updates@`, `hello@`, `team@`
3. **HTML complexity score** (όταν υπάρχει `body_html`):
   - count `<table>`, `<img>` (μη-tracker, μη-tiny), inline `style=`, μήκος HTML > ~8KB, ύπαρξη `<center>` / multiple background colors
   - αν score ≥ threshold → bulk
4. **Default**: αν δεν ταιριάζει κανένας bulk δείκτης → **personal**.

Επιπλέον helper `extractCleanPersonalText(message)`:
- Παίρνει `body_text` αν υπάρχει, αλλιώς μετατρέπει `body_html` σε plain text (`textContent` μετά από sanitize).
- Περνά από `stripSignature` (υπάρχει ήδη).
- Linkify URLs (υπάρχει ήδη).

## Αλλαγές αρχείων

### `src/components/inbox/inboxUtils.ts`
- Add `BULK_SENDER_REGEX`, `BULK_HINTS_REGEX`.
- Add `classifyEmail(message): 'personal' | 'bulk'`.
- Add `extractCleanPersonalText(message): string` (HTML → plain text fallback).
- Add `htmlToPlainText(html)` βοηθητικό (χρήση DOMParser, αφαίρεση `<style>`, `<script>`, κενά).

### `src/components/inbox/InboxMessageBubble.tsx`
Αντικαθιστά το υπάρχον `isRichHtml` με `classifyEmail(message)`:
- **Personal** → πάντα chat-bubble με `extractCleanPersonalText` + linkify. Attachments chips κανονικά. Χωρίς toggle «Πλήρης/Συμπτυγμένη» (δεν χρειάζεται — πάντα clean). Προαιρετικά μικρό link «Προβολή αρχικού HTML» αν υπάρχει `body_html` για debugging.
- **Bulk** → πλήρες sanitized HTML όπως σήμερα, σε «κάρτα» με border. Χωρίς bubble styling.

### `src/components/inbox/InboxThreadList.tsx` (μικρή προσθήκη, optional)
- Μικρό badge «Newsletter» / εικονίδιο `Megaphone` δίπλα στο subject όταν `classifyEmail(last_message) === 'bulk'`, ώστε ο χρήστης να ξεχωρίζει τη λίστα με μια ματιά.

## Τι ΔΕΝ αλλάζει
- Καμία αλλαγή σε DB, edge functions, RLS, sync logic.
- Καμία αλλαγή στο folder rail, attachments, AI summary, reactions.
- Καμία εξάρτηση από νέο header parsing στο backend (όλα frontend heuristics).

## Edge cases
- Αν personal email περιέχει επικολλημένο HTML signature με εικόνες → η μετατροπή σε plain text + `stripSignature` τα κόβει.
- Αν bulk email δεν έχει `body_html` αλλά μόνο text → fallback σε personal-style rendering (αναπόφευκτο, το ίδιο και σήμερα).
- Misclassification: ο χρήστης μπορεί να δει toggle «Εμφάνιση ως rich» στο meta row για personal που μπερδεύτηκε (προαιρετικό, low priority).
