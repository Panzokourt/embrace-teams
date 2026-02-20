
# Creatives Section + Ενοποιημένο Financials Tab

## Ανάλυση Τρέχουσας Κατάστασης

**Τρέχοντα tabs στο ProjectDetail**: Overview | Παραδοτέα | Tasks | Timeline | Media Plan | Αρχεία | Σχόλια | P&L | Οικονομικά

**Τι λείπει εντελώς**: Κανένα σύστημα για "δημιουργικά/εικαστικά" — ούτε DB table, ούτε storage bucket, ούτε UI component.

**Τι πρέπει να ενοποιηθεί**: Τα tabs "P&L" και "Οικονομικά" σε ένα ενιαίο "Οικονομικά" tab με sub-tabs.

---

## Μέρος 1: Creative Assets — Νέο Tab "Δημιουργικά"

### Σχεδιαστική Φιλοσοφία

Αντί για απλό file manager, δημιουργούμε ένα **visual asset board** εμπνευσμένο από το Figma/Notion asset gallery — καθαρό, gallery-first, με πλήρη context linking (deliverable / task / media plan action).

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Δημιουργικά                                  [Upload] [Bulk Actions ▼]  │
├─────────────────────────────────────────────────────────────────────────┤
│ [🖼 Gallery] [☰ Λίστα]   Group by: [Παραδοτέο ▼]  Status: [Όλα ▼]      │
│ Search: [___________]                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ▼ Παραδοτέο: Social Media Pack                          3 εικαστικά     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                             │
│   │ [preview]│  │ [preview]│  │ [preview]│                             │
│   │ Story v1 │  │ Story v2 │  │ Feed Post│                             │
│   │ [APPROVED│  │ [REVIEW] │  │ [DRAFT]  │                             │
│   └──────────┘  └──────────┘  └──────────┘                             │
│                                                                         │
│ ▼ Media Plan: Google Display                           2 εικαστικά     │
│   ┌──────────┐  ┌──────────┐                                           │
│   │ [preview]│  │ [preview]│                                           │
│   │ Banner   │  │ Rectangle│                                           │
│   │ [ACTIVE] │  │ [DRAFT]  │                                           │
│   └──────────┘  └──────────┘                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Migration: Νέος πίνακας `project_creatives`

```sql
CREATE TABLE public.project_creatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  
  -- File info (stored in project-files bucket)
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  
  -- Metadata
  title TEXT,           -- display name (can differ from file_name)
  description TEXT,
  version TEXT DEFAULT '1.0',
  
  -- Linking (context — optional, can link to one of these)
  deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  media_plan_item_id UUID REFERENCES public.media_plan_items(id) ON DELETE SET NULL,
  
  -- Status & Review
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft | review | client_review | approved | rejected | active | archived
  
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Upload info
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.project_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Manager can manage creatives" ON public.project_creatives
  FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can view creatives for their projects" ON public.project_creatives
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND has_project_access(auth.uid(), project_id)
  );

CREATE POLICY "Active users can upload creatives" ON public.project_creatives
  FOR INSERT WITH CHECK (
    is_active_user(auth.uid()) AND auth.uid() = uploaded_by
  );

-- Trigger for updated_at
CREATE TRIGGER update_project_creatives_updated_at
  BEFORE UPDATE ON public.project_creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Αποθήκευση στο **υπάρχον bucket** `project-files` (path: `{userId}/creatives/{timestamp}_{filename}`).

### Νέο Component: `src/components/projects/ProjectCreatives.tsx`

**Props**: `projectId`, `projectName`, `deliverables`, `tasks`, `mediaPlanItems`

**State**:
- `creatives: Creative[]` — από DB
- `view: 'gallery' | 'list'`
- `groupBy: 'deliverable' | 'task' | 'media_plan' | 'status' | 'none'`
- `filterStatus: string`
- `searchQuery: string`
- `selectedIds: string[]` — για bulk actions
- `selectedCreative: Creative | null` — για detail/review panel
- `uploading: boolean`

**Υποcomponents (εντός του ίδιου αρχείου)**:

**`CreativeCard`** (Gallery view):
```text
┌────────────────────┐
│                    │
│   [Image Preview]  │
│   ή [File Icon]    │
│                    │
├────────────────────┤
│ ☐  Story v1.png    │
│ [APPROVED] v1.0    │
│ 📎 Social Pack     │
│ [↓] [👁] [···]     │
└────────────────────┘
```
- Thumbnail για images (PNG/JPG/GIF/WEBP/SVG)
- File type icon για άλλους τύπους (PDF, AI, PSD, ZIP)
- Status badge με χρωματική κωδικοποίηση
- Hover: quick actions overlay (Download, View, Edit Status, Delete)
- Checkbox για bulk select

**`CreativeListRow`** (List view):
- Table row με columns: Checkbox | Preview (small) | Τίτλος | Τύπος | Συνδέεται με | Status | Version | Ημ/νία | Actions

**`CreativeDetailPanel`** (Slide-over / Sheet από δεξιά):
Ανοίγει on click οποιουδήποτε creative.
```text
┌──────────────────────────────────────┐
│ Story_v1.png                    [×]  │
│ Status: [APPROVED ▼]                 │
├──────────────────────────────────────┤
│ [Full Preview / Lightbox]            │
│                                      │
├──────────────────────────────────────┤
│ Συνδέεται με:                        │
│ [Παραδοτέο ▼] [Social Media Pack]   │
│                                      │
│ Version: [1.0]                       │
│ Περιγραφή: [editable textarea]       │
├──────────────────────────────────────┤
│ Review Notes:                        │
│ [textarea για feedback]              │
│ Reviewed by: Γιάννης Π. · 20/2/26   │
├──────────────────────────────────────┤
│ [Download] [Delete]                  │
└──────────────────────────────────────┘
```

**`UploadCreativesModal`**:
- Drag & drop zone
- Multi-file support
- Per-file: Title (auto από filename), Status (default: draft), Link to (Deliverable / Task / Media Plan action)
- Preview thumbnails
- [Upload All]

**`BulkActionsBar`** (εμφανίζεται όταν selectedIds.length > 0):
```text
3 επιλεγμένα  [Αλλαγή Status ▼] [Download All] [Διαγραφή]
```

**Grouping logic**:
- **Ανά Παραδοτέο**: Groups by `deliverable_id` → deliverable name (+ "Χωρίς σύνδεση")
- **Ανά Task**: Groups by `task_id` → task title
- **Ανά Media Plan Action**: Groups by `media_plan_item_id` → medium/campaign_name
- **Ανά Status**: Groups by `status`
- **Χωρίς ομαδοποίηση**: Flat list/gallery

**Statuses με χρώματα**:
| Status | Label | Χρώμα |
|--------|-------|-------|
| `draft` | Draft | gray |
| `review` | Εσωτερικό Review | yellow |
| `client_review` | Πελάτης Review | orange |
| `approved` | Εγκρίθηκε | green |
| `rejected` | Απορρίφθηκε | red |
| `active` | Ενεργό | blue |
| `archived` | Αρχείο | gray/muted |

---

## Μέρος 2: Ενοποιημένο "Οικονομικά" Tab

### Τρέχουσα κατάσταση
- Tab "P&L" → `ProjectPLReport` (analytics only, read-only)
- Tab "Οικονομικά" → `ProjectFinancialsManager` (CRUD για invoices/expenses)

### Νέα δομή: 1 tab "Οικονομικά" με 3 sub-tabs

```text
Οικονομικά
├── Τιμολόγια & Έξοδα  ← ήταν "Οικονομικά" (ProjectFinancialsManager)
├── P&L Report         ← ήταν "P&L" (ProjectPLReport)  
└── Budget Overview    ← νέο: σύνοψη budget, net budget, committed vs actual
```

**Αλλαγές στο `ProjectDetail.tsx`**:
1. Αφαίρεση του `<TabsTrigger value="pl-report">` και `<TabsTrigger value="financials">`
2. Προσθήκη ενός `<TabsTrigger value="financials">` με εικονίδιο DollarSign
3. Το `<TabsContent value="financials">` εμφανίζει ένα νέο component `ProjectFinancialsHub`

**Νέο Component: `src/components/projects/ProjectFinancialsHub.tsx`**

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Οικονομικά                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ [📊 Budget Overview] [📄 Τιμολόγια & Έξοδα] [📈 P&L Report]           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Budget Overview:                                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│ │ Συνολικό │ │  Agency  │ │   Net    │ │ Τιμολ.   │                   │
│ │ Budget   │ │  Fee     │ │  Budget  │ │ Εκκρεμή  │                   │
│ │ €100,000 │ │ €15,000  │ │ €85,000  │ │ €30,000  │                   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │
│                                                                         │
│ [Progress bar: Budget Used]                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Αυτό το component:
- Ορίζει 3 sub-tabs (χρησιμοποιεί τα υπάρχοντα `Tabs` / `TabsList` / `TabsTrigger`)
- **Tab "Budget Overview"**: Summary KPIs (Total Budget, Agency Fee, Net Budget, Invoiced, Paid, Expenses, Profit margin) + progress bars. Read-only analytics quick view.
- **Tab "Τιμολόγια & Έξοδα"**: Renders `<ProjectFinancialsManager>` (χωρίς αλλαγές στο existing component)
- **Tab "P&L Report"**: Renders `<ProjectPLReport>` (χωρίς αλλαγές στο existing component)

---

## Αρχεία που Αλλάζουν

| Αρχείο | Τύπος αλλαγής |
|--------|---------------|
| **Migration SQL** | Νέος πίνακας `project_creatives` + RLS policies |
| `src/components/projects/ProjectCreatives.tsx` | **Νέο αρχείο** — Gallery + List view, Upload modal, Review panel, Bulk actions |
| `src/components/projects/ProjectFinancialsHub.tsx` | **Νέο αρχείο** — Wrapper με 3 sub-tabs που ενσωματώνει τα 2 υπάρχοντα components + Budget Overview |
| `src/pages/ProjectDetail.tsx` | Αλλαγές tabs: Προσθήκη "Δημιουργικά", αντικατάσταση P&L+Οικονομικά με ένα "Οικονομικά" tab |
| `src/integrations/supabase/types.ts` | Αυτόματη ενημέρωση από migration |

---

## UX Flow

```text
Tab "Δημιουργικά" click
→ Gallery view, Group by Παραδοτέο (default)
  → [Upload] → drag & drop modal με per-file settings
  → Click on card → slide-over detail panel
    → Αλλαγή status inline
    → Προσθήκη review notes
    → Change linking (Παραδοτέο / Task / Media Plan)
  → Checkbox → bulk bar εμφανίζεται
    → Bulk Status change | Download All | Delete

Tab "Οικονομικά" click
→ Budget Overview sub-tab (default)
  → [Τιμολόγια & Έξοδα] sub-tab → CRUD (existing)
  → [P&L Report] sub-tab → analytics (existing)
```

---

## Τεχνικές Σημειώσεις

- **Image previews**: `supabase.storage.from('project-files').createSignedUrl(path, 3600)` για thumbnails. Για non-images → colored icon based on content_type.
- **Bulk download**: `Promise.all` signed URLs → individual `<a download>` triggers (browser-native).
- **Review workflow**: Αλλαγή status γίνεται με inline select (no dialog needed). Review notes προστίθενται στο detail panel.
- **Storage path**: `{userId}/creatives/{projectId}/{timestamp}_{safeName}` εντός του `project-files` bucket.
- **Δεν χρειάζεται νέο storage bucket** — χρησιμοποιεί το υπάρχον `project-files`.
- **`ProjectFinancialsHub`**: Είναι wrapper-only, κάνει import τα 2 υπάρχοντα components χωρίς καμία αλλαγή τους. Μόνο το `ProjectDetail.tsx` αλλάζει για τα tabs.
