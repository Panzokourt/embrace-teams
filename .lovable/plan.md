

# Plan: Add "+" Quick Actions Menu to Secretary Input

## Overview

Add a "+" button next to the text input in the Secretary chat that opens a popover menu with quick actions like file upload, create task, create project, log time, etc.

## Changes

### 1. MentionInput.tsx — Add "+" button with Popover

Add a `Plus` button to the left of the textarea that opens a `Popover` with a grid of quick action items:

| Action | Icon | Behavior |
|---|---|---|
| 📎 Ανέβασε αρχείο | Paperclip | Triggers hidden file input, uploads to storage, sends file reference message |
| ➕ Νέο Task | CheckSquare | Sends prompt "Θέλω να δημιουργήσω ένα νέο task" |
| 🚀 Νέο Project | FolderKanban | Sends prompt "Θέλω να δημιουργήσω ένα νέο project" |
| 📅 Νέο Meeting | Calendar | Sends prompt "Θέλω να δημιουργήσω ένα νέο meeting" |
| 📝 Νέο Brief | FileText | Sends prompt "Θέλω να δημιουργήσω ένα νέο brief" |
| ⏱ Log Time | Clock | Sends prompt "Θέλω να καταχωρήσω χρόνο εργασίας" |
| 🧠 Brain Analysis | Brain | Sends prompt "Τρέξε ανάλυση Brain" |
| ⚠️ Risk Radar | ShieldAlert | Sends prompt "Τρέξε Risk Radar analysis" |

**Props change**: Add `onSendMessage?: (text: string) => void` and `onFileUpload?: (file: File) => void` to `MentionInputProps`.

### 2. SecretaryChat.tsx — Wire up handlers

- Pass `onSendMessage={sendMessage}` and `onFileUpload` handler to `MentionInput`
- File upload handler: uploads file to Supabase storage bucket, then sends a message like "Ανέβασα αρχείο: [filename]" so the Secretary can reference it

### 3. UI Design

- "+" button: ghost variant, same height as send button (h-11 w-11), positioned to the left of the textarea
- Popover opens upward (side="top") with a clean grid of labeled icon buttons
- Each non-upload action simply calls `onSendMessage` with the appropriate prompt

## Files to Edit

| File | Change |
|---|---|
| `src/components/secretary/MentionInput.tsx` | Add Plus button + Popover with quick actions grid, accept new props |
| `src/components/secretary/SecretaryChat.tsx` | Pass `sendMessage` handler and file upload logic to MentionInput |

