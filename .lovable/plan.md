## Αλλαγές στο Floating Dock (bottom bar)

### 1. Αφαίρεση Secretary από το dock
Αφαιρώ το Secretary item από το `FloatingDock.tsx` καθώς υπάρχει ήδη πρόσβαση μέσω:
- Quick Chat (⌘I) — για γρήγορα prompts
- Dedicated `/secretary` page — για πλήρη εμπειρία
- Sidebar bottom rail icon

Διαγράφω επίσης το αντίστοιχο case `'secretary'` στο `renderPanelContent()` και το keyboard shortcut handling στο `DockContext.tsx` (το ⌘+J που άνοιγε το secretary panel — θα μείνει το ⌘I για Quick Chat).

### 2. Ενοποίηση Notifications + Activity με tabs
Δημιουργώ νέο component `src/components/dock/DockInboxPanel.tsx` που περιέχει `Tabs` (shadcn) με δύο sub-views:
- **Ειδοποιήσεις** — `<NotificationList />`
- **Activity** — `<ActivityFeedContent />`

Στο dock μένει ένα μόνο εικονίδιο **"Inbox"** με icon `Bell` (ή combined). Το unread badge θα δείχνει αν υπάρχουν αδιάβαστες notifications.

Στο `DockContext.tsx` αντικαθιστώ τα `'notifications'` και `'activity'` από το `DockPanelId` union με ένα ενιαίο `'inbox'`. Default tab όταν ανοίγει = "Ειδοποιήσεις", αλλά θα θυμάται την τελευταία επιλογή σε `localStorage` (`dock.inbox.tab`).

### 3. Clickable Level → Leaderboard
Στο `DockXPBadge.tsx` προσθέτω `useNavigate` και `onClick={() => navigate('/leaderboard')}`. Το tooltip ενημερώνεται σε "Level X — Y XP — Δείτε leaderboard".

## Τελική σειρά εικονιδίων στο dock

```text
[Clock | Timer] | [XP(→leaderboard) WorkMode] | [+] | [Inbox(Bell+badge)] [Chat] [QuickAI ⌘I]
```

## Τεχνικές λεπτομέρειες

**Αρχεία που αλλάζουν:**
- `src/components/dock/FloatingDock.tsx` — αφαίρεση secretary, αντικατάσταση notifications+activity με ενιαίο inbox item
- `src/components/dock/DockInboxPanel.tsx` *(νέο)* — Tabs wrapper για NotificationList + ActivityFeedContent με persisted tab
- `src/components/dock/DockXPBadge.tsx` — clickable navigation στο `/leaderboard`
- `src/contexts/DockContext.tsx` — ενημέρωση `DockPanelId` τύπου (`'inbox'` αντί για `'notifications' | 'activity'`), αφαίρεση ⌘+J shortcut για secretary

**Backward compatibility:** Δεν υπάρχουν άλλα components που να καλούν `openPanel('notifications')` ή `openPanel('activity')` ή `openPanel('secretary')` εκτός από το `FloatingDock`, οπότε δεν χρειάζεται deprecation handling. (Θα γίνει grep verification κατά την υλοποίηση.)

**Sidebar / Secretary page:** Παραμένουν αμετάβλητα — η πρόσβαση στο secretary γίνεται μέσω αυτών.
