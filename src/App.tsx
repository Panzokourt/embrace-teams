import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import MyWork from "@/pages/MyWork";
import CommandCenter from "@/pages/CommandCenter";

import Work from "@/pages/Work";
import ProjectDetail from "@/pages/ProjectDetail";
import TaskDetail from "@/pages/TaskDetail";
import Financials from "@/pages/Financials";
import Reports from "@/pages/Reports";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Settings from "@/pages/Settings";
import CalendarHub from "@/pages/CalendarHub";
import Files from "@/pages/Files";
import Blueprints from "@/pages/Blueprints";
import HR from "@/pages/HR";
import Timesheets from "@/pages/Timesheets";
import EmployeeProfile from "@/pages/EmployeeProfile";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import WorkspaceSelector from "@/pages/WorkspaceSelector";
import AcceptInvite from "@/pages/AcceptInvite";
import WelcomeWizard from "@/pages/WelcomeWizard";
import OrganizationSettings from "@/pages/OrganizationSettings";
import Chat from "@/pages/Chat";
import Contacts from "@/pages/Contacts";
import ContactDetail from "@/pages/ContactDetail";
import Inbox from "@/pages/Inbox";
import Leaderboard from "@/pages/Leaderboard";
import Governance from "@/pages/Governance";
import GovernanceAssets from "@/pages/GovernanceAssets";
import GovernanceAssetDetail from "@/pages/GovernanceAssetDetail";
import GovernanceAccess from "@/pages/GovernanceAccess";
import GovernanceVault from "@/pages/GovernanceVault";
import GovernanceCompliance from "@/pages/GovernanceCompliance";
import Knowledge from "@/pages/Knowledge";
import KnowledgeArticle from "@/pages/KnowledgeArticle";
import { ChatProvider } from "@/contexts/ChatContext";
import PricingPage from "@/pages/PricingPage";
import ServiceDetailPage from "@/pages/ServiceDetailPage";
import Brain from "@/pages/Brain";
import Secretary from "@/pages/Secretary";
import Workflows from "@/pages/Workflows";
import ResetPassword from "@/pages/ResetPassword";
import PlatformAdmin from "@/pages/PlatformAdmin";
import MediaPlanning from "@/pages/MediaPlanning";
import MediaPlanWorkspace from "@/pages/MediaPlanWorkspace";

