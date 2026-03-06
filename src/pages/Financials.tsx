import { useSearchParams, Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign } from 'lucide-react';
import FinanceDashboard from '@/components/finance/FinanceDashboard';
import ContractsList from '@/components/finance/ContractsList';
import InvoicesManager from '@/components/finance/InvoicesManager';
import ExpensesManager from '@/components/finance/ExpensesManager';
import ProfitabilityReports from '@/components/finance/ProfitabilityReports';
import { PageHeader } from '@/components/shared/PageHeader';

const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'contracts', label: 'Συμβάσεις' },
  { value: 'invoices', label: 'Τιμολόγια' },
  { value: 'expenses', label: 'Έξοδα' },
  { value: 'reports', label: 'Αναφορές' },
];

export default function FinancialsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Redirect old services tab to pricing page
  if (activeTab === 'services') return <Navigate to="/pricing" replace />;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="page-shell">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <PageHeader
          icon={DollarSign}
          title="Λογιστήριο"
          subtitle="Συμβάσεις, τιμολόγια, έξοδα και κερδοφορία"
          breadcrumbs={[{ label: 'Λογιστήριο' }]}
          tabs={
            <TabsList className="flex flex-wrap h-auto gap-1">
              {TABS.map(t => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          }
        />

        <TabsContent value="dashboard"><FinanceDashboard /></TabsContent>
        <TabsContent value="contracts"><ContractsList /></TabsContent>
        <TabsContent value="invoices"><InvoicesManager /></TabsContent>
        <TabsContent value="expenses"><ExpensesManager /></TabsContent>
        <TabsContent value="reports"><ProfitabilityReports /></TabsContent>
      </Tabs>
    </div>
  );
}
