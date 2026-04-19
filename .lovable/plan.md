

## Πρόβλημα

Από τα screenshots:

1. **Social Media** — ο AI επιστρέφει `[{url, platform, handle}]` αλλά:
   - Το schema του `ClientSocialCard` περιμένει `account_name` (όχι `handle`) → εμφανίζεται μόνο "Youtube" χωρίς όνομα
   - Δεν υπάρχει inline UI για να προσθέσω/επεξεργαστώ social accounts απευθείας από την κάρτα — μόνο μέσω full edit dialog
   - Ο AI βρίσκει συνήθως μόνο 1 link γιατί το system prompt δεν τον ενθαρρύνει αρκετά να ψάξει σε όλες τις πλατφόρμες

2. **Long text overflow** — η Διεύθυνση είναι π.χ. `Σταδίου 40, Αθήνα, 102 52, Ελλάδα (Headquarters inferred from general knowledge; website refers to Stadiou…)` και ξεχειλίζει εκτός κάρτας. Στο `InlineEditField` το display χρησιμοποιεί `truncate` που:
   - Κόβει σε μία γραμμή χωρίς wrap
   - Δεν δίνει τρόπο να δεις το πλήρες κείμενο
   Το ίδιο ισχύει και στο `AIEnrichDialog` για μεγάλα values.

3. **AI Enrich δεν φέρνει tags** — υπάρχει η στήλη `tags` στη βάση και inline UI, αλλά:
   - Το tool schema του `extract_client_info` δεν έχει καθόλου `tags` field
   - Το ίδιο και για τα tags, ο AI δεν τα προτείνει
   - Για το ΑΦΜ: ήδη υπάρχει στο tool schema. Πρέπει όμως να γίνει πιο επιθετική η αναζήτηση μέσω Perplexity (search query και system prompt).

## Λύση

### 1. Social Media — βελτιωμένο extraction + inline UI

**Backend (`enrich-client/index.ts`):**
- Στο tool schema: αλλάζω σε `{ platform, url, account_name }` (αντί για `handle`) ώστε να ταιριάζει με το shape που χρησιμοποιεί όλο το app
- Επεκτείνω τα enum platforms (προσθέτω `tiktok`, `x`, `threads`)
- Στο system prompt: ρητή οδηγία "search ALL major social platforms (Facebook, Instagram, LinkedIn, YouTube, TikTok, X/Twitter); include account_name from the URL handle if not stated explicitly"
- Στο Perplexity query: προσθέτω explicit "λίστα όλων των social media accounts (Facebook, Instagram, LinkedIn, YouTube, TikTok, X)"

**Frontend — νέο `InlineSocialAccountsField`:**
Αντικαθιστώ το read-only `ClientSocialCard` με νέα έκδοση που υποστηρίζει inline editing:
- Λίστα τρέχοντων accounts (icon + platform + account_name + link out + delete)
- "Προσθήκη λογαριασμού" → μικρή φόρμα 3 πεδίων (platform select, account_name, url) → save
- Κάθε account μπορεί να επεξεργαστεί inline (κλικ → edit mode)
- Mutation μέσω `useClientUpdate` → patch `social_accounts` JSONB array

### 2. Long text — wrap + expand

**`InlineEditField.tsx`:**
- Νέο prop `clamp?: number` (default 2 γραμμές)
- Όταν display value > N γραμμών: εφαρμόζω `line-clamp-{N}` + "Δείτε περισσότερα" toggle (chevron) που εναλλάσσει μεταξύ clamped/full
- Αφαιρώ το `truncate` σε αντικατάσταση με `whitespace-pre-wrap break-words` ώστε να αναδιπλώνει αντί να κόβει
- Το pencil icon παραμένει visible στο hover

**`AIEnrichDialog.tsx`:**
- Στο `renderValue` για strings: wrap με `whitespace-pre-wrap break-words` αντί για `break-words` μόνο
- Για arrays/objects: προσθέτω `max-h-32 overflow-auto` + JSON pretty-print

### 3. AI Enrich → tags + ΑΦΜ

**Backend tool schema additions:**
```text
tags: array of string
  description: "Σύντομα tags που χαρακτηρίζουν την εταιρεία 
                (π.χ. industry, type: 'b2b', 'fintech', 'startup', 
                'restaurant', 'public-sector'). 3-6 tags."
```

**System prompt updates:**
- "Πάντα προσπάθησε να εξαγάγεις: ΑΦΜ (αν είναι ελληνική εταιρεία και αναφέρεται), tags (3-6 περιγραφικά keywords από τη δραστηριότητα), social_accounts (όλες οι πλατφόρμες)."

**Perplexity query enhancement:**
- Όταν υπάρχει όνομα/website αλλά λείπει ΑΦΜ → προσθέτω explicit "βρες ΑΦΜ της εταιρείας από δημόσια μητρώα (ΓΕΜΗ, taxisnet)"

**`AIEnrichDialog` tags handling:**
- Όταν `field === 'tags'` και current είναι array: εμφανίζω "merge with existing" option (default) vs "replace"
- Στο apply: αν merge, κάνω union με τα υπάρχοντα tags

## Αρχεία που αλλάζουν

- `supabase/functions/enrich-client/index.ts` — tool schema + prompts
- `src/components/clients/InlineEditField.tsx` — wrap + expand
- `src/components/clients/AIEnrichDialog.tsx` — long-value rendering + tags merge
- `src/components/clients/detail/ClientSocialCard.tsx` — inline edit mode
- `src/components/clients/detail/InlineSocialAccountsField.tsx` ◄ NEW
- `src/pages/ClientDetail.tsx` — pass `clientId` + `onClientUpdated` στο SocialCard

## Τι ΔΕΝ αλλάζει

- DB schema (όλα τα πεδία υπάρχουν)
- Rate limiting / auth / log
- Άλλα cards (Business Info, Websites, Strategy, Ad Accounts)

