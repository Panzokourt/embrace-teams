import { useSearchParams } from 'react-router-dom';
import Projects from '@/pages/Projects';
import Tasks from '@/pages/Tasks';

const TAB_MAP: Record<string, string> = {
  projects: 'projects',
  tasks: 'tasks',
  pipeline: 'projects',
};

export default function WorkPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'projects';
  const activeTab = TAB_MAP[tabParam] || 'projects';

  return (
    <div className="page-shell">
      {activeTab === 'projects' && <Projects embedded />}
      {activeTab === 'tasks' && <Tasks embedded />}
    </div>
  );
}
