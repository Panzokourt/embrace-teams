
# Σελίδα "Προσχέδια" + Προ-φόρμες + Quick Action Button

## Τι αλλάζει

### 1. Νέα σελίδα "Προσχέδια" (`/blueprints`)
Η σελίδα θα περιέχει δύο tabs:
- **Project Templates**: Μεταφορά του υπάρχοντος `ProjectTemplatesManager` από τις Ρυθμίσεις
- **Προ-φόρμες (Briefs)**: Νέα section με 6 έτοιμες φόρμες

Η σελίδα προστίθεται στο sidebar κάτω από τα admin items με εικονίδιο `FileStack`.

### 2. Έξι έτοιμες Προ-φόρμες
Κάθε φόρμα ανοίγει σε dialog με τα κατάλληλα πεδία:

**Creative Brief**
- Project Name, Client, Background/Context, Objective, Target Audience, Key Message, Tone of Voice, Mandatory Elements, Budget Range, Timeline, Deliverables (checkboxes), Additional Notes

**Digital Campaign Brief**
- Campaign Name, Client, Campaign Objective, Target Audience, Platforms (multi-select: Facebook, Instagram, Google Ads, LinkedIn, TikTok, YouTube), Budget, KPIs, Start/End Date, Landing Page URL, Creative Requirements, Tracking/Analytics Notes

**Contact Report**
- Meeting Date, Client, Attendees (Agency), Attendees (Client), Meeting Type (dropdown: Call, Video Call, In-person, Email), Agenda, Discussion Points, Decisions Made, Action Items (repeatable: action, responsible, deadline), Next Meeting Date, Notes

**Website Brief**
- Project Name, Client, Website Type (dropdown: Corporate, E-commerce, Landing Page, Microsite, Redesign), Pages (repeatable list), Target Audience, Key Features, CMS Preference, SEO Requirements, Integrations Needed, Content Status, Design References, Timeline, Budget

**Event Brief**
- Event Name, Client, Event Type (dropdown: Conference, Launch, Exhibition, Gala, Workshop, Corporate), Date, Venue/Location, Expected Attendees, Objective, Theme/Concept, Program Outline, Catering Requirements, AV/Technical Requirements, Speakers/Guests, Budget, Branding Needs, Notes

**Generic Communication Brief**
- Project Name, Client, Communication Objective, Target Audience, Key Messages, Channels, Timeline, Budget, Success Metrics, Competitors/References, Brand Guidelines Link, Additional Notes

### 3. Εξαγωγή φορμών
Κάθε συμπληρωμένη φόρμα μπορεί να εξαχθεί σε:
- **PDF**: Μέσω `window.print()` με print-friendly CSS styling
- **Word (.doc)**: HTML table export (ίδια μέθοδος με το υπάρχον Excel export)
- **Excel (.xls)**: Μέσω του υπάρχοντος `exportToExcel`

### 4. Quick Action Button (FAB)
Στρογγυλό floating "+" button κάτω-δεξιά, μόνιμα ορατό σε όλες τις σελίδες. Πατώντας το εμφανίζει popover/menu με:
- Νέο Έργο (link στο /projects με auto-open dialog)
- Νέο Task
- Creative Brief
- Digital Campaign Brief
- Contact Report
- Website Brief
- Event Brief
- Communication Brief

## Technical Details

### Νέα αρχεία
- `src/pages/Blueprints.tsx` - Η σελίδα με tabs (Templates + Briefs)
- `src/components/blueprints/BriefFormDialog.tsx` - Generic dialog component για briefs
- `src/components/blueprints/briefDefinitions.ts` - Ορισμοί πεδίων για κάθε brief type
- `src/components/blueprints/BriefExport.ts` - Export utilities (PDF/Word/Excel)
- `src/components/layout/QuickActionButton.tsx` - Το floating "+" button

### Αλλαγές σε υπάρχοντα αρχεία
- `src/App.tsx` - Προσθήκη route `/blueprints`
- `src/components/layout/AppSidebar.tsx` - Προσθήκη "Προσχέδια" στα admin nav items
- `src/components/layout/AppLayout.tsx` - Προσθήκη `QuickActionButton` component
- `src/pages/Settings.tsx` - Αφαίρεση `ProjectTemplatesManager` (μεταφέρεται)

### Database
- Νέος πίνακας `briefs` για αποθήκευση συμπληρωμένων φορμών:

```text
briefs
  id          uuid PK
  company_id  uuid FK
  project_id  uuid FK (nullable)
  client_id   uuid FK (nullable)
  created_by  uuid FK
  brief_type  text (creative, digital_campaign, contact_report, website, event, communication)
  title       text
  data        jsonb (τα πεδία της φόρμας)
  status      text (draft, final)
  created_at  timestamptz
  updated_at  timestamptz
```

- RLS: Admin/Manager full access, active users can create/view own briefs

### Brief data structure
Τα πεδία κάθε brief ορίζονται declaratively σε `briefDefinitions.ts` ως array of field configs:

```text
{
  key: string,
  label: string,
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'multiselect' | 'repeater',
  options?: string[],        // για select/multiselect
  required?: boolean,
  repeaterFields?: field[]   // για repeater (π.χ. action items)
}
```

Αυτό επιτρέπει ένα μόνο `BriefFormDialog` component να render-άρει δυναμικά οποιαδήποτε φόρμα.

### Export approach
- **PDF**: Δημιουργία HTML representation -> `window.print()` με `@media print` styles
- **Word**: HTML table -> Blob download ως `.doc` (ίδια τεχνική με exportToExcel)
- **Excel**: Χρήση υπάρχοντος `exportToExcel` utility

### Quick Action Button
- Positioned `fixed bottom-6 right-6 z-50`
- Animated rotation on click
- Popover menu με icon + label ανά action
- Links: Έργο/Task πηγαίνουν στις αντίστοιχες σελίδες, Briefs ανοίγουν απευθείας το dialog

### Σειρά υλοποίησης
1. Database migration (briefs table)
2. Brief definitions + export utilities
3. BriefFormDialog component
4. Blueprints page (templates tab + briefs tab)
5. QuickActionButton component
6. Route, sidebar, layout updates
7. Αφαίρεση templates από Settings
