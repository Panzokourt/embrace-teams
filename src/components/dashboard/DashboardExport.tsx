import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel } from '@/utils/exportUtils';
import type { WidgetConfig } from '@/hooks/useDashboardConfig';
import { WIDGET_REGISTRY } from './widgetRegistry';

interface Props {
  widgets: WidgetConfig[];
  statsSnapshot: Record<string, string | number>;
}

export default function DashboardExport({ widgets, statsSnapshot }: Props) {
  const handlePrint = () => window.print();

  const handleExcel = () => {
    const visibleIds = widgets.filter(w => w.visible).map(w => w.id);
    const data = visibleIds
      .map(id => {
        const def = WIDGET_REGISTRY.find(w => w.id === id);
        const value = statsSnapshot[id];
        if (!def || value === undefined) return null;
        return { widget: def.label, value: String(value) };
      })
      .filter(Boolean) as { widget: string; value: string }[];

    exportToExcel(
      data,
      [
        { key: 'widget', label: 'Widget' },
        { key: 'value', label: 'Τιμή' },
      ],
      `dashboard-export-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Εκτύπωση / PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
