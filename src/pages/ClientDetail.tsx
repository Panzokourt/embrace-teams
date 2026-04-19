import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';
import { startOfYear, startOfWeek, endOfWeek, isBefore } from 'date-fns';

import { ClientForm } from '@/components/clients/ClientForm';
import { ClientSmartHeader } from '@/components/clients/detail/ClientSmartHeader';
import { ClientWebsitesCard } from '@/components/clients/detail/ClientWebsitesCard';
import { ClientBusinessInfoCard } from '@/components/clients/detail/ClientBusinessInfoCard';
import { ClientSocialCard } from '@/components/clients/detail/ClientSocialCard';
import { ClientAdAccountsCard } from '@/components/clients/detail/ClientAdAccountsCard';
import { ClientStrategyCard } from '@/components/clients/detail/ClientStrategyCard';
import { ClientProjectsCard } from '@/components/clients/detail/ClientProjectsCard';
import { ClientTasksSnapshot } from '@/components/clients/detail/ClientTasksSnapshot';
import { ClientBriefsCard } from '@/components/clients/detail/ClientBriefsCard';
import { ClientTeamCard } from '@/components/clients/detail/ClientTeamCard';
import { ClientContactsCard } from '@/components/clients/detail/ClientContactsCard';
import { ClientFilesCard } from '@/components/clients/detail/ClientFilesCard';
import { ClientMediaPlansCard } from '@/components/clients/detail/ClientMediaPlansCard';
import { ClientPLSummary } from '@/components/clients/detail/ClientPLSummary';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch client
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setClient(clientData);

      // Parallel fetches
      const [projectsRes, contactsRes, briefsRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('id, name, status, progress, budget, start_date, end_date')
          .eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('contacts').select('id, name, email, phone, category, tags')
          .eq('client_id', id),
        supabase.from('briefs').select('id, title, status, brief_type, created_at')
          .eq('client_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('invoices').select('id, amount, paid, issued_date')
          .eq('client_id', id),
      ]);

      const prjs = projectsRes.data || [];
      setProjects(prjs);
      setContacts(contactsRes.data || []);
      setBriefs(briefsRes.data || []);
      setInvoices(invoicesRes.data || []);

      // Fetch tasks for these projects
      if (prjs.length > 0) {
        const projectIds = prjs.map(p => p.id);
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, status, due_date')
          .in('project_id', projectIds);
        setTasks(tasksData || []);

        // Fetch team members via project_user_access
        const { data: accessData } = await supabase
          .from('project_user_access')
          .select('user_id')
          .in('project_id', projectIds);

        if (accessData && accessData.length > 0) {
          const uniqueUserIds = [...new Set(accessData.map(a => a.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, job_title')
            .in('id', uniqueUserIds);

          setTeamMembers((profiles || []).map(p => ({
            ...p,
            role: p.job_title || null,
          })));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα φόρτωσης πελάτη');
    } finally {
      setLoading(false);
    }
  };

  // KPI calculations
  const now = new Date();
  const yearStart = startOfYear(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const revenueThisYear = useMemo(() =>
    invoices.filter(i => i.paid && new Date(i.issued_date) >= yearStart)
      .reduce((s, i) => s + Number(i.amount), 0),
    [invoices]
  );

  const monthlyRevenue = useMemo(() => {
    const months = Math.max(1, (now.getMonth() + 1));
    return Math.round(revenueThisYear / months);
  }, [revenueThisYear]);

  const totalBudget = useMemo(() => projects.reduce((s, p) => s + (p.budget || 0), 0), [projects]);
  const totalCost = useMemo(() => invoices.reduce((s, i) => s + Number(i.amount), 0), [invoices]);
  const marginPercent = totalBudget > 0 ? Math.round(((totalBudget - totalCost) / totalBudget) * 100) : 0;

  // Task snapshots
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && isBefore(new Date(t.due_date), now)).length;
  const dueThisWeek = tasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= weekStart && d <= weekEnd;
  }).length;
  const openTasks = tasks.filter(t => t.status !== 'done').length;

  // Parse JSONB fields safely
  const socialAccounts = Array.isArray(client?.social_accounts) ? client.social_accounts : [];
  const adAccounts = Array.isArray(client?.ad_accounts) ? client.ad_accounts : [];
  const additionalWebsites = Array.isArray(client?.additional_websites) ? client.additional_websites : [];
  const strategy = (client?.strategy && typeof client.strategy === 'object' && !Array.isArray(client.strategy))
    ? client.strategy : {};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <Building2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Ο πελάτης δεν βρέθηκε</h2>
        <Button variant="outline" onClick={() => navigate('/clients')} className="mt-4">Επιστροφή</Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* SECTION 1 — Smart Header */}
      <ClientSmartHeader
        client={client}
        revenueThisYear={revenueThisYear}
        monthlyRevenue={monthlyRevenue}
        marginPercent={marginPercent}
        canEdit={isAdmin || isManager}
        onEdit={() => setEditOpen(true)}
        onRefresh={fetchAll}
      />

      {/* SECTION 2 — Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column — Business & Strategy */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <ClientBusinessInfoCard
            client={client}
            canEdit={isAdmin || isManager}
            onRefresh={fetchAll}
          />
          <ClientWebsitesCard
            clientId={client.id}
            clientName={client.name}
            taxId={client.tax_id}
            primaryWebsite={client.website}
            additionalWebsites={additionalWebsites}
            canEdit={isAdmin || isManager}
            onRefresh={fetchAll}
          />
          <ClientSocialCard accounts={socialAccounts} onEdit={() => setEditOpen(true)} />
          <ClientAdAccountsCard accounts={adAccounts} onEdit={() => setEditOpen(true)} />
          <ClientStrategyCard strategy={strategy} onEdit={() => setEditOpen(true)} />
        </div>

        {/* Right Column — Execution & People */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <ClientPLSummary invoices={invoices} totalBudget={totalBudget} />
            <ClientProjectsCard projects={projects} clientId={client.id} />
            <ClientMediaPlansCard clientId={client.id} />
            <ClientTasksSnapshot overdue={overdueTasks} dueThisWeek={dueThisWeek} open={openTasks} />
            <ClientBriefsCard briefs={briefs} clientId={client.id} />
            <ClientTeamCard members={teamMembers} onEdit={() => setEditOpen(true)} />
            <ClientContactsCard contacts={contacts} onEdit={() => setEditOpen(true)} />
          </div>
      </div>

      {/* SECTION 3 — Files (full width) */}
      <ClientFilesCard files={[]} />

      <ClientForm open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={fetchAll} />
    </div>
  );
}
