import { 
  DollarSign, Percent, TrendingUp, FileWarning, Trophy,
  FolderKanban, AlertTriangle, Activity, Timer, LucideIcon,
  BarChart3, ListChecks
} from 'lucide-react';
import type { WidgetSize, WidgetViewType } from '@/hooks/useDashboardConfig';

export interface WidgetDefinition {
  id: string;
  label: string;
  defaultSize: WidgetSize;
  defaultVisible: boolean;
  icon: LucideIcon;
  category: 'financial' | 'project' | 'composite';
  supportedViews?: WidgetViewType[];
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  { id: 'total_revenue', label: 'Συνολικά Έσοδα', defaultSize: 'small', defaultVisible: true, icon: DollarSign, category: 'financial' },
  { id: 'agency_fee', label: 'Προμήθεια Agency', defaultSize: 'small', defaultVisible: true, icon: Percent, category: 'financial' },
  { id: 'net_profit', label: 'Καθαρό Κέρδος', defaultSize: 'small', defaultVisible: true, icon: TrendingUp, category: 'financial' },
  { id: 'pending_invoices', label: 'Εκκρεμή Τιμολόγια', defaultSize: 'small', defaultVisible: true, icon: FileWarning, category: 'financial' },
  { id: 'active_tenders', label: 'Διαγωνισμοί', defaultSize: 'small', defaultVisible: true, icon: FileWarning, category: 'project' },
  { id: 'active_projects', label: 'Ενεργά Έργα', defaultSize: 'small', defaultVisible: true, icon: FolderKanban, category: 'project' },
  { id: 'win_rate', label: 'Win Rate', defaultSize: 'small', defaultVisible: true, icon: Trophy, category: 'project' },
  { id: 'overdue', label: 'Overdue Tasks', defaultSize: 'small', defaultVisible: true, icon: AlertTriangle, category: 'project' },
  { id: 'today_hours', label: 'Ώρες Σήμερα', defaultSize: 'small', defaultVisible: true, icon: Timer, category: 'project' },
  { id: 'utilization', label: 'Utilization', defaultSize: 'small', defaultVisible: true, icon: Activity, category: 'project' },
  { id: 'pipeline', label: 'Pipeline', defaultSize: 'large', defaultVisible: true, icon: Activity, category: 'composite', supportedViews: ['card', 'table'] },
  { id: 'alerts', label: 'Alerts', defaultSize: 'medium', defaultVisible: true, icon: AlertTriangle, category: 'composite', supportedViews: ['card', 'list'] },
  { id: 'deadlines', label: 'Deadlines', defaultSize: 'medium', defaultVisible: true, icon: Timer, category: 'composite', supportedViews: ['card', 'table'] },
  { id: 'recent_activity', label: 'Πρόσφατη Δραστηριότητα', defaultSize: 'medium', defaultVisible: true, icon: Activity, category: 'composite', supportedViews: ['card', 'list'] },
  { id: 'revenue_chart', label: 'Γράφημα Εσόδων', defaultSize: 'large', defaultVisible: false, icon: BarChart3, category: 'composite' },
  { id: 'project_progress', label: 'Πρόοδος Έργων', defaultSize: 'medium', defaultVisible: false, icon: ListChecks, category: 'composite', supportedViews: ['card', 'table'] },
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
