export const MEDIA_ACTION_STATUSES = [
  'draft',
  'planned',
  'ready_for_production',
  'in_production',
  'ready_to_launch',
  'live',
  'completed',
  'on_hold',
  'cancelled',
] as const;

export type MediaActionStatus = typeof MEDIA_ACTION_STATUSES[number];

export const STATUS_LABELS: Record<MediaActionStatus, string> = {
  draft: 'Draft',
  planned: 'Planned',
  ready_for_production: 'Ready for Production',
  in_production: 'In Production',
  ready_to_launch: 'Ready to Launch',
  live: 'Live',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<MediaActionStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  planned: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  ready_for_production: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  in_production: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  ready_to_launch: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  live: 'bg-green-500/15 text-green-700 dark:text-green-400',
  completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  on_hold: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export const MEDIA_PLAN_STATUSES = ['draft', 'active', 'completed', 'archived'] as const;
export type MediaPlanStatus = typeof MEDIA_PLAN_STATUSES[number];

export const PLAN_STATUS_LABELS: Record<MediaPlanStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export const FUNNEL_STAGES = [
  'Awareness',
  'Consideration',
  'Conversion',
  'Retention',
  'Advocacy',
] as const;

export const OBJECTIVES = [
  'Brand Awareness',
  'Reach',
  'Traffic',
  'Engagement',
  'Lead Generation',
  'Conversions',
  'Sales',
  'App Installs',
  'Video Views',
  'Store Visits',
  'Catalog Sales',
  'Messages',
] as const;

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export const COST_TYPES = ['CPM', 'CPC', 'CPA', 'CPV', 'CPL', 'Flat Fee', 'Hourly', 'Retainer'] as const;

export const TASK_BUNDLE_TEMPLATES: Record<string, string[]> = {
  Newsletter: ['Brief Finalization', 'Copywriting', 'Design', 'Review', 'Setup', 'QA', 'Send', 'Performance Check'],
  'Paid Media': ['Brief', 'Asset Creation', 'Copywriting', 'Campaign Setup', 'Tracking Setup', 'QA', 'Launch', 'Optimization', 'Reporting'],
  'Social Media': ['Brief', 'Copywriting', 'Design', 'Scheduling', 'Community Management', 'Reporting'],
  Event: ['Planning', 'Logistics', 'Promotion', 'Execution', 'Follow-up', 'Reporting'],
  PR: ['Brief', 'Media List', 'Press Release', 'Outreach', 'Follow-up', 'Coverage Report'],
  SEO: ['Keyword Research', 'Content Brief', 'Writing', 'Optimization', 'Publishing', 'Performance Check'],
};

export const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'medium', label: 'Channel' },
  { value: 'objective', label: 'Objective' },
  { value: 'funnel_stage', label: 'Funnel Stage' },
  { value: 'owner_id', label: 'Owner' },
  { value: 'status', label: 'Status' },
  { value: 'phase', label: 'Phase' },
  { value: 'category', label: 'Category' },
] as const;
