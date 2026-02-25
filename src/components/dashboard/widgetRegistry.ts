import { 
  DollarSign, Percent, TrendingUp, FileWarning, Trophy,
  FolderKanban, AlertTriangle, Activity, Timer, LucideIcon,
  BarChart3, ListChecks, Users, Target, Repeat, CreditCard,
  PieChart, Layers, Clock, ShieldAlert, Zap, UserCheck,
  ArrowUpRight, Handshake, PhoneCall
} from 'lucide-react';
import type { WidgetSize } from '@/hooks/useDashboardConfig';

export interface WidgetDefinition {
  id: string;
  label: string;
  defaultSize: WidgetSize;
  icon: LucideIcon;
  category: 'kpi' | 'chart' | 'list' | 'alert';
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ── KPI widgets (Zone A) ──
  { id: 'total_revenue', label: 'Συνολικά Έσοδα', defaultSize: 'small', icon: DollarSign, category: 'kpi' },
  { id: 'net_profit', label: 'Καθαρό Κέρδος', defaultSize: 'small', icon: TrendingUp, category: 'kpi' },
  { id: 'active_projects', label: 'Ενεργά Έργα', defaultSize: 'small', icon: FolderKanban, category: 'kpi' },
  { id: 'alerts_count', label: 'Alerts', defaultSize: 'small', icon: AlertTriangle, category: 'kpi' },
  { id: 'agency_fee', label: 'Προμήθεια Agency', defaultSize: 'small', icon: Percent, category: 'kpi' },
  { id: 'pending_invoices', label: 'Εκκρεμή Τιμολόγια', defaultSize: 'small', icon: FileWarning, category: 'kpi' },
  { id: 'active_tenders', label: 'Διαγωνισμοί', defaultSize: 'small', icon: FileWarning, category: 'kpi' },
  { id: 'win_rate', label: 'Win Rate', defaultSize: 'small', icon: Trophy, category: 'kpi' },
  { id: 'overdue', label: 'Overdue Tasks', defaultSize: 'small', icon: AlertTriangle, category: 'kpi' },
  { id: 'today_hours', label: 'Ώρες Σήμερα', defaultSize: 'small', icon: Timer, category: 'kpi' },
  { id: 'utilization', label: 'Utilization', defaultSize: 'small', icon: Activity, category: 'kpi' },
  { id: 'recurring_revenue', label: 'Recurring Revenue', defaultSize: 'small', icon: Repeat, category: 'kpi' },
  { id: 'outstanding_invoices', label: 'Ανεξόφλητα', defaultSize: 'small', icon: CreditCard, category: 'kpi' },
  { id: 'capacity_pct', label: 'Capacity %', defaultSize: 'small', icon: Users, category: 'kpi' },
  { id: 'pipeline_value', label: 'Pipeline Value', defaultSize: 'small', icon: Layers, category: 'kpi' },
  { id: 'active_proposals', label: 'Active Proposals', defaultSize: 'small', icon: FileWarning, category: 'kpi' },
  { id: 'closed_won', label: 'Closed Won', defaultSize: 'small', icon: Trophy, category: 'kpi' },
  { id: 'overdue_invoices', label: 'Overdue Invoices', defaultSize: 'small', icon: FileWarning, category: 'kpi' },

  // ── Chart widgets (Zone B) ──
  { id: 'revenue_chart', label: 'Γράφημα Εσόδων', defaultSize: 'large', icon: BarChart3, category: 'chart' },
  { id: 'project_progress', label: 'Πρόοδος Έργων', defaultSize: 'large', icon: ListChecks, category: 'chart' },
  { id: 'cost_breakdown_chart', label: 'Ανάλυση Κόστους', defaultSize: 'large', icon: PieChart, category: 'chart' },
  { id: 'hours_trend_chart', label: 'Hours Trend', defaultSize: 'large', icon: Clock, category: 'chart' },
  { id: 'pipeline_stages_chart', label: 'Pipeline Stages', defaultSize: 'large', icon: Activity, category: 'chart' },
  { id: 'win_rate_trend', label: 'Win Rate Trend', defaultSize: 'large', icon: TrendingUp, category: 'chart' },

  // ── List/medium widgets (Zone C) ──
  { id: 'top_clients_revenue', label: 'Top Πελάτες', defaultSize: 'medium', icon: Users, category: 'list' },
  { id: 'active_projects_breakdown', label: 'Κατανομή Έργων', defaultSize: 'medium', icon: FolderKanban, category: 'list' },
  { id: 'tasks_by_status', label: 'Tasks ανά Status', defaultSize: 'medium', icon: ListChecks, category: 'list' },
  { id: 'resource_allocation', label: 'Resource Allocation', defaultSize: 'medium', icon: Users, category: 'list' },
  { id: 'deadlines', label: 'Deadlines', defaultSize: 'medium', icon: Timer, category: 'list' },
  { id: 'margin_by_client', label: 'Margin by Client', defaultSize: 'medium', icon: DollarSign, category: 'list' },
  { id: 'revenue_by_service', label: 'Revenue by Service', defaultSize: 'medium', icon: BarChart3, category: 'list' },
  { id: 'monthly_comparison', label: 'Monthly Comparison', defaultSize: 'medium', icon: BarChart3, category: 'list' },
  { id: 'proposals_by_stage', label: 'Proposals by Stage', defaultSize: 'medium', icon: Layers, category: 'list' },
  { id: 'top_opportunities', label: 'Top Opportunities', defaultSize: 'medium', icon: Target, category: 'list' },
  { id: 'client_acquisition_trend', label: 'Client Acquisition', defaultSize: 'medium', icon: ArrowUpRight, category: 'list' },
  { id: 'recent_activity', label: 'Πρόσφατη Δραστηριότητα', defaultSize: 'medium', icon: Activity, category: 'list' },

  // ── Alert widgets (Zone D) ──
  { id: 'sla_breaches', label: 'SLA Breaches', defaultSize: 'medium', icon: ShieldAlert, category: 'alert' },
  { id: 'high_workload_warning', label: 'High Workload', defaultSize: 'medium', icon: Zap, category: 'alert' },
  { id: 'cost_variance_alert', label: 'Cost Variance', defaultSize: 'medium', icon: AlertTriangle, category: 'alert' },
  { id: 'stalled_deals', label: 'Stalled Deals', defaultSize: 'medium', icon: AlertTriangle, category: 'alert' },
  { id: 'followup_required', label: 'Follow-up Required', defaultSize: 'medium', icon: PhoneCall, category: 'alert' },
];

export function getWidgetDef(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find(w => w.id === id);
}

export function getColSpanClass(size: WidgetSize): string {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-1 md:col-span-2';
    case 'large': return 'col-span-1 md:col-span-2 lg:col-span-4';
  }
}
