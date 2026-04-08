import { useState, useEffect, type ReactNode } from 'react';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'cc-section-prefs';

interface SectionPrefs {
  [sectionId: string]: { collapsed?: boolean; hidden?: boolean };
}

function getPrefs(): SectionPrefs {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function setPref(id: string, update: Partial<{ collapsed: boolean; hidden: boolean }>) {
  const prefs = getPrefs();
  prefs[id] = { ...prefs[id], ...update };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** If true, section can be hidden entirely by user */
  canHide?: boolean;
  className?: string;
}

export default function CollapsibleSection({
  id, title, icon, badge, children, defaultOpen = true, canHide = true, className,
}: CollapsibleSectionProps) {
  const prefs = getPrefs()[id];
  const [isOpen, setIsOpen] = useState(prefs?.collapsed === undefined ? defaultOpen : !prefs.collapsed);
  const [isHidden, setIsHidden] = useState(prefs?.hidden || false);

  useEffect(() => { setPref(id, { collapsed: !isOpen }); }, [isOpen, id]);
  useEffect(() => { setPref(id, { hidden: isHidden }); }, [isHidden, id]);

  if (isHidden) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("border-border/30 shadow-sm", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors py-3 px-5">
            <CardTitle className="text-[13px] font-semibold tracking-tight flex items-center gap-2.5">
              <ChevronRight className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                isOpen && "rotate-90"
              )} />
              <span className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                {icon}
              </span>
              {title}
              {badge}
              {canHide && (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsHidden(true);
                      }}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Απόκρυψη section</TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {children}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** Button to show all hidden sections — place at bottom of page */
export function ShowHiddenSections() {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  useEffect(() => {
    const prefs = getPrefs();
    setHiddenIds(Object.entries(prefs).filter(([, v]) => v.hidden).map(([k]) => k));
  }, []);

  if (hiddenIds.length === 0) return null;

  const showAll = () => {
    const prefs = getPrefs();
    Object.keys(prefs).forEach(k => { prefs[k].hidden = false; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.location.reload();
  };

  return (
    <div className="flex justify-center py-2">
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={showAll}>
        <Eye className="h-3.5 w-3.5" />
        Εμφάνιση κρυφών sections ({hiddenIds.length})
      </Button>
    </div>
  );
}
