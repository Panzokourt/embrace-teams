
# Right Panel Redesign - Secretary, Activity, Notifications

## Problems to Fix

1. **Dark overlay**: The Secretary panel uses a Sheet (modal) that darkens the background and blocks interaction with the rest of the app
2. **QuickAction button overlap**: The floating "+" button at bottom-right overlaps with the Secretary chat input
3. **No unified panel**: Secretary, Activity, and Notifications are separate components - need to be tabs in one panel

## Solution

### 1. Replace Sheet with Inline Resizable Panel

Instead of a modal Sheet, the right panel will be part of the main layout flex container. When open, it pushes the main content area narrower (responsive).

```text
┌─────────┬──────────────────────┬──────────────────┐
│ Sidebar │   Main Content       │  Right Panel     │
│         │   (shrinks when      │  (Secretary /    │
│         │    panel opens)      │   Activity /     │
│         │                      │   Notifications) │
└─────────┴──────────────────────┴──────────────────┘
```

- Uses `react-resizable-panels` (already installed)
- Panel width: min 320px, max 600px, default ~400px
- Resizable drag handle on left edge
- Panel state (open/closed, width) saved to localStorage
- Smooth transition when opening/closing
- No overlay, no backdrop - everything stays interactive

### 2. Unified Right Panel with Tabs

The panel header will have 3 tab options:
- **Secretary** (Bot icon) - AI chat
- **Activity** (Activity icon) - Global activity feed
- **Notifications** (Bell icon) - Notification list

Each tab shows its respective content. The panel remembers which tab was last active.

### 3. Fix QuickAction Button

Move the FAB button so it doesn't overlap with the panel. When the panel is open, the FAB shifts left to stay within the main content area (using CSS transition or conditional positioning).

## Files to Change

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Replace Sheet-based panel with inline ResizablePanel layout; manage panel state (open/tab) |
| `src/components/secretary/SecretaryPanel.tsx` | Rewrite as a tabbed panel (Secretary + Activity + Notifications) without Sheet |
| `src/components/layout/TopBar.tsx` | Update toggle buttons to open panel with specific tab |
| `src/components/activity/GlobalActivityFeed.tsx` | Extract the content into a standalone component (remove Sheet wrapper) so it can be embedded in the panel |
| `src/components/notifications/NotificationBell.tsx` | Keep the bell icon in TopBar but also create an inline notification list for the panel |
| `src/components/layout/QuickActionButton.tsx` | Adjust positioning to avoid overlap with panel |

## Technical Details

### AppLayout Changes
- Wrap main content + panel in `ResizablePanelGroup` (horizontal)
- Main content is a `ResizablePanel` with `defaultSize={100}` (shrinks when panel opens)
- Right panel is conditionally rendered `ResizablePanel` with `ResizableHandle`
- State: `rightPanelOpen: boolean`, `activeTab: 'secretary' | 'activity' | 'notifications'`

### Panel Header
```text
┌──────────────────────────────────────────┐
│  [Secretary] [Activity] [Notifications] X│
├──────────────────────────────────────────┤
│  (content based on active tab)           │
└──────────────────────────────────────────┘
```

### TopBar Integration
- Secretary button opens panel with "secretary" tab
- Activity button opens panel with "activity" tab  
- Notification bell opens panel with "notifications" tab
- If panel is already open on that tab, clicking closes it (toggle)

### Keyboard Shortcut
- Cmd+J toggles Secretary panel (existing behavior preserved)

### localStorage Persistence
- Key: `secretary-panel-open` (boolean)
- Key: `secretary-panel-tab` (active tab)
