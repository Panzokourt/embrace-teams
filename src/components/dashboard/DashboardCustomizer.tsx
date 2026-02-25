import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { getTemplate, ZONE_ORDER, ZONE_DEFINITIONS, type DashboardTemplateId } from './dashboardTemplates';
import { getWidgetDef } from './widgetRegistry';
import type { WidgetConfig, WidgetSize } from '@/hooks/useDashboardConfig';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  widgets: WidgetConfig[];
  onToggle: (id: string) => void;
  onResize: (id: string, size: WidgetSize) => void;
  templateId?: DashboardTemplateId;
}

export default function DashboardCustomizer({ open, onOpenChange, widgets, onToggle, onResize, templateId = 'executive' }: Props) {
  const template = getTemplate(templateId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:max-w-[340px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Προσαρμογή {template.label}</SheetTitle>
          <SheetDescription>Εμφάνιση / απόκρυψη widgets ανά zone</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {ZONE_ORDER.map(zoneId => {
            const zoneDef = ZONE_DEFINITIONS[zoneId];
            const zoneWidgetIds = template.zones[zoneId].widgets;
            if (zoneWidgetIds.length === 0) return null;

            return (
              <div key={zoneId}>
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                  {zoneDef.label}
                </h4>
                <div className="space-y-2">
                  {zoneWidgetIds.map(wId => {
                    const def = getWidgetDef(wId);
                    const cfg = widgets.find(w => w.id === wId);
                    const visible = cfg?.visible ?? true;

                    return (
                      <div
                        key={wId}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Switch
                            checked={visible}
                            onCheckedChange={() => onToggle(wId)}
                            className="scale-90"
                          />
                          <span className="text-sm font-medium truncate text-foreground/90">
                            {def?.label || wId}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
