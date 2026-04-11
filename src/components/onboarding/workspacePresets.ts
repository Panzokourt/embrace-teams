export type WorkspaceType = 'digital_agency' | 'comms_pr' | 'dev_team' | 'creative_agency' | 'freelancer';

export interface WorkspacePreset {
  type: WorkspaceType;
  label: string;
  emoji: string;
  tagline: string;
  departments: string[];
  services: Array<{ name: string; default_price: number; unit: string }>;
  projectTemplates: Array<{ name: string; stages: string[]; defaultTasks: string[] }>;
  kpis: string[];
}

export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    type: 'digital_agency',
    label: 'Digital Agency',
    emoji: '🏢',
    tagline: 'Projects, clients, media planning & finance',
    departments: ['Creative', 'Account Management', 'Digital', 'Finance'],
    services: [
      { name: 'Social Media Management', default_price: 800, unit: '/μήνα' },
      { name: 'SEO', default_price: 600, unit: '/μήνα' },
      { name: 'Paid Ads', default_price: 500, unit: '/μήνα' },
      { name: 'Content Creation', default_price: 400, unit: '/μήνα' },
      { name: 'Web Design', default_price: 2500, unit: '/project' },
      { name: 'Email Marketing', default_price: 350, unit: '/μήνα' },
    ],
    projectTemplates: [
      {
        name: 'Monthly Retainer',
        stages: ['Briefing', 'Planning', 'Production', 'Review', 'Delivery'],
        defaultTasks: ['Monthly brief meeting', 'Content calendar', 'Content creation', 'Client approval', 'Publishing', 'Monthly report'],
      },
      {
        name: 'Campaign',
        stages: ['Strategy', 'Creative', 'Production', 'Launch', 'Reporting'],
        defaultTasks: ['Campaign strategy', 'Creative brief', 'Assets production', 'Campaign setup', 'Go live', 'Performance report'],
      },
    ],
    kpis: ['Utilization Rate', 'Project Profitability', 'Client Retention', 'Monthly Revenue'],
  },
  {
    type: 'comms_pr',
    label: 'Comms / PR / Events',
    emoji: '📢',
    tagline: 'Campaigns, contacts, press & event management',
    departments: ['PR', 'Events', 'Strategy', 'Content'],
    services: [
      { name: 'PR Retainer', default_price: 1500, unit: '/μήνα' },
      { name: 'Event Organization', default_price: 3000, unit: '/event' },
      { name: 'Crisis Management', default_price: 2000, unit: '/μήνα' },
      { name: 'Content Strategy', default_price: 800, unit: '/μήνα' },
      { name: 'Press Office', default_price: 1000, unit: '/μήνα' },
    ],
    projectTemplates: [
      {
        name: 'PR Campaign',
        stages: ['Strategy', 'Media Outreach', 'Coverage', 'Reporting'],
        defaultTasks: ['Campaign strategy', 'Media list', 'Press release', 'Outreach', 'Coverage tracking', 'Report'],
      },
      {
        name: 'Event',
        stages: ['Planning', 'Production', 'Execution', 'Post-event'],
        defaultTasks: ['Event brief', 'Venue', 'Speakers', 'Invitations', 'On-site management', 'Post-event report'],
      },
    ],
    kpis: ['Media Coverage', 'Event Attendance', 'Reach & Impressions', 'Press Mentions'],
  },
  {
    type: 'dev_team',
    label: 'Development Team',
    emoji: '💻',
    tagline: 'Sprints, features, bugs & technical delivery',
    departments: ['Frontend', 'Backend', 'Design / UX', 'QA', 'DevOps'],
    services: [
      { name: 'Web Development', default_price: 80, unit: '/ώρα' },
      { name: 'Mobile Development', default_price: 90, unit: '/ώρα' },
      { name: 'UI/UX Design', default_price: 70, unit: '/ώρα' },
      { name: 'QA & Testing', default_price: 60, unit: '/ώρα' },
      { name: 'DevOps', default_price: 85, unit: '/ώρα' },
      { name: 'Technical Consulting', default_price: 120, unit: '/ώρα' },
    ],
    projectTemplates: [
      {
        name: 'Sprint',
        stages: ['Backlog Grooming', 'Sprint Planning', 'In Progress', 'Review', 'Done'],
        defaultTasks: ['Sprint planning meeting', 'Task breakdown', 'Development', 'Code review', 'QA testing', 'Sprint demo', 'Retrospective'],
      },
      {
        name: 'Feature Release',
        stages: ['Design', 'Development', 'Testing', 'Staging', 'Production'],
        defaultTasks: ['Requirements', 'UI design', 'Development', 'Unit tests', 'Staging deploy', 'Production deploy'],
      },
    ],
    kpis: ['Sprint Velocity', 'Bug Rate', 'Code Coverage', 'Deployment Frequency'],
  },
  {
    type: 'creative_agency',
    label: 'Creative Agency',
    emoji: '🎨',
    tagline: 'Branding, production, client approvals & assets',
    departments: ['Creative Direction', 'Design', 'Copywriting', 'Production'],
    services: [
      { name: 'Brand Identity', default_price: 3500, unit: '/project' },
      { name: 'Video Production', default_price: 2000, unit: '/project' },
      { name: 'Photography', default_price: 800, unit: '/ημέρα' },
      { name: 'Copywriting', default_price: 500, unit: '/project' },
      { name: 'Packaging Design', default_price: 1500, unit: '/project' },
      { name: 'Motion Graphics', default_price: 1200, unit: '/project' },
    ],
    projectTemplates: [
      {
        name: 'Brand Project',
        stages: ['Discovery', 'Concept', 'Design', 'Refinement', 'Delivery'],
        defaultTasks: ['Client brief', 'Research', 'Moodboard', 'Initial concepts', 'Presentation', 'Revisions', 'Final files'],
      },
      {
        name: 'Video Production',
        stages: ['Pre-production', 'Production', 'Post-production', 'Delivery'],
        defaultTasks: ['Storyboard', 'Script', 'Shoot', 'Editing', 'Color grading', 'Sound', 'Client review', 'Final export'],
      },
    ],
    kpis: ['Revision Rounds', 'On-time Delivery', 'Client Satisfaction', 'Project Profitability'],
  },
  {
    type: 'freelancer',
    label: 'Freelancer',
    emoji: '⚡',
    tagline: 'Clients, invoicing, time tracking & simple projects',
    departments: [],
    services: [
      { name: 'Consulting', default_price: 80, unit: '/ώρα' },
      { name: 'Design', default_price: 70, unit: '/ώρα' },
      { name: 'Development', default_price: 90, unit: '/ώρα' },
      { name: 'Copywriting', default_price: 50, unit: '/ώρα' },
      { name: 'Project fixed', default_price: 1500, unit: '/project' },
    ],
    projectTemplates: [
      {
        name: 'Client Project',
        stages: ['Briefing', 'In Progress', 'Review', 'Done'],
        defaultTasks: ['Brief & scope', 'Work', 'Client review', 'Revisions', 'Delivery', 'Invoice'],
      },
    ],
    kpis: ['Monthly Revenue', 'Billable Hours', 'Active Clients', 'Invoice Collection Rate'],
  },
];
