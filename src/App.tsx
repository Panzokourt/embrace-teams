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
import Work from "@/pages/Work";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Tasks from "@/pages/Tasks";
import Financials from "@/pages/Financials";
import Reports from "@/pages/Reports";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Settings from "@/pages/Settings";
import Calendar from "@/pages/Calendar";
import CalendarHub from "@/pages/CalendarHub";
import Files from "@/pages/Files";
import Blueprints from "@/pages/Blueprints";
import HR from "@/pages/HR";
import Timesheets from "@/pages/Timesheets";
import EmployeeProfile from "@/pages/EmployeeProfile";
import TaskDetail from "@/pages/TaskDetail";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import WorkspaceSelector from "@/pages/WorkspaceSelector";
import AcceptInvite from "@/pages/AcceptInvite";
import WelcomeWizard from "@/pages/WelcomeWizard";
import OrganizationSettings from "@/pages/OrganizationSettings";
import Secretary from "@/pages/Secretary";
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
import KnowledgePlaybook from "@/pages/KnowledgePlaybook";
import KnowledgeArticle from "@/pages/KnowledgeArticle";
import KnowledgeTemplates from "@/pages/KnowledgeTemplates";
import KnowledgeReviews from "@/pages/KnowledgeReviews";
import { ChatProvider } from "@/contexts/ChatContext";
// New placeholder pages
import Campaigns from "@/pages/Campaigns";
import Backlog from "@/pages/Backlog";
import PricingPage from "@/pages/PricingPage";
import ServiceDetailPage from "@/pages/ServiceDetailPage";
import Capacity from "@/pages/Capacity";
import ResourcePlanning from "@/pages/ResourcePlanning";
import Performance from "@/pages/Performance";
import CrossClientInsights from "@/pages/CrossClientInsights";
import Benchmarks from "@/pages/Benchmarks";
import Forecasting from "@/pages/Forecasting";
import MediaPlanningPage from "@/pages/MediaPlanningPage";
import AIInsights from "@/pages/AIInsights";
import Brain from "@/pages/Brain";
import GovernanceIntegrations from "@/pages/GovernanceIntegrations";
import GovernanceAuditLog from "@/pages/GovernanceAuditLog";
import GovernanceOwnershipMap from "@/pages/GovernanceOwnershipMap";
import RolesPermissions from "@/pages/RolesPermissions";
import BillingSettings from "@/pages/BillingSettings";
import APIKeys from "@/pages/APIKeys";
import WebhooksSettings from "@/pages/WebhooksSettings";
import BrandingSettings from "@/pages/BrandingSettings";
import FeatureFlags from "@/pages/FeatureFlags";

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
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/select-workspace" element={<WorkspaceSelector />} />
                <Route path="/accept-invite/:token" element={<AcceptInvite />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/welcome" element={<WelcomeWizard />} />
                <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard/:templateId" element={<Dashboard />} />
                  <Route path="/my-work" element={<MyWork />} />
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
                  <Route path="/secretary" element={<Secretary />} />
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
                  <Route path="/governance/integrations" element={<GovernanceIntegrations />} />
                  <Route path="/governance/audit-log" element={<GovernanceAuditLog />} />
                  <Route path="/governance/ownership-map" element={<GovernanceOwnershipMap />} />
                  <Route path="/knowledge" element={<Knowledge />} />
                  <Route path="/knowledge/playbook" element={<KnowledgePlaybook />} />
                  <Route path="/knowledge/articles/:id" element={<KnowledgeArticle />} />
                  <Route path="/knowledge/templates" element={<KnowledgeTemplates />} />
                  <Route path="/knowledge/reviews" element={<KnowledgeReviews />} />
                  {/* New placeholder pages */}
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/backlog" element={<Backlog />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/pricing/services/:id" element={<ServiceDetailPage />} />
                  <Route path="/operations/capacity" element={<Capacity />} />
                  <Route path="/operations/resource-planning" element={<ResourcePlanning />} />
                  <Route path="/intelligence/performance" element={<Performance />} />
                  <Route path="/intelligence/insights" element={<CrossClientInsights />} />
                  <Route path="/intelligence/benchmarks" element={<Benchmarks />} />
                  <Route path="/intelligence/forecasting" element={<Forecasting />} />
                  <Route path="/intelligence/media-planning" element={<MediaPlanningPage />} />
                  <Route path="/intelligence/ai-insights" element={<Navigate to="/brain" replace />} />
                  <Route path="/brain" element={<Brain />} />
                  <Route path="/settings/roles" element={<RolesPermissions />} />
                  <Route path="/settings/billing" element={<BillingSettings />} />
                  <Route path="/settings/api-keys" element={<APIKeys />} />
                  <Route path="/settings/webhooks" element={<WebhooksSettings />} />
                  <Route path="/settings/branding" element={<BrandingSettings />} />
                  <Route path="/settings/feature-flags" element={<FeatureFlags />} />
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
