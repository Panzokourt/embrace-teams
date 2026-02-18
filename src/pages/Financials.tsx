import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign } from 'lucide-react';
import FinanceDashboard from '@/components/finance/FinanceDashboard';
import ServicesCatalog from '@/components/finance/ServicesCatalog';
import ContractsList from '@/components/finance/ContractsList';
import InvoicesManager from '@/components/finance/InvoicesManager';
import ExpensesManager from '@/components/finance/ExpensesManager';
import ProfitabilityReports from '@/components/finance/ProfitabilityReports';

const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'services', label: 'Υπηρεσίες' },
  { value: 'contracts', label: 'Συμβάσεις' },
  { value: 'invoices', label: 'Τιμολόγια' },
  { value: 'expenses', label: 'Έξοδα' },
  { value: 'reports', label: 'Αναφορές' },
];

export default function FinancialsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <DollarSign className="h-8 w-8" />
          Λογιστήριο
        </h1>
        <p className="text-muted-foreground mt-1">
          Υπηρεσίες, συμβάσεις, τιμολόγια, έξοδα και κερδοφορία
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><FinanceDashboard /></TabsContent>
        <TabsContent value="services"><ServicesCatalog /></TabsContent>
        <TabsContent value="contracts"><ContractsList /></TabsContent>
        <TabsContent value="invoices"><InvoicesManager /></TabsContent>
        <TabsContent value="expenses"><ExpensesManager /></TabsContent>
        <TabsContent value="reports"><ProfitabilityReports /></TabsContent>
      </Tabs>
    </div>
  );
}
