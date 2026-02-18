export interface BriefFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'multiselect' | 'repeater' | 'checkboxes';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  repeaterFields?: Omit<BriefFieldConfig, 'repeaterFields'>[];
}

export interface BriefDefinition {
  type: string;
  label: string;
  icon: string;
  description: string;
  fields: BriefFieldConfig[];
}

export const briefDefinitions: BriefDefinition[] = [
  {
    type: 'creative',
    label: 'Creative Brief',
    icon: 'Palette',
    description: 'Σύνοψη δημιουργικού project',
    fields: [
      { key: 'project_name', label: 'Όνομα Project', type: 'text', required: true },
      { key: 'client', label: 'Πελάτης', type: 'text', required: true },
      { key: 'background', label: 'Background / Context', type: 'textarea', placeholder: 'Περιγράψτε το πλαίσιο του project...' },
      { key: 'objective', label: 'Στόχος', type: 'textarea', required: true },
      { key: 'target_audience', label: 'Target Audience', type: 'textarea' },
      { key: 'key_message', label: 'Key Message', type: 'textarea' },
      { key: 'tone_of_voice', label: 'Tone of Voice', type: 'text', placeholder: 'π.χ. Professional, Friendly, Bold...' },
      { key: 'mandatory_elements', label: 'Υποχρεωτικά Στοιχεία', type: 'textarea', placeholder: 'Logos, disclaimers, legal text...' },
      { key: 'budget_range', label: 'Budget Range', type: 'text', placeholder: 'π.χ. €5,000 - €10,000' },
      { key: 'timeline', label: 'Timeline', type: 'text', placeholder: 'π.χ. 4 εβδομάδες' },
      {
        key: 'deliverables',
        label: 'Παραδοτέα',
        type: 'checkboxes',
        options: ['Print Ad', 'Digital Banners', 'Social Media Posts', 'Video', 'Radio Spot', 'OOH', 'Brochure', 'Packaging', 'Website', 'App Design'],
      },
      { key: 'notes', label: 'Σημειώσεις', type: 'textarea' },
    ],
  },
  {
    type: 'digital_campaign',
    label: 'Digital Campaign Brief',
    icon: 'Monitor',
    description: 'Briefing ψηφιακής καμπάνιας',
    fields: [
      { key: 'campaign_name', label: 'Όνομα Καμπάνιας', type: 'text', required: true },
      { key: 'client', label: 'Πελάτης', type: 'text', required: true },
      { key: 'objective', label: 'Στόχος Καμπάνιας', type: 'textarea', required: true },
      { key: 'target_audience', label: 'Target Audience', type: 'textarea' },
      {
        key: 'platforms',
        label: 'Πλατφόρμες',
        type: 'multiselect',
        options: ['Facebook', 'Instagram', 'Google Ads', 'LinkedIn', 'TikTok', 'YouTube', 'X (Twitter)', 'Pinterest', 'Programmatic'],
      },
      { key: 'budget', label: 'Budget', type: 'text', placeholder: '€' },
      { key: 'kpis', label: 'KPIs', type: 'textarea', placeholder: 'Impressions, Clicks, CTR, Conversions...' },
      { key: 'start_date', label: 'Ημερομηνία Έναρξης', type: 'date' },
      { key: 'end_date', label: 'Ημερομηνία Λήξης', type: 'date' },
      { key: 'landing_page_url', label: 'Landing Page URL', type: 'text', placeholder: 'https://...' },
      { key: 'creative_requirements', label: 'Creative Requirements', type: 'textarea' },
      { key: 'tracking_notes', label: 'Tracking / Analytics Notes', type: 'textarea' },
    ],
  },
  {
    type: 'contact_report',
    label: 'Contact Report',
    icon: 'FileText',
    description: 'Αναφορά συνάντησης / επικοινωνίας',
    fields: [
      { key: 'meeting_date', label: 'Ημερομηνία Συνάντησης', type: 'date', required: true },
      { key: 'client', label: 'Πελάτης', type: 'text', required: true },
      { key: 'attendees_agency', label: 'Παρόντες (Agency)', type: 'textarea', placeholder: 'Ονόματα, ρόλοι...' },
      { key: 'attendees_client', label: 'Παρόντες (Πελάτης)', type: 'textarea', placeholder: 'Ονόματα, ρόλοι...' },
      {
        key: 'meeting_type',
        label: 'Τύπος Συνάντησης',
        type: 'select',
        options: ['Κλήση', 'Video Call', 'Δια ζώσης', 'Email'],
      },
      { key: 'agenda', label: 'Agenda', type: 'textarea' },
      { key: 'discussion_points', label: 'Σημεία Συζήτησης', type: 'textarea' },
      { key: 'decisions', label: 'Αποφάσεις', type: 'textarea' },
      {
        key: 'action_items',
        label: 'Action Items',
        type: 'repeater',
        repeaterFields: [
          { key: 'action', label: 'Ενέργεια', type: 'text', required: true },
          { key: 'responsible', label: 'Υπεύθυνος', type: 'text' },
          { key: 'deadline', label: 'Deadline', type: 'date' },
        ],
      },
      { key: 'next_meeting_date', label: 'Επόμενη Συνάντηση', type: 'date' },
      { key: 'notes', label: 'Σημειώσεις', type: 'textarea' },
    ],
  },
  {
    type: 'website',
    label: 'Website Brief',
    icon: 'Globe',
    description: 'Briefing ανάπτυξης website',
    fields: [
      { key: 'project_name', label: 'Όνομα Project', type: 'text', required: true },
      { key: 'client', label: 'Πελάτης', type: 'text', required: true },
      {
        key: 'website_type',
        label: 'Τύπος Website',
        type: 'select',
        options: ['Corporate', 'E-commerce', 'Landing Page', 'Microsite', 'Redesign'],
        required: true,
      },
      {
        key: 'pages',
        label: 'Σελίδες',
        type: 'repeater',
        repeaterFields: [
          { key: 'page_name', label: 'Όνομα Σελίδας', type: 'text', required: true },
          { key: 'description', label: 'Περιγραφή', type: 'text' },
        ],
      },
      { key: 'target_audience', label: 'Target Audience', type: 'textarea' },
      { key: 'key_features', label: 'Key Features', type: 'textarea', placeholder: 'Blog, Contact Form, Search, Newsletter...' },
      { key: 'cms_preference', label: 'CMS Preference', type: 'text', placeholder: 'WordPress, Custom, Headless...' },
      { key: 'seo_requirements', label: 'SEO Requirements', type: 'textarea' },
      { key: 'integrations', label: 'Integrations', type: 'textarea', placeholder: 'CRM, Payment, Analytics...' },
      { key: 'content_status', label: 'Κατάσταση Περιεχομένου', type: 'select', options: ['Έτοιμο', 'Σε εξέλιξη', 'Δεν υπάρχει'] },
      { key: 'design_references', label: 'Design References', type: 'textarea', placeholder: 'URLs ή περιγραφή...' },
      { key: 'timeline', label: 'Timeline', type: 'text' },
      { key: 'budget', label: 'Budget', type: 'text', placeholder: '€' },
    ],
  },
  {
    type: 'event',
    label: 'Event Brief',
    icon: 'Calendar',
    description: 'Briefing εκδήλωσης / event',
    fields: [
      { key: 'event_name', label: 'Όνομα Εκδήλωσης', type: 'text', required: true },
      { key: 'client', label: 'Πελάτης', type: 'text', required: true },
      {
        key: 'event_type',
        label: 'Τύπος Εκδήλωσης',
        type: 'select',
        options: ['Conference', 'Launch', 'Exhibition', 'Gala', 'Workshop', 'Corporate Event'],
        required: true,
      },
      { key: 'event_date', label: 'Ημερομηνία', type: 'date', required: true },
      { key: 'venue', label: 'Χώρος / Τοποθεσία', type: 'text' },
      { key: 'expected_attendees', label: 'Αναμενόμενοι Συμμετέχοντες', type: 'number' },
      { key: 'objective', label: 'Στόχος', type: 'textarea' },
      { key: 'theme', label: 'Θέμα / Concept', type: 'textarea' },
      { key: 'program_outline', label: 'Πρόγραμμα', type: 'textarea' },
      { key: 'catering', label: 'Catering Requirements', type: 'textarea' },
      { key: 'av_requirements', label: 'AV / Technical Requirements', type: 'textarea' },
      { key: 'speakers', label: 'Ομιλητές / Προσκεκλημένοι', type: 'textarea' },
      { key: 'budget', label: 'Budget', type: 'text', placeholder: '€' },
      { key: 'branding_needs', label: 'Branding Needs', type: 'textarea', placeholder: 'Signage, name badges, backdrop...' },
      { key: 'notes', label: 'Σημειώσεις', type: 'textarea' },
    ],
  },
  {
    type: 'communication',
    label: 'Communication Brief',
    icon: 'MessageSquare',
    description: 'Γενικό briefing επικοινωνίας',
    fields: [
      { key: 'project_name', label: 'Όνομα Project', type: 'text', required: true },
      { key: 'client', label: 'Πελάτης', type: 'text', required: true },
      { key: 'objective', label: 'Στόχος Επικοινωνίας', type: 'textarea', required: true },
      { key: 'target_audience', label: 'Target Audience', type: 'textarea' },
      { key: 'key_messages', label: 'Key Messages', type: 'textarea' },
      {
        key: 'channels',
        label: 'Κανάλια Επικοινωνίας',
        type: 'multiselect',
        options: ['TV', 'Radio', 'Print', 'Digital', 'Social Media', 'OOH', 'PR', 'Events', 'Direct Marketing', 'Influencer Marketing'],
      },
      { key: 'timeline', label: 'Timeline', type: 'text' },
      { key: 'budget', label: 'Budget', type: 'text', placeholder: '€' },
      { key: 'success_metrics', label: 'Success Metrics', type: 'textarea' },
      { key: 'competitors', label: 'Ανταγωνιστές / References', type: 'textarea' },
      { key: 'brand_guidelines_link', label: 'Brand Guidelines Link', type: 'text', placeholder: 'URL...' },
      { key: 'notes', label: 'Σημειώσεις', type: 'textarea' },
    ],
  },
];

export function getBriefDefinition(type: string): BriefDefinition | undefined {
  return briefDefinitions.find(d => d.type === type);
}
