import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Network, Calendar, UsersRound, UserPlus } from 'lucide-react';

// Lazy load existing page content
import UsersAccessPage from '@/pages/UsersAccess';
import DepartmentsPage from '@/pages/Departments';
import OrgChartPage from '@/pages/OrgChart';
import { LeaveBalanceCard } from '@/components/hr/LeaveBalanceCard';
import { LeaveRequestForm } from '@/components/hr/LeaveRequestForm';
import { LeaveRequestsList } from '@/components/hr/LeaveRequestsList';
import { LeaveApprovalCard } from '@/components/hr/LeaveApprovalCard';
import { useLeaveManagement } from '@/hooks/useLeaveManagement';
import { JoinRequestsManager, useJoinRequestsCount } from '@/components/hr/JoinRequestsManager';

const TAB_MAP: Record<string, string> = {
  'users': 'staff',
  'departments': 'departments',
  'org-chart': 'orgchart',
  'timesheets': 'timesheets',
};

export default function HRPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'staff';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { isAdmin, isManager, isOwner, isCompanyAdmin } = useAuth();
  const pendingJoinRequests = useJoinRequestsCount();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UsersRound className="h-5 w-5 text-primary" />
          </div>
          HR - Ανθρώπινο Δυναμικό
        </h1>
        <p className="text-muted-foreground mt-1">
          Κεντρική διαχείριση προσωπικού, ομάδων, αδειών & timesheets
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Προσωπικό
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            Τμήματα
          </TabsTrigger>
          <TabsTrigger value="orgchart" className="gap-2">
            <Network className="h-4 w-4" />
            Οργανόγραμμα
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-2">
            <Calendar className="h-4 w-4" />
            Άδειες
          </TabsTrigger>
          {(isOwner || isCompanyAdmin) && (
            <TabsTrigger value="join-requests" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Αιτήματα
              {pendingJoinRequests > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs px-1">
                  {pendingJoinRequests}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="staff">
          <UsersAccessContent />
        </TabsContent>

        <TabsContent value="departments">
          <DepartmentsContent />
        </TabsContent>

        <TabsContent value="orgchart">
          <OrgChartContent />
        </TabsContent>

        <TabsContent value="leaves">
          <LeavesContent />
        </TabsContent>

        {(isOwner || isCompanyAdmin) && (
          <TabsContent value="join-requests">
            <JoinRequestsManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Wrapper components that strip the page headers (they now use the HR header)
function UsersAccessContent() {
  // Re-use the existing page but it renders inside the tab
  return <div className="-m-6 lg:-m-8"><UsersAccessPage /></div>;
}

function DepartmentsContent() {
  return <div className="-m-6 lg:-m-8"><DepartmentsPage /></div>;
}

function OrgChartContent() {
  return <div className="-m-6 lg:-m-8"><OrgChartPage /></div>;
}

function LeavesContent() {
  const { isAdmin, isManager } = useAuth();
  const { leaveTypes, balances, requests, pendingApprovals, createRequest, approveRequest, rejectRequest, cancelRequest } = useLeaveManagement();

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Άδειες & Απουσίες</h2>
        <LeaveRequestForm leaveTypes={leaveTypes} onSubmit={createRequest} />
      </div>

      {/* Balances */}
      <LeaveBalanceCard balances={balances} />

      {/* Pending approvals for managers */}
      {(isAdmin || isManager) && pendingApprovals.length > 0 && (
        <LeaveApprovalCard
          requests={pendingApprovals}
          leaveTypes={leaveTypes}
          onApprove={approveRequest}
          onReject={rejectRequest}
        />
      )}

      {/* My requests */}
      <LeaveRequestsList requests={requests} onCancel={cancelRequest} />
    </div>
  );
}
