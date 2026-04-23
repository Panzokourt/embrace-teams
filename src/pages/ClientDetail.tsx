import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';
import { startOfYear, startOfWeek, endOfWeek, isBefore } from 'date-fns';
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { ClientForm } from '@/components/clients/ClientForm';
import { ClientSmartHeader } from '@/components/clients/detail/ClientSmartHeader';
import { ClientStatsStrip } from '@/components/clients/detail/ClientStatsStrip';
import { ClientLayoutMenu } from '@/components/clients/detail/ClientLayoutMenu';
import { DraggableSection } from '@/components/clients/detail/DraggableSection';
import { DroppableColumn } from '@/components/dnd/DroppableColumn';
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
import { RelatedEntitiesCard } from '@/components/shared/RelatedEntitiesCard';
import { ClientPLSummary } from '@/components/clients/detail/ClientPLSummary';
import { useClientDetailLayout } from '@/hooks/useClientDetailLayout';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const canEdit = isAdmin || isManager;
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  const { layout, leftSections, rightSections, toggleVisibility, hideSection, resetLayout, moveSection } =
    useClientDetailLayout();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const handleClientPatched = (updated: any) => {
    if (!updated) return;
    setClient((prev: any) => ({ ...(prev || {}), ...updated }));
  };

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setClient(clientData);

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

      if (prjs.length > 0) {
        const projectIds = prjs.map(p => p.id);
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, status, due_date')
          .in('project_id', projectIds);
        setTasks(tasksData || []);

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
  const invoicedTotal = useMemo(() => invoices.reduce((s, i) => s + Number(i.amount), 0), [invoices]);
  const collectedTotal = useMemo(
    () => invoices.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0),
    [invoices]
  );
  const outstandingTotal = invoicedTotal - collectedTotal;
  const marginPercent = totalBudget > 0 ? Math.round(((totalBudget - invoicedTotal) / totalBudget) * 100) : 0;

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

  const renderSection = (sectionId: string) => {
    if (!client) return null;
    switch (sectionId) {
      case 'business_info':
        return <ClientBusinessInfoCard client={client} canEdit={canEdit} onRefresh={fetchAll} onClientUpdated={handleClientPatched} />;
      case 'websites':
        return <ClientWebsitesCard clientId={client.id} clientName={client.name} taxId={client.tax_id} primaryWebsite={client.website} additionalWebsites={additionalWebsites} canEdit={canEdit} onRefresh={fetchAll} onClientUpdated={handleClientPatched} />;
      case 'social':
        return <ClientSocialCard clientId={client.id} accounts={socialAccounts} canEdit={canEdit} onClientUpdated={handleClientPatched} />;
      case 'ad_accounts':
        return <ClientAdAccountsCard accounts={adAccounts} onEdit={() => setEditOpen(true)} />;
      case 'strategy':
        return <ClientStrategyCard strategy={strategy} onEdit={() => setEditOpen(true)} />;
      case 'pl_summary':
        return <ClientPLSummary invoices={invoices} totalBudget={totalBudget} />;
      case 'projects':
        return <ClientProjectsCard projects={projects} clientId={client.id} />;
      case 'media_plans':
        return <ClientMediaPlansCard clientId={client.id} />;
      case 'tasks_snapshot':
        return <ClientTasksSnapshot overdue={overdueTasks} dueThisWeek={dueThisWeek} open={openTasks} />;
      case 'briefs':
        return <ClientBriefsCard briefs={briefs} clientId={client.id} />;
      case 'team':
        return <ClientTeamCard members={teamMembers} onEdit={() => setEditOpen(true)} />;
      case 'contacts':
        return <ClientContactsCard contacts={contacts} clientId={client.id} onEdit={() => setEditOpen(true)} />;
      default:
        return null;
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    moveSection(String(active.id), String(over.id));
  };

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

  const leftIds = leftSections.map(s => s.id);
  const rightIds = rightSections.map(s => s.id);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* SECTION 1 — Smart Header */}
      <ClientSmartHeader
        client={client}
        canEdit={canEdit}
        onEdit={() => setEditOpen(true)}
        onRefresh={fetchAll}
        onClientUpdated={handleClientPatched}
        layoutMenu={
          <ClientLayoutMenu
            layout={layout}
            onToggle={toggleVisibility}
            onReset={resetLayout}
          />
        }
      />

      {/* SECTION 2 — Stats Strip */}
      <ClientStatsStrip
        revenueThisYear={revenueThisYear}
        monthlyRevenue={monthlyRevenue}
        marginPercent={marginPercent}
        invoiced={invoicedTotal}
        collected={collectedTotal}
        outstanding={outstandingTotal}
        overdueTasks={overdueTasks}
        dueThisWeek={dueThisWeek}
        openTasks={openTasks}
      />

      {/* SECTION 3 — Draggable Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <DroppableColumn id="column:left" items={leftIds} className="space-y-6">
              <SortableContext items={leftIds} strategy={verticalListSortingStrategy}>
                {leftSections.map(s => (
                  <DraggableSection key={s.id} id={s.id} onHide={hideSection}>
                    {renderSection(s.id)}
                  </DraggableSection>
                ))}
              </SortableContext>
            </DroppableColumn>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <DroppableColumn id="column:right" items={rightIds} className="space-y-6">
              <SortableContext items={rightIds} strategy={verticalListSortingStrategy}>
                {rightSections.map(s => (
                  <DraggableSection key={s.id} id={s.id} onHide={hideSection}>
                    {renderSection(s.id)}
                  </DraggableSection>
                ))}
              </SortableContext>
            </DroppableColumn>
          </div>
        </div>
      </DndContext>

      {/* SECTION 4 — Files (full width) */}
      <ClientFilesCard files={[]} clientId={client.id} />

      {/* Knowledge Graph related entities */}
      <RelatedEntitiesCard entityType="client" entityId={client.id} hops={2} limit={20} title="Σχετιζόμενα από τον Knowledge Graph" />

      <ClientForm open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={fetchAll} />
    </div>
  );
}
