import { useSearchParams } from 'react-router-dom';
import Projects from '@/pages/Projects';
import Tasks from '@/pages/Tasks';
import Calendar from '@/pages/Calendar';

const TAB_MAP: Record<string, string> = {
  projects: 'projects',
  tasks: 'tasks',
  calendar: 'calendar',
  pipeline: 'projects',
};

export default function WorkPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'projects';
  const activeTab = TAB_MAP[tabParam] || 'projects';

  return (
    <div className="space-y-0">
      {activeTab === 'projects' && <Projects embedded />}
      {activeTab === 'tasks' && <Tasks embedded />}
      {activeTab === 'calendar' && <Calendar embedded />}
    </div>
  );
}
