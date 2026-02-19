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
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Settings from "@/pages/Settings";
import Calendar from "@/pages/Calendar";
import Files from "@/pages/Files";
import Blueprints from "@/pages/Blueprints";
import HR from "@/pages/HR";
import EmployeeProfile from "@/pages/EmployeeProfile";
import TaskDetail from "@/pages/TaskDetail";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import WorkspaceSelector from "@/pages/WorkspaceSelector";
import AcceptInvite from "@/pages/AcceptInvite";
import OrganizationSettings from "@/pages/OrganizationSettings";

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
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/select-workspace" element={<WorkspaceSelector />} />
              <Route path="/accept-invite/:token" element={<AcceptInvite />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/my-work" element={<MyWork />} />
                <Route path="/work" element={<Work />} />
                <Route path="/projects" element={<Navigate to="/work?tab=projects" replace />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/tasks" element={<Navigate to="/work?tab=tasks" replace />} />
                <Route path="/tenders" element={<Navigate to="/work?tab=projects" replace />} />
                <Route path="/tenders/:id" element={<Navigate to="/work?tab=projects" replace />} />
                <Route path="/financials" element={<Financials />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/hr" element={<HR />} />
                <Route path="/hr/employee/:id" element={<EmployeeProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/organization" element={<OrganizationSettings />} />
                <Route path="/calendar" element={<Navigate to="/work?tab=calendar" replace />} />
                <Route path="/files" element={<Files />} />
                <Route path="/blueprints" element={<Blueprints />} />
                <Route path="/blueprints" element={<Blueprints />} />
                {/* Redirects from old routes */}
                <Route path="/users" element={<Navigate to="/hr?tab=staff" replace />} />
                <Route path="/users/:id" element={<RedirectUserToEmployee />} />
                <Route path="/teams" element={<Navigate to="/hr?tab=teams" replace />} />
                <Route path="/departments" element={<Navigate to="/hr?tab=departments" replace />} />
                <Route path="/org-chart" element={<Navigate to="/hr?tab=orgchart" replace />} />
                <Route path="/timesheets" element={<Navigate to="/hr?tab=timesheets" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
