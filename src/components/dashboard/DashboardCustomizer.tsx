import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { WIDGET_REGISTRY } from './widgetRegistry';
import type { WidgetConfig, WidgetSize } from '@/hooks/useDashboardConfig';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  widgets: WidgetConfig[];
  onToggle: (id: string) => void;
  onResize: (id: string, size: WidgetSize) => void;
}

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
];

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'Οικονομικά',
  project: 'Έργα & Tasks',
  composite: 'Σύνθετα',
};

export default function DashboardCustomizer({ open, onOpenChange, widgets, onToggle, onResize }: Props) {
  const getWidgetConfig = (id: string) => widgets.find(w => w.id === id);

  const categories = ['financial', 'project', 'composite'] as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:max-w-[340px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Προσαρμογή Dashboard</SheetTitle>
          <SheetDescription>Επιλέξτε widgets και μέγεθος</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {categories.map(cat => (
            <div key={cat}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {CATEGORY_LABELS[cat]}
              </h4>
              <div className="space-y-2">
                {WIDGET_REGISTRY.filter(w => w.category === cat).map(def => {
                  const cfg = getWidgetConfig(def.id);
                  const visible = cfg?.visible ?? def.defaultVisible;
                  const size = cfg?.size ?? def.defaultSize;

                  return (
                    <div
                      key={def.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Switch
                          checked={visible}
                          onCheckedChange={() => onToggle(def.id)}
                          className="scale-90"
                        />
                        <span className="text-sm font-medium truncate text-foreground/90">
                          {def.label}
                        </span>
                      </div>

                      <div className="flex gap-0.5 ml-2">
                        {SIZE_OPTIONS.map(s => (
                          <Button
                            key={s.value}
                            size="sm"
                            variant={size === s.value ? 'default' : 'ghost'}
                            className={cn(
                              "h-6 w-6 p-0 text-[10px] rounded-md",
                              size === s.value && "shadow-sm"
                            )}
                            onClick={() => onResize(def.id, s.value)}
                          >
                            {s.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
