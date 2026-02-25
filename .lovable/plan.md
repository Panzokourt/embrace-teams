# Fix Empty Cards + Add Inline Editing on Client Detail

## Problem

When cards have no data (Websites, Social, Ad Accounts, Strategy, Team, Contacts), they return `null` and disappear, leaving large empty gaps -- especially visible in the left column (screenshots show blank space).

## Solution

All cards will always render, showing an empty state with an inline "Add" button when no data exists. This ensures the layout stays consistent and users can add data directly without going to the edit form.

---

## Changes Per Component

### 1. `ClientWebsitesCard.tsx`

- Remove `if (!primaryWebsite && ...) return null`
- Show empty state: "No websites added" + inline "Add Website" button (opens a small inline form or triggers the edit dialog)

### 2. `ClientSocialCard.tsx`

- Remove `if (accounts.length === 0) return null`
- Show empty state with placeholder rows for common platforms (Facebook, Instagram, LinkedIn, TikTok, YouTube) as grayed-out items with "Add" action

### 3. `ClientAdAccountsCard.tsx`

- Remove `if (accounts.length === 0) return null`
- Show empty state with placeholder for common platforms (Business Manager, Meta Ads, Google Ads, GA4, GTM) grayed out with "Add" action

### 4. `ClientStrategyCard.tsx`

- Remove the `if (!hasContent) return null` check
- Show empty state sections for Goals, Pillars, Positioning with "Add" prompts

### 5. `ClientTeamCard.tsx`

- Remove `if (members.length === 0) return null`
- Show empty state: "No team members assigned" with helpful text

### 6. `ClientContactsCard.tsx`

- Already shows empty state (good) -- no change needed

### 7. `ClientBriefsCard.tsx`

- Already shows empty state (good) -- no change needed

### 8. `ClientProjectsCard.tsx`

- Already shows empty state (good) -- no change needed

---

## Empty State Design Pattern

Each empty card will follow this consistent pattern:

- Card header with icon + title (same as when populated)
- Light dashed border placeholder area inside
- Muted text describing what can be added
- A subtle "Add" button (ghost variant, small size)
- Clicking "Add" triggers `onEdit()` callback passed from ClientDetail, opening the ClientForm dialog

---

## Props Changes

Cards that currently don't accept an `onEdit` callback will receive one:

- `ClientWebsitesCard`: add `onEdit?: () => void`
- `ClientSocialCard`: add `onEdit?: () => void`
- `ClientAdAccountsCard`: add `onEdit?: () => void`
- `ClientStrategyCard`: add `onEdit?: () => void`
- `ClientTeamCard`: add `onEdit?: () => void`

The `ClientDetail.tsx` page will pass `onEdit={() => setEditOpen(true)}` to each card.

---

## Files Modified (7)


| File                                                     | Change                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/components/clients/detail/ClientWebsitesCard.tsx`   | Always render, add empty state + onEdit prop                          |
| `src/components/clients/detail/ClientSocialCard.tsx`     | Always render, add empty state with platform placeholders + onEdit    |
| `src/components/clients/detail/ClientAdAccountsCard.tsx` | Always render, add empty state with platform placeholders + onEdit    |
| `src/components/clients/detail/ClientStrategyCard.tsx`   | Always render, add empty state for goals/pillars/positioning + onEdit |
| `src/components/clients/detail/ClientTeamCard.tsx`       | Always render, add empty state + onEdit                               |
| `src/components/clients/detail/ClientContactsCard.tsx`   | Add onEdit prop for "Add Contact" action in empty state               |
| `src/pages/ClientDetail.tsx`                             | Pass `onEdit` prop to all cards                                       |


No new files needed. No database changes needed.  
Make clickabel assets that are possible to be clicked (people, tasks, links, etc)