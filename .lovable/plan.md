
# Προ-συμπληρωμένα Project Templates & Αφαίρεση Budget/Fee

## Αλλαγές

### 1. Αφαίρεση Budget και Fee από template form
Αφαιρούνται τα πεδία "Default Budget" και "Default Fee (%)" από το dialog δημιουργίας/επεξεργασίας template στο `ProjectTemplatesManager.tsx`.

### 2. Seed data - Δημιουργία 7 έτοιμων templates
Θα δημιουργηθούν μέσω database migration τα παρακάτω templates με ρεαλιστικά deliverables και tasks:

**Digital Campaign**
- Deliverables: Campaign Strategy, Creative Assets, Landing Page, Ad Setup & Management, Performance Report
- Tasks: Brief analysis, Target audience research, Creative concept, Copywriting, Design banners/visuals, Landing page development, Ad account setup, Campaign launch, A/B testing, Weekly optimization, Performance report

**Event**
- Deliverables: Event Planning, Venue & Logistics, Content & Communication, On-site Production, Post-event Report
- Tasks: Event concept & brief, Venue research & booking, Timeline & run of show, Supplier coordination, Invitations & RSVP management, Press release, Social media promotion, On-site setup, Photography/videography, Post-event report & analytics

**PR / Δημόσιες Σχέσεις**
- Deliverables: PR Strategy, Media Kit, Press Coverage, Media Monitoring Report
- Tasks: Stakeholder analysis, Key messages development, Media list compilation, Press release writing, Media kit creation, Journalist outreach, Press conference/event coordination, Media monitoring, Coverage report, Crisis communication plan

**Branding**
- Deliverables: Brand Research, Brand Identity, Brand Guidelines, Brand Collateral
- Tasks: Market & competitor analysis, Brand audit, Logo concepts & design, Color palette & typography, Brand guidelines document, Business cards & stationery, Templates (presentations, documents), Brand launch plan

**Social Media**
- Deliverables: Social Media Strategy, Content Calendar, Content Production, Monthly Report
- Tasks: Audience & competitor analysis, Platform strategy, Content calendar creation, Copywriting, Visual content creation, Community management setup, Posting & scheduling, Engagement & community management, Monthly analytics report, Strategy optimization

**Production**
- Deliverables: Pre-production, Production, Post-production, Final Delivery
- Tasks: Concept & script development, Storyboard, Casting & location scouting, Equipment & crew planning, Shooting schedule, Filming/recording, Editing & color grading, Sound design & music, Review & revisions, Final export & delivery

**Consulting**
- Deliverables: Discovery & Analysis, Strategy Document, Implementation Plan, Review & Optimization
- Tasks: Stakeholder interviews, Current state analysis, Market/industry research, SWOT analysis, Strategy development, Recommendations document, Implementation roadmap, Training/workshop, Progress review, Final report & next steps

### 3. Σημεία αλλαγής

**Migration SQL**: Insert τα 7 templates + deliverables + tasks. Χωρίς company_id ωστε να είναι global.

**`ProjectTemplatesManager.tsx`**: Αφαίρεση πεδίων default_budget και default_agency_fee_percentage από form state και UI.

## Technical Details

- Τα templates θα εισαχθούν με `company_id = NULL` ωστε να είναι διαθέσιμα σε ολους
- Κάθε task θα έχει λογικά `days_offset_start` / `days_offset_due` για αυτόματο scheduling
- Τα tasks θα έχουν `deliverable_ref_order` που αντιστοιχεί στο `sort_order` του deliverable στο οποίο ανήκουν
- Αφαίρεση budget/fee μόνο από το UI template editor - τα columns παραμένουν στη βάση για backward compatibility
