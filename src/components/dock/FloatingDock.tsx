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
          'rounded-full border border-border/50',
          'bg-card/85 backdrop-blur-xl shadow-2xl',
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
                    'hover:bg-primary/10',
                    isActive && 'bg-primary/15 text-primary'
                  )}
                  aria-label={item.label}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      'group-hover:scale-110',
                      isActive ? 'text-primary' : 'text-foreground/80'
                    )}
                  />
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card" />
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
