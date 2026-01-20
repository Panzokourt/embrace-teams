import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import PipelineCard, { getDefaultPipelineStages } from '@/components/dashboard/PipelineCard';
import TaskList from '@/components/dashboard/TaskList';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  FileWarning,
  Trophy,
  FolderKanban,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { addDays, subDays } from 'date-fns';

interface DashboardStats {
  totalRevenue: number;
  agencyFee: number;
  netProfit: number;
  pendingInvoices: number;
  activeTenders: number;
  activeProjects: number;
  winRate: number;
  overdueCount: number;
  utilization: number;
}

export default function Dashboard() {
  const { profile, isAdmin, isManager, isClient } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 60000,
    agencyFee: 14919,
    netProfit: 30180,
    pendingInvoices: 3100,
    activeTenders: 2,
    activeProjects: 2,
    winRate: 0,
    overdueCount: 1,
    utilization: 35,
  });

  const [pipelineStages, setPipelineStages] = useState(getDefaultPipelineStages());

  // Sample tasks - will be replaced with real data
  const sampleTasks = [
    { id: '1', title: 'Competitor Analysis', project: 'Digital Campaign', dueDate: subDays(new Date(), 2), status: 'todo' as const },
    { id: '2', title: 'Brand Strategy', project: 'Φωτογράφηση', dueDate: addDays(new Date(), 5), status: 'in_progress' as const },
    { id: '3', title: 'Video editing', project: 'Π1.2 Επικοινωνιακό υλικό', dueDate: addDays(new Date(), 21), status: 'todo' as const },
    { id: '4', title: 'Visual Identity', project: 'Brand Refresh', dueDate: addDays(new Date(), 54), status: 'todo' as const },
  ];

  // Sample pipeline data
  useEffect(() => {
    const stages = getDefaultPipelineStages();
    stages[1].items = [
      { id: '1', name: 'Τουριστική Προβολή Ρόδου', client: 'Δήμος Ρόδου', budget: 45000 }
    ];
    stages[2].items = [
      { id: '2', name: 'Digital Campaign', client: 'TechCo', budget: 25000 }
    ];
    setPipelineStages(stages);
  }, []);

  // Client Dashboard
  if (isClient && !isAdmin && !isManager) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Καλωσήρθατε, {profile?.full_name?.split(' ')[0] || 'Client'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Παρακολουθήστε την πρόοδο των έργων σας
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Ενεργά Έργα"
            value={2}
            icon={FolderKanban}
            variant="primary"
          />
          <StatCard
            title="Παραδοτέα σε Εξέλιξη"
            value={5}
            icon={Activity}
            variant="success"
          />
          <StatCard
            title="Εκκρεμή Τιμολόγια"
            value="€3.100"
            icon={FileWarning}
            variant="warning"
          />
        </div>

        <TaskList 
          tasks={sampleTasks} 
          title="Επερχόμενα Παραδοτέα" 
        />
      </div>
    );
  }

  // Admin/Manager Dashboard
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          📊 Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Συνολική εικόνα εταιρίας
        </p>
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ΣΥΝΟΛΙΚΑ ΕΣΟΔΑ"
          value={`€${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title="ΠΡΟΜΗΘΕΙΑ AGENCY"
          value={`€${stats.agencyFee.toLocaleString()}`}
          subtitle="30% μέσος όρος"
          icon={Percent}
          variant="default"
        />
        <StatCard
          title="ΚΑΘΑΡΟ ΚΕΡΔΟΣ"
          value={`€${stats.netProfit.toLocaleString()}`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="ΕΚΚΡΕΜΗ ΤΙΜΟΛΟΓΙΑ"
          value={`€${stats.pendingInvoices.toLocaleString()}`}
          icon={FileWarning}
          variant="warning"
        />
      </div>

      {/* Project Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="ΔΙΑΓΩΝΙΣΜΟΙ"
          value={stats.activeTenders}
          icon={FileWarning}
        />
        <StatCard
          title="ΕΝΕΡΓΑ ΕΡΓΑ"
          value={stats.activeProjects}
          icon={FolderKanban}
        />
        <StatCard
          title="WIN RATE"
          value={`${stats.winRate}%`}
          icon={Trophy}
        />
        <StatCard
          title="OVERDUE"
          value={stats.overdueCount}
          icon={AlertTriangle}
          variant={stats.overdueCount > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="UTILIZATION"
          value={`${stats.utilization}%`}
          icon={Activity}
        />
      </div>

      {/* Pipeline */}
      {(isAdmin || isManager) && (
        <PipelineCard stages={pipelineStages} />
      )}

      {/* Alerts and Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 animate-fade-in">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <span className="text-xl">⚠️</span> Alerts
          </h3>
          <div className="space-y-2">
            {stats.overdueCount > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-sm">
                  🔴 {stats.overdueCount} task{stats.overdueCount > 1 ? 's' : ''} overdue
                </span>
              </div>
            )}
          </div>
        </div>

        <TaskList 
          tasks={sampleTasks} 
          title="Deadlines" 
        />
      </div>
    </div>
  );
}
