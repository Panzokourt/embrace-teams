import { Zap } from 'lucide-react';
import { useFocusMode } from '@/contexts/FocusContext';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function DockWorkMode() {
  const { enterFocus } = useFocusMode();

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          onClick={() => enterFocus()}
          className="h-8 px-2.5 rounded-full flex items-center gap-1.5 text-[11px] font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-all"
        >
          <Zap className="h-3.5 w-3.5 fill-current text-amber-200" />
          <span>Work Mode</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="text-xs">
        Είσοδος σε Focus Mode
      </TooltipContent>
    </Tooltip>
  );
}
