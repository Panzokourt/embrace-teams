import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationList } from '@/components/notifications/NotificationList';
import { ActivityFeedContent } from '@/components/activity/ActivityFeedContent';

const STORAGE_KEY = 'dock.inbox.tab';
type TabId = 'notifications' | 'activity';

export default function DockInboxPanel() {
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'notifications' || stored === 'activity') return stored;
    } catch {}
    return 'notifications';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, tab); } catch {}
  }, [tab]);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="flex flex-col h-full">
      <div className="px-3 pt-2 pb-1 border-b">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">Ειδοποιήσεις</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="notifications" className="flex-1 overflow-hidden mt-0">
        <NotificationList active={tab === 'notifications'} />
      </TabsContent>
      <TabsContent value="activity" className="flex-1 overflow-hidden mt-0">
        <ActivityFeedContent active={tab === 'activity'} />
      </TabsContent>
    </Tabs>
  );
}
