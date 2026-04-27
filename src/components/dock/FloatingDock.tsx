import { Bell, MessageSquare, Sparkles, ChevronDown, EyeOff, Eye, Pin, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDock, type DockPanelId } from '@/contexts/DockContext';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDockVisibility, type DockMode } from '@/hooks/useDockVisibility';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

import { NotificationList } from '@/components/notifications/NotificationList';
import FloatingDockPanel from './FloatingDockPanel';
import DockChatPicker from './DockChatPicker';
import DockInboxPanel from './DockInboxPanel';
import DockWorkDayClock from './DockWorkDayClock';
import DockActiveTimer from './DockActiveTimer';
import DockWorkMode from './DockWorkMode';
import DockXPBadge from './DockXPBadge';
import DockQuickActions from './DockQuickActions';

interface DockItem {
  id: Exclude<DockPanelId, null> | 'quick-chat';
  label: string;
  icon: LucideIcon;
  kind: 'panel' | 'quick-chat' | 'chat';
  badge?: boolean;
}

interface FloatingDockProps {
  onQuickChatToggle: () => void;
  registerSendHandler?: (handler: (text: string) => void) => void;
}

export default function FloatingDock({ onQuickChatToggle, registerSendHandler }: FloatingDockProps) {
  const { activePanel, togglePanel, closePanel } = useDock();
  const { floatingWindows } = useChat();
  const { user } = useAuth();
  const { mode, setMode, isExpanded, onHoverEnter, onHoverLeave, setLocked } = useDockVisibility();

  const items: DockItem[] = [
    { id: 'inbox', label: 'Ειδοποιήσεις & Activity', icon: Bell, kind: 'panel' },
    { id: 'chat-picker', label: 'Chat', icon: MessageSquare, kind: 'chat', badge: floatingWindows.length > 0 },
    { id: 'quick-chat', label: 'Quick AI (⌘I)', icon: Sparkles, kind: 'quick-chat' },
  ];

  const handleClick = (item: DockItem) => {
    if (item.kind === 'quick-chat') {
      onQuickChatToggle();
      return;
    }
    togglePanel(item.id as Exclude<DockPanelId, null>);
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'inbox':
        return (
          <FloatingDockPanel title="Inbox" icon={<Bell className="h-4 w-4 text-primary" />} onClose={closePanel}>
            <DockInboxPanel />
          </FloatingDockPanel>
        );
      case 'chat-picker':
        return (
          <FloatingDockPanel title="Συνομιλίες" icon={<MessageSquare className="h-4 w-4 text-primary" />} onClose={closePanel}>
            <DockChatPicker />
          </FloatingDockPanel>
        );
      default:
        return null;
    }
  };

  const isCollapsed = !isExpanded;

  return (
    <>
      {renderPanelContent()}

      {/* Hover trigger zone — invisible strip at the bottom that "wakes" the dock in auto-hide mode */}
      {mode === 'auto-hide' && !isExpanded && (
        <div
          className="fixed bottom-0 left-0 right-0 h-6 z-40"
          onMouseEnter={onHoverEnter}
          aria-hidden
        />
      )}

      <div
        onMouseEnter={mode === 'auto-hide' ? onHoverEnter : undefined}
        onMouseLeave={mode === 'auto-hide' ? onHoverLeave : undefined}
        className={cn(
          'fixed left-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isCollapsed
            ? '-translate-x-1/2 translate-y-[calc(100%-14px)] bottom-0 opacity-70 hover:opacity-100 hover:translate-y-0'
            : '-translate-x-1/2 translate-y-0 bottom-4 opacity-100'
        )}
      >
        {/* Collapsed pill — small handle with chevron up */}
        {isCollapsed ? (
          <button
            onClick={() => setMode('visible')}
            onMouseEnter={mode === 'auto-hide' ? onHoverEnter : undefined}
            className={cn(
              'group flex items-center gap-1.5 px-4 py-1.5',
              'rounded-t-full border border-b-0 border-white/10',
              'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600',
              'shadow-[0_-4px_16px_-4px_rgba(139,92,246,0.4)]',
              'backdrop-blur-xl transition-transform hover:scale-105'
            )}
            aria-label="Επαναφορά dock"
          >
            <ChevronDown className="h-3 w-3 text-white rotate-180 transition-transform group-hover:-translate-y-0.5" />
            <span className="text-[10px] font-semibold tracking-wide text-white/90 uppercase">Dock</span>
          </button>
        ) : (
          <div
            className={cn(
              'flex items-center gap-1 p-1.5',
              'rounded-full border border-white/10',
              'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600',
              'shadow-[0_8px_32px_-4px_rgba(139,92,246,0.5)]',
              'backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300'
            )}
          >
            {/* Workday clock + status */}
            <DockWorkDayClock />

            {/* Active task timer (only when running) */}
            <DockActiveTimer />

            {/* Divider */}
            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* XP + Work Mode */}
            <DockXPBadge userId={user?.id} />
            <DockWorkMode />

            {/* Divider */}
            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Quick Actions (+) */}
            <DockQuickActions />

            {/* Divider */}
            <div className="w-px h-6 bg-white/20 mx-1" />

            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.kind === 'panel' || item.kind === 'chat'
                ? activePanel === item.id
                : false;
              return (
                <Tooltip key={item.id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleClick(item)}
                      className={cn(
                        'group relative h-10 w-10 rounded-full flex items-center justify-center',
                        'transition-all duration-200 ease-out',
                        'hover:bg-white/15',
                        isActive && 'bg-white/25 shadow-inner'
                      )}
                      aria-label={item.label}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 text-white transition-transform duration-200 drop-shadow-sm',
                          'group-hover:scale-110',
                          isActive && 'scale-110'
                        )}
                      />
                      {item.badge && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-violet-600 animate-pulse" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Divider before visibility controls */}
            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Visibility menu — minimize / auto-hide */}
            <DropdownMenu onOpenChange={(open) => setLocked(open)}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'group relative h-8 w-8 rounded-full flex items-center justify-center',
                        'transition-all duration-200 ease-out',
                        'text-white/60 hover:text-white hover:bg-white/15'
                      )}
                      aria-label="Επιλογές εμφάνισης dock"
                    >
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8} className="text-xs">
                  Εμφάνιση dock
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={12}
                className="w-60"
                onMouseEnter={() => setLocked(true)}
                onMouseLeave={() => setLocked(false)}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Εμφάνιση dock
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={mode === 'visible'}
                  onCheckedChange={() => setMode('visible')}
                  className="cursor-pointer"
                >
                  <Pin className="h-3.5 w-3.5 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm">Πάντα ορατό</span>
                    <span className="text-[10px] text-muted-foreground">Καρφιτσωμένο στο κάτω μέρος</span>
                  </div>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={mode === 'auto-hide'}
                  onCheckedChange={() => setMode('auto-hide')}
                  className="cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm">Auto-hide</span>
                    <span className="text-[10px] text-muted-foreground">Εμφάνιση με hover στο κάτω άκρο</span>
                  </div>
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={mode === 'minimized'}
                  onCheckedChange={() => setMode('minimized')}
                  className="cursor-pointer"
                >
                  <EyeOff className="h-3.5 w-3.5 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm">Ελαχιστοποιημένο</span>
                    <span className="text-[10px] text-muted-foreground">Μόνο μικρό handle κάτω</span>
                  </div>
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </>
  );
}
