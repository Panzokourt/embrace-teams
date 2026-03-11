

# Org Chart — Full Rebuild Plan

## Πρόβλημα

Το τρέχον οργανόγραμμα είναι ένα static rendered tree μέσα σε ScrollArea με βασικό zoom (CSS scale). Δεν υποστηρίζει pan/drag-to-move, δεν έχει infinite canvas, τα nodes δεν είναι clickable για detail, δεν υπάρχουν views (by department, by person), και τα templates δεν αξιοποιούν το υπάρχον προσωπικό.

## Λύση

Πλήρες rebuild του OrgChart σε **infinite canvas** στυλ Miro με pan+zoom, πολλαπλά views, clickable nodes με detail panel, και smart templates.

## Τεχνική Προσέγγιση

### 1. Infinite Canvas Engine (χωρίς εξωτερική βιβλιοθήκη)
- Custom React canvas με `transform: translate(x, y) scale(z)` σε ένα wrapper div
- **Mouse wheel** → zoom (centered on cursor)
- **Middle-click drag** ή **Space+drag** → pan (hand tool)
- **Touch**: pinch-to-zoom, two-finger pan
- Mini-map στο corner (optional, phase 2)
- Fit-to-screen button, zoom controls

### 2. Views (3 modes)
- **Hierarchy View** (default): Κλασικό tree ανά reporting line — αυτό που υπάρχει τώρα αλλά σε canvas
- **Department View**: Grouped κάρτες ανά department σε columns/clusters, κάθε cluster δείχνει τα μέλη
- **List View**: Compact table/list με sorting, φιλτράρισμα, search — γρήγορη εύρεση ατόμου

Toggle μεταξύ views μέσω tabs στο header.

### 3. Interactive Nodes
- **Click** σε node → slide-in panel (sheet) δεξιά με:
  - Profile info (avatar, name, email, phone)
  - Position & department
  - Direct reports count
  - Link to Employee Profile (`/hr/employee/:id`)
  - Quick actions (edit, reassign, add subordinate)
- **Hover** → subtle highlight + tooltip με title
- **Vacant positions** → dashed border, prominent "Κενή θέση" badge, click to assign
- Connector lines μεταξύ nodes: animated SVG paths αντί για div borders

### 4. Smart Templates & Auto-build
- Βελτίωση του Wizard: αφού επιλεγεί template, **auto-match** υπάρχοντα profiles σε positions βάσει `job_title` ή `department`
- **Gap Analysis panel**: Μετά τη δημιουργία, δείχνει πόσες θέσεις είναι κενές, ποια departments λείπουν, ποια levels δεν έχουν κάλυψη
- Wizard step: "Αντιστοίχιση Προσωπικού" — drag-drop ή auto-suggest

### 5. SVG Connector Lines
- Αντικατάσταση CSS div lines με SVG `<path>` elements (bezier curves)
- Animated flow direction (subtle dash animation)
- Color-coded κατά department

## Αρχεία

| Αρχείο | Αλλαγή |
|---|---|
| `src/pages/OrgChart.tsx` | **Rewrite** — Infinite canvas, views, SVG connectors, detail panel |
| `src/components/org-chart/OrgChartCanvas.tsx` | **New** — Pan+zoom canvas wrapper |
| `src/components/org-chart/OrgNodeCard.tsx` | **New** — Redesigned node card (clickable, expandable) |
| `src/components/org-chart/OrgDetailPanel.tsx` | **New** — Slide-in sheet for node details |
| `src/components/org-chart/OrgDepartmentView.tsx` | **New** — Department-grouped view |
| `src/components/org-chart/OrgListView.tsx` | **New** — Table/list view |
| `src/components/org-chart/OrgConnectors.tsx` | **New** — SVG connector line renderer |
| `src/components/org-chart/OrgChartWizard.tsx` | **Update** — Add auto-match step + gap analysis |
| `src/components/org-chart/DraggableOrgNode.tsx` | **Remove** — Replaced by new OrgNodeCard |

Δεν χρειάζονται DB changes — το schema `org_chart_positions` καλύπτει ήδη hierarchy, department, user_id, color, level, sort_order.

