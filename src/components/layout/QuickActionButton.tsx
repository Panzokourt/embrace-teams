import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { briefDefinitions, getBriefDefinition } from '@/components/blueprints/briefDefinitions';
import { BriefFormDialog } from '@/components/blueprints/BriefFormDialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Plus,
  FolderKanban,
  CheckSquare,
  Palette,
  Monitor,
  FileText,
  Globe,
  Calendar,
  MessageSquare,
} from 'lucide-react';

const briefIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette, Monitor, FileText, Globe, Calendar, MessageSquare,
};

interface QuickActionButtonProps {
  rightPanelOpen?: boolean;
}

export function QuickActionButton({ rightPanelOpen }: QuickActionButtonProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);

  const quickActions = [
    {
      label: 'Νέο Έργο',
      icon: FolderKanban,
      onClick: () => { navigate('/projects?new=true'); setOpen(false); },
    },
    {
      label: 'Νέο Task',
      icon: CheckSquare,
      onClick: () => { navigate('/tasks?new=true'); setOpen(false); },
    },
  ];

  const handleBriefClick = (type: string) => {
    setSelectedBriefType(type);
    setOpen(false);
  };

  const selectedDef = selectedBriefType ? getBriefDefinition(selectedBriefType) : null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className={cn(
              "fixed bottom-6 z-50 h-14 w-14 rounded-full shadow-lg",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "transition-all duration-200",
              open && "rotate-45",
              rightPanelOpen ? "right-[calc(30%+1.5rem)]" : "right-6"
            )}
            style={rightPanelOpen ? { right: undefined } : undefined}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-56 p-2"
          sideOffset={12}
        >
          <div className="space-y-1">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                {action.label}
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            {briefDefinitions.map(def => {
              const Icon = briefIcons[def.icon] || FileText;
              return (
                <button
                  key={def.type}
                  onClick={() => handleBriefClick(def.type)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {def.label}
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
