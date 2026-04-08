

# QuickChatBar: File Upload & AI Document Understanding

## Problem
The QuickChatBar has no way to attach files. The user wants to upload documents (PDF, DOCX, images, etc.) both via button and drag & drop, and have the AI agent understand the file contents deeply — similar to how Claude handles file attachments natively.

## Changes

### 1. QuickChatBar: File Upload UI
- Add a **Paperclip button** next to the input (left side, before text input)
- Add **drag & drop** support on the entire QuickChatBar container — show a visual drop zone overlay when dragging files over it
- Hidden `<input type="file" multiple>` triggered by the paperclip button
- Show attached files as small chips below the input before sending (file name + remove button)
- Support multiple files at once

### 2. File Processing Pipeline (client-side)
When files are attached and the message is sent:
- **Text files** (CSV, TXT, JSON, XML, MD, LOG): read directly via `file.text()`
- **PDFs**: use the existing `useDocumentParser` hook (client-side pdf.js extraction, fallback to OCR via `parse-document` edge function)
- **Images** (JPEG, PNG, WEBP): convert to base64 for Claude's vision API
- **DOCX/PPTX**: send to `parse-document` edge function for extraction
- The parsed content is included in the user message sent to `secretary-agent`

### 3. Secretary Agent: Enhanced File Handling
Update the `secretary-agent` edge function to accept multimodal messages:
- Accept messages with `content` as an array (Anthropic multimodal format): `[{type: "text", text: "..."}, {type: "image", source: {type: "base64", ...}}]`
- For text-based files: content is injected as text blocks with file metadata headers
- For images: sent as vision blocks so Claude can actually "see" them
- Increase context handling — currently `analyze_uploaded_file` truncates at 30K chars; for direct message attachments, allow larger content (Claude supports 200K tokens)

### 4. Message Display
- User messages with attachments show file chips (icon + name) above the message text
- Different icons for different file types (PDF, image, document, spreadsheet)

## Technical Details

**QuickChatBar changes:**
- New state: `attachedFiles: File[]`, `parsedAttachments: ParsedAttachment[]`
- Drag events: `onDragOver`, `onDragLeave`, `onDrop` on the container div
- `useDocumentParser` hook for PDF/DOCX parsing
- On send: parse all files → build multimodal message payload → send to secretary-agent

**Message payload format to secretary-agent:**
```typescript
// For text files
{ role: "user", content: [
  { type: "text", text: "📎 report.pdf (15 σελίδες)\n\n[content...]" },
  { type: "text", text: "User's actual message" }
]}

// For images
{ role: "user", content: [
  { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "..." }},
  { type: "text", text: "User's message about the image" }
]}
```

**secretary-agent changes:**
- In the message conversion code (line ~1852), handle `content` being either a string or an array
- Pass array content directly to Anthropic API (it natively supports this format)

## Files

| File | Change |
|------|--------|
| `src/components/quick-chat/QuickChatBar.tsx` | Add paperclip button, drag & drop, file chips, parsing logic, multimodal message building |
| `supabase/functions/secretary-agent/index.ts` | Handle multimodal message content (array format) in message conversion |

