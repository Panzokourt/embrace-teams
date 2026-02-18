import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderKanban, CheckSquare, CalendarDays, BarChart3 } from 'lucide-react';
import Projects from '@/pages/Projects';
import Tasks from '@/pages/Tasks';
import Calendar from '@/pages/Calendar';
import { WorkOverview } from '@/components/work/WorkOverview';

const TAB_MAP: Record<string, string> = {
  projects: 'projects',
  tasks: 'tasks',
  calendar: 'calendar',
  overview: 'overview',
  pipeline: 'projects',
};

export default function WorkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'projects';
  const [activeTab, setActiveTab] = useState(TAB_MAP[tabParam] || 'projects');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Εργασίες</h1>
        <p className="text-sm text-muted-foreground">Διαχείριση έργων, εργασιών και ημερολογίου</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border/40">
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Έργα
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Ημερολόγιο
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Επισκόπηση
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-0">
          <Projects embedded />
        </TabsContent>
        <TabsContent value="tasks" className="mt-0">
          <Tasks embedded />
        </TabsContent>
        <TabsContent value="calendar" className="mt-0">
          <Calendar embedded />
        </TabsContent>
        <TabsContent value="overview" className="mt-0">
          <WorkOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
