import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Activity } from 'lucide-react';
import { ActivityFeedContent } from './ActivityFeedContent';

interface GlobalActivityFeedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalActivityFeed({ open, onOpenChange }: GlobalActivityFeedProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Δραστηριότητα
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-80px)]">
          <ActivityFeedContent active={open} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
