import { Bot, Bell, Activity, MessageSquare, Brain, Sparkles, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDock, type DockPanelId } from '@/contexts/DockContext';
import { useChat } from '@/contexts/ChatContext';

import SecretaryChat from '@/components/secretary/SecretaryChat';
import { NotificationList } from '@/components/notifications/NotificationList';
import { ActivityFeedContent } from '@/components/activity/ActivityFeedContent';
import MemoryManager from '@/components/secretary/MemoryManager';
import FloatingDockPanel from './FloatingDockPanel';
import DockChatPicker from './DockChatPicker';

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

  const items: DockItem[] = [
    { id: 'secretary', label: 'Secretary', icon: Bot, kind: 'panel' },
    { id: 'notifications', label: 'Ειδοποιήσεις', icon: Bell, kind: 'panel' },
    { id: 'activity', label: 'Activity', icon: Activity, kind: 'panel' },
    { id: 'chat-picker', label: 'Chat', icon: MessageSquare, kind: 'chat', badge: floatingWindows.length > 0 },
    { id: 'memory', label: 'AI Μνήμη', icon: Brain, kind: 'panel' },
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
      case 'secretary':
        return (
          <FloatingDockPanel title="Secretary" icon={<Bot className="h-4 w-4 text-primary" />} onClose={closePanel}>
            <SecretaryChat mode="panel" registerSendHandler={registerSendHandler} />
          </FloatingDockPanel>
        );
      case 'notifications':
        return (
          <FloatingDockPanel title="Ειδοποιήσεις" icon={<Bell className="h-4 w-4 text-primary" />} onClose={closePanel}>
            <NotificationList active />
          </FloatingDockPanel>
        );
      case 'activity':
        return (
          <FloatingDockPanel title="Activity" icon={<Activity className="h-4 w-4 text-primary" />} onClose={closePanel}>
            <ActivityFeedContent active />
          </FloatingDockPanel>
        );
      case 'memory':
        return (
          <FloatingDockPanel title="AI Μνήμη" icon={<Brain className="h-4 w-4 text-primary" />} onClose={closePanel}>
            <MemoryManager onClose={closePanel} />
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

  return (
    <>
      {renderPanelContent()}

      <div
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-1 p-1.5',
          'rounded-full border border-white/10',
          'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600',
          'shadow-[0_8px_32px_-4px_rgba(139,92,246,0.5)]',
          'backdrop-blur-xl',
          'animate-fade-in'
        )}
      >
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
      </div>
    </>
  );
}
