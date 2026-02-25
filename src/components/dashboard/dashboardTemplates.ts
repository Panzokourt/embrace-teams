import {
  LayoutDashboard, DollarSign, Settings, TrendingUp, type LucideIcon,
} from 'lucide-react';
import type { WidgetSize } from '@/hooks/useDashboardConfig';

export type ZoneId = 'health' | 'trends' | 'workload' | 'attention';
export type DashboardTemplateId = 'executive' | 'finance' | 'operations' | 'sales';

export interface ZoneDefinition {
  id: ZoneId;
  label: string;
  maxWidgets: number;
  allowedSizes: WidgetSize[];
  gridClass: string;
}

export interface TemplateZoneConfig {
  widgets: string[];
}

export interface TemplateDefinition {
  id: DashboardTemplateId;
  label: string;
  icon: LucideIcon;
  description: string;
  zones: Record<ZoneId, TemplateZoneConfig>;
}

export const ZONE_DEFINITIONS: Record<ZoneId, ZoneDefinition> = {
  health: {
    id: 'health',
    label: 'Health Summary',
    maxWidgets: 4,
    allowedSizes: ['small'],
    gridClass: 'grid-cols-2 lg:grid-cols-4',
  },
  trends: {
    id: 'trends',
    label: 'Trends',
    maxWidgets: 2,
    allowedSizes: ['large'],
    gridClass: 'grid-cols-1 lg:grid-cols-2',
  },
  workload: {
    id: 'workload',
    label: 'Workload & Breakdown',
    maxWidgets: 3,
    allowedSizes: ['medium'],
    gridClass: 'grid-cols-1 md:grid-cols-3',
  },
  attention: {
    id: 'attention',
    label: 'Attention Required',
    maxWidgets: 2,
    allowedSizes: ['medium'],
    gridClass: 'grid-cols-1 md:grid-cols-2',
  },
};

export const ZONE_ORDER: ZoneId[] = ['health', 'trends', 'workload', 'attention'];

export const DASHBOARD_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'executive',
    label: 'Executive',
    icon: LayoutDashboard,
    description: 'Συνολική εικόνα εταιρίας σε 30 δευτερόλεπτα',
    zones: {
      health: { widgets: ['total_revenue', 'net_profit', 'active_projects', 'alerts_count'] },
      trends: { widgets: ['revenue_chart', 'project_progress'] },
      workload: { widgets: ['utilization', 'top_clients_revenue', 'active_projects_breakdown'] },
      attention: { widgets: ['overdue', 'overdue_invoices'] },
    },
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    description: 'Οικονομικός έλεγχος & κερδοφορία',
    zones: {
      health: { widgets: ['total_revenue', 'recurring_revenue', 'net_profit', 'outstanding_invoices'] },
      trends: { widgets: ['revenue_chart', 'cost_breakdown_chart'] },
      workload: { widgets: ['margin_by_client', 'revenue_by_service', 'monthly_comparison'] },
      attention: { widgets: ['overdue_invoices', 'cost_variance_alert'] },
    },
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Settings,
    description: 'Απόδοση παράδοσης & εκτέλεσης',
    zones: {
      health: { widgets: ['active_projects', 'utilization', 'overdue', 'capacity_pct'] },
      trends: { widgets: ['project_progress', 'hours_trend_chart'] },
      workload: { widgets: ['tasks_by_status', 'resource_allocation', 'deadlines'] },
      attention: { widgets: ['sla_breaches', 'high_workload_warning'] },
    },
  },
  {
    id: 'sales',
    label: 'Sales & Pipeline',
    icon: TrendingUp,
    description: 'Ορατότητα ανάπτυξης & απόκτησης',
    zones: {
      health: { widgets: ['pipeline_value', 'win_rate', 'active_proposals', 'closed_won'] },
      trends: { widgets: ['pipeline_stages_chart', 'win_rate_trend'] },
      workload: { widgets: ['proposals_by_stage', 'top_opportunities', 'client_acquisition_trend'] },
      attention: { widgets: ['stalled_deals', 'followup_required'] },
    },
  },
];

export function getTemplate(id: DashboardTemplateId): TemplateDefinition {
  return DASHBOARD_TEMPLATES.find(t => t.id === id) || DASHBOARD_TEMPLATES[0];
}

/** Get all widget IDs used by a template */
export function getTemplateWidgetIds(id: DashboardTemplateId): string[] {
  const tmpl = getTemplate(id);
  return ZONE_ORDER.flatMap(z => tmpl.zones[z].widgets);
}
