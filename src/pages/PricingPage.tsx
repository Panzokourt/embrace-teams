import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tags } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import ServicesList from '@/components/pricing/ServicesList';
import PackagesList from '@/components/pricing/PackagesList';
import ProposalsList from '@/components/pricing/ProposalsList';
import RoleCostsManager from '@/components/pricing/RoleCostsManager';
import PricingDashboard from '@/components/pricing/PricingDashboard';

const TABS = [
  { value: 'services', label: 'Υπηρεσίες' },
  { value: 'packages', label: 'Πακέτα' },
  { value: 'proposals', label: 'Προσφορές' },
  { value: 'costing', label: 'Κοστολόγηση' },
  { value: 'dashboard', label: 'Dashboard' },
];

export default function PricingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'services';

  return (
    <div className="page-shell">
      <Tabs value={activeTab} onValueChange={v => setSearchParams({ tab: v })}>
        <PageHeader
          icon={Tags}
          title="Υπηρεσίες & Τιμολόγηση"
          subtitle="Κατάλογος υπηρεσιών, πακέτα, προσφορές και κοστολόγηση"
          breadcrumbs={[{ label: 'Revenue' }, { label: 'Τιμολόγηση' }]}
          tabs={
            <TabsList className="flex flex-wrap h-auto gap-1">
              {TABS.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
            </TabsList>
          }
        />
        <TabsContent value="services"><ServicesList /></TabsContent>
        <TabsContent value="packages"><PackagesList /></TabsContent>
        <TabsContent value="proposals"><ProposalsList /></TabsContent>
        <TabsContent value="costing"><RoleCostsManager /></TabsContent>
        <TabsContent value="dashboard"><PricingDashboard /></TabsContent>
      </Tabs>
    </div>
  );
}
