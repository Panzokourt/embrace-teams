import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, CheckSquare, FileText, Palette, Monitor, Globe, Calendar, MessageSquare } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { briefDefinitions, getBriefDefinition } from '@/components/blueprints/briefDefinitions';
import { BriefFormDialog } from '@/components/blueprints/BriefFormDialog';

const briefIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette, Monitor, FileText, Globe, Calendar, MessageSquare,
};

export default function DockQuickActions() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);
  const selectedDef = selectedBriefType ? getBriefDefinition(selectedBriefType) : null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'group relative h-10 w-10 rounded-full flex items-center justify-center',
                  'transition-all duration-200 ease-out hover:bg-white/15',
                  open && 'bg-white/25 shadow-inner'
                )}
                aria-label="Quick Actions"
              >
                <Plus
                  className={cn(
                    'h-4 w-4 text-white transition-transform duration-200 drop-shadow-sm group-hover:scale-110',
                    open && 'rotate-45 scale-110'
                  )}
                />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          {!open && (
            <TooltipContent side="top" sideOffset={8} className="text-xs">
              Quick Actions
            </TooltipContent>
          )}
        </Tooltip>
        <PopoverContent side="top" align="center" sideOffset={12} className="w-56 p-2">
          <div className="space-y-1">
            <button
              onClick={() => { navigate('/projects?new=true'); setOpen(false); }}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
            >
              <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" /> Νέο Έργο
            </button>
            <button
              onClick={() => { navigate('/tasks?new=true'); setOpen(false); }}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
            >
              <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" /> Νέο Task
            </button>
            <div className="h-px bg-border my-1" />
            {briefDefinitions.map((def) => {
              const Icon = briefIcons[def.icon] || FileText;
              return (
                <button
                  key={def.type}
                  onClick={() => { setSelectedBriefType(def.type); setOpen(false); }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" /> {def.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {selectedDef && (
        <BriefFormDialog
          open={true}
          onOpenChange={() => setSelectedBriefType(null)}
          definition={selectedDef}
        />
      )}
    </>
  );
}
