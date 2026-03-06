

# AI Package Generator

## Overview
Add an "AI Suggest Package" button to the Packages tab that uses Lovable AI (Gemini) to analyze the company's existing services and suggest an optimized package with service selection, quantities, pricing, and discount — auto-filling the PackageFormDialog.

## Architecture

### Edge Function: `supabase/functions/suggest-package/index.ts`
- Receives: list of available services (name, category, list_price, total_cost, margin_pct), optional user prompt (e.g. "Digital marketing package for small business")
- Uses Lovable AI Gateway with **tool calling** to return structured output:
  - `package_name`, `description`, `list_price`, `discount_percent`
  - `items[]`: `{ service_id, quantity, duration_months, rationale }`
- Model: `google/gemini-3-flash-preview`
- System prompt in Greek, agency/services context

### Frontend Changes

**PackagesList.tsx**:
- Add "AI Πρόταση" button (Sparkles icon) next to "Νέο Πακέτο"
- Opens a small dialog/popover asking for optional prompt (e.g. "Τι τύπο πακέτου θέλετε;")
- On submit: calls edge function, receives structured suggestion, opens PackageFormDialog pre-filled

**PackageFormDialog.tsx**:
- Accept optional `initialData` prop to pre-fill from AI suggestion
- Show a dismissible banner "Προτεινόμενο από AI — ελέγξτε και προσαρμόστε" when AI-generated

### Config
- Add `[functions.suggest-package]` to `supabase/config.toml`

## Flow
1. User clicks "AI Πρόταση" → enters optional description → "Δημιουργία με AI"
2. Edge function sends services data + prompt to Gemini via tool calling
3. Returns structured package suggestion
4. PackageFormDialog opens pre-filled with AI data
5. User reviews, adjusts, saves normally

## Files to create/edit
- **Create**: `supabase/functions/suggest-package/index.ts`
- **Edit**: `supabase/config.toml` (add function entry)
- **Edit**: `src/components/pricing/PackagesList.tsx` (add AI button + dialog)
- **Edit**: `src/components/pricing/PackageFormDialog.tsx` (accept initialData prop)

