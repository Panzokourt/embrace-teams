import { useEffect } from "react";
import { Bot, Activity, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SecretaryChat from "./SecretaryChat";
import { ActivityFeedContent } from "@/components/activity/ActivityFeedContent";
import { NotificationList } from "@/components/notifications/NotificationList";

export type RightPanelTab = "secretary" | "activity" | "notifications";

interface SecretaryPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  onClose: () => void;
}

const tabs = [
  { id: "secretary" as const, label: "Secretary", icon: Bot },
  { id: "activity" as const, label: "Activity", icon: Activity },
  { id: "notifications" as const, label: "Ειδοποιήσεις", icon: Bell },
];

export default function SecretaryPanel({ activeTab, onTabChange, onClose }: SecretaryPanelProps) {
  // Keyboard shortcut: Cmd+J toggles
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
      {/* Tab header */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border/40 shrink-0">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 gap-1.5 text-xs font-medium",
              activeTab === tab.id && "bg-secondary text-foreground"
            )}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "secretary" && <SecretaryChat mode="panel" />}
        {activeTab === "activity" && <ActivityFeedContent active />}
        {activeTab === "notifications" && <NotificationList active />}
      </div>
    </div>
  );
}