function RedirectUserToEmployee() {
  const { id } = useParams();
  return <Navigate to={`/hr/employee/${id}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="agency-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ChatProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/select-workspace" element={<WorkspaceSelector />} />
                <Route path="/accept-invite/:token" element={<AcceptInvite />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/welcome" element={<WelcomeWizard />} />
                <Route path="/platform-admin" element={<PlatformAdmin />} />
                <Route element={<AppLayout />}>
                <Route path="/" element={<MyWork />} />
                <Route path="/command-center" element={<CommandCenter />} />
                <Route path="/dashboards" element={<Navigate to="/command-center" replace />} />
                <Route path="/dashboards/:templateId" element={<Navigate to="/command-center" replace />} />
                <Route path="/dashboard/:templateId" element={<Navigate to="/command-center" replace />} />
                  <Route path="/my-work" element={<Navigate to="/" replace />} />
                  <Route path="/work" element={<Work />} />
                  <Route path="/projects" element={<Navigate to="/work?tab=projects" replace />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/tasks/:id" element={<TaskDetail />} />
                  <Route path="/tasks" element={<Navigate to="/work?tab=tasks" replace />} />
                  <Route path="/tenders" element={<Navigate to="/work?tab=projects" replace />} />
                  <Route path="/tenders/:id" element={<Navigate to="/work?tab=projects" replace />} />
                  <Route path="/financials" element={<Financials />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/hr" element={<HR />} />
                  <Route path="/hr/employee/:id" element={<EmployeeProfile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/organization" element={<OrganizationSettings />} />
                  <Route path="/calendar" element={<CalendarHub />} />
                  <Route path="/files" element={<Files />} />
                  <Route path="/blueprints" element={<Blueprints />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/contacts/:id" element={<ContactDetail />} />
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="/governance/assets" element={<GovernanceAssets />} />
                  <Route path="/governance/assets/:id" element={<GovernanceAssetDetail />} />
                  <Route path="/governance/access" element={<GovernanceAccess />} />
                  <Route path="/governance/vault" element={<GovernanceVault />} />
                  <Route path="/governance/compliance" element={<GovernanceCompliance />} />
                  <Route path="/knowledge" element={<Knowledge />} />
                  <Route path="/knowledge/articles/:id" element={<KnowledgeArticle />} />
                  {/* Redirects from removed KB sub-pages */}
                  <Route path="/knowledge/playbook" element={<Navigate to="/knowledge?tab=playbook" replace />} />
                  <Route path="/knowledge/templates" element={<Navigate to="/knowledge?tab=templates" replace />} />
                  <Route path="/knowledge/reviews" element={<Navigate to="/knowledge?tab=reviews" replace />} />
                  {/* Pricing & Services */}
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/pricing/services/:id" element={<ServiceDetailPage />} />
                  {/* Brain */}
                  <Route path="/brain" element={<Brain />} />
                  <Route path="/intelligence/ai-insights" element={<Navigate to="/brain" replace />} />
                  {/* Redirects from removed placeholder pages */}
                  <Route path="/secretary" element={<Secretary />} />
                  <Route path="/workflows" element={<Workflows />} />
                  <Route path="/media-planning" element={<MediaPlanning />} />
                  <Route path="/media-planning/:id" element={<MediaPlanWorkspace />} />
                  <Route path="/campaigns" element={<Navigate to="/work" replace />} />
                  <Route path="/backlog" element={<Navigate to="/calendar" replace />} />
                  <Route path="/operations/capacity" element={<Navigate to="/hr" replace />} />
                  <Route path="/operations/resource-planning" element={<Navigate to="/hr" replace />} />
                  <Route path="/intelligence/performance" element={<Navigate to="/reports" replace />} />
                  <Route path="/intelligence/insights" element={<Navigate to="/reports" replace />} />
                  <Route path="/intelligence/benchmarks" element={<Navigate to="/reports" replace />} />
                  <Route path="/intelligence/forecasting" element={<Navigate to="/reports" replace />} />
                  <Route path="/intelligence/media-planning" element={<Navigate to="/media-planning" replace />} />
                  <Route path="/governance/integrations" element={<Navigate to="/governance" replace />} />
                  <Route path="/governance/audit-log" element={<Navigate to="/governance/compliance" replace />} />
                  <Route path="/governance/ownership-map" element={<Navigate to="/governance" replace />} />
                  <Route path="/settings/roles" element={<Navigate to="/settings/organization" replace />} />
                  <Route path="/settings/billing" element={<Navigate to="/settings" replace />} />
                  <Route path="/settings/api-keys" element={<Navigate to="/settings" replace />} />
                  <Route path="/settings/webhooks" element={<Navigate to="/settings" replace />} />
                  <Route path="/settings/branding" element={<Navigate to="/settings" replace />} />
                  <Route path="/settings/feature-flags" element={<Navigate to="/settings" replace />} />
                  {/* Redirects from old routes */}
                  <Route path="/users" element={<Navigate to="/hr?tab=staff" replace />} />
                  <Route path="/users/:id" element={<RedirectUserToEmployee />} />
                  <Route path="/teams" element={<Navigate to="/hr?tab=staff" replace />} />
                  <Route path="/departments" element={<Navigate to="/hr?tab=departments" replace />} />
                  <Route path="/org-chart" element={<Navigate to="/hr?tab=orgchart" replace />} />
                  <Route path="/timesheets" element={<Timesheets />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ChatProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
