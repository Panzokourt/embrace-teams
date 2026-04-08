import { useEffect, useCallback } from "react";
import { Bot, Activity, Bell, MessageSquare, Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import SecretaryChat from "./SecretaryChat";
import MemoryManager from "./MemoryManager";
import { ActivityFeedContent } from "@/components/activity/ActivityFeedContent";
import { NotificationList } from "@/components/notifications/NotificationList";
import ChatPanelView from "@/components/chat/ChatPanelView";

export type RightPanelTab = "secretary" | "activity" | "notifications" | "chat" | "memory";

interface SecretaryPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  onClose: () => void;
  registerSendHandler?: (handler: (text: string) => void) => void;
}

const tabs = [
  { id: "secretary" as const, label: "Secretary", icon: Bot },
  { id: "activity" as const, label: "Activity", icon: Activity },
  { id: "notifications" as const, label: "Ειδοποιήσεις", icon: Bell },
  { id: "chat" as const, label: "Chat", icon: MessageSquare },
  { id: "memory" as const, label: "AI Μνήμη", icon: Brain },
];

export default function SecretaryPanel({ activeTab, onTabChange, onClose, registerSendHandler }: SecretaryPanelProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="h-full flex flex-col bg-background border-l border-border/40">
      {/* Tab header — icon-only with tooltips */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border/40 shrink-0">
        {tabs.map((tab) => (
          <Tooltip key={tab.id} delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 gap-1.5 text-xs font-medium h-8",
                  activeTab === tab.id && "bg-secondary text-foreground"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {tab.label}
            </TooltipContent>
          </Tooltip>
        ))}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "secretary" && <SecretaryChat mode="panel" registerSendHandler={registerSendHandler} />}
        {activeTab === "activity" && <ActivityFeedContent active />}
        {activeTab === "notifications" && <NotificationList active />}
        {activeTab === "chat" && <ChatPanelView />}
        {activeTab === "memory" && <MemoryManager onClose={() => onTabChange("secretary")} />}
      </div>
    </div>
  );
}
