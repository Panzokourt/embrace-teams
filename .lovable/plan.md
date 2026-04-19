
## Ευρήματα

Το πρόβλημα δεν είναι η βάση ούτε τα permissions. Από τα network logs φαίνεται ότι τα inline edits όντως γράφουν:
- `PATCH /rest/v1/clients ... {"sector":"private"}` → `200`
- `PATCH /rest/v1/clients ... {"tags":["bank"]}` → `200`

Άρα η αποθήκευση γίνεται, αλλά η σελίδα συνεχίζει να δείχνει παλιό `client`.

## Ρίζα του bug

Στο `ClientDetail.tsx` ο πελάτης φορτώνεται σε local state με `fetchAll()` και μετά περνιέται ως prop στα cards/header.

Όμως το `useClientUpdate.ts` μετά το update κάνει μόνο:
- `invalidateQueries(['client', clientId])`
- `invalidateQueries(['clients'])`

Η σελίδα αυτή δεν χρησιμοποιεί React Query για το client record, άρα το invalidate δεν ανανεώνει τίποτα εδώ.  
Αποτέλεσμα:
- η βάση ενημερώνεται,
- αλλά το `client` prop μένει stale,
- και τα inline fields ξαναγυρνάνε στην παλιά τιμή μέχρι manual refresh ή νέο fetch.

## Τι προτείνω να γίνει

### 1. Συνδέουμε τα inline updates με το local state της σελίδας
Στο `ClientDetail.tsx` να υπάρχει κεντρικό `handleClientPatched(updatesOrRow)` που κάνει άμεσο merge στο `client` state.

```text
setClient(prev => ({ ...prev, ...updatedClient }))
```

### 2. Επεκτείνουμε το `useClientUpdate`
Να επιστρέφει το updated row και να δέχεται optional callback π.χ.:
- `onPatched(updatedClient)`
- ή `onSuccess(data)`

ώστε κάθε inline edit να ενημερώνει αμέσως το parent state.

### 3. Περνάμε το callback στα components
Να προστεθεί prop όπως `onClientUpdated` στα:
- `ClientSmartHeader`
- `ClientBusinessInfoCard`
- `ClientWebsitesCard`

και μετά από κάθε `mutateAsync` να καλείται με το returned row.

### 4. Κρατάμε και fallback re-fetch
Μετά το local merge:
- είτε καλούμε ελαφρύ `fetchClient()` μόνο για το client row,
- είτε αφήνουμε μόνο local optimistic merge και κρατάμε το full `fetchAll()` για βαριές ενέργειες (AI enrich, full edit dialog, logo upload αν χρειάζεται).

Προτείνω:
- inline edits → local merge
- AI enrich / full form save → `fetchAll()`

## Αρχεία που θα αλλάξουν

- `src/hooks/useClientUpdate.ts`
- `src/pages/ClientDetail.tsx`
- `src/components/clients/detail/ClientSmartHeader.tsx`
- `src/components/clients/detail/ClientBusinessInfoCard.tsx`
- `src/components/clients/detail/ClientWebsitesCard.tsx`

## Αναμενόμενο αποτέλεσμα

Μετά το fix:
- κάθε inline αλλαγή θα φαίνεται αμέσως χωρίς refresh,
- tags / website / status / sector / τηλέφωνα / ΑΦΜ θα μένουν αποθηκευμένα,
- δεν θα υπάρχει η αίσθηση ότι “δεν σώζει”, ενώ ήδη έχει γίνει PATCH στη βάση.
