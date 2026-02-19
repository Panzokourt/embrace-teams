import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReportsData, ReportsFilters } from '@/hooks/useReportsData';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ReportExportMenu } from '@/components/reports/ReportExportMenu';
import { ReportsOverview } from '@/components/reports/ReportsOverview';
import { ReportsFinancial } from '@/components/reports/ReportsFinancial';
import { ReportsProjects } from '@/components/reports/ReportsProjects';
import { ReportsClients } from '@/components/reports/ReportsClients';
import { ReportsTeam } from '@/components/reports/ReportsTeam';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { Loader2, BarChart3 } from 'lucide-react';

const TABS = [
  { value: 'overview', label: 'Επισκόπηση' },
  { value: 'financial', label: 'Οικονομικά' },
  { value: 'projects', label: 'Έργα' },
  { value: 'clients', label: 'Πελάτες' },
  { value: 'team', label: 'Ομάδα' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<ReportsFilters>({
    period: '12m',
    clientId: null,
    projectId: null,
  });

  const data = useReportsData(filters);

  const handleExportCSV = useCallback(() => {
    if (activeTab === 'financial') {
      exportToCSV(data.invoices, [
        { key: 'invoice_number', label: 'Αριθμός' },
        { key: 'amount', label: 'Ποσό', format: (v) => formatters.currency(v) },
        { key: 'status', label: 'Κατάσταση' },
        { key: 'issued_date', label: 'Ημ/νία', format: (v) => formatters.date(v) },
      ], 'report-financial');
    } else if (activeTab === 'projects') {
      exportToCSV(data.projects, [
        { key: 'name', label: 'Έργο' },
        { key: 'status', label: 'Κατάσταση' },
        { key: 'budget', label: 'Budget', format: (v) => formatters.currency(v) },
        { key: 'progress', label: 'Πρόοδος', format: (v) => formatters.percentage(v) },
      ], 'report-projects');
    } else if (activeTab === 'clients') {
      const clientExport = data.clients.map(c => {
        const rev = data.invoices.filter(i => i.client_id === c.id && i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
        return { ...c, revenue: rev };
      });
      exportToCSV(clientExport, [
        { key: 'name', label: 'Πελάτης' },
        { key: 'revenue', label: 'Έσοδα', format: (v) => formatters.currency(v) },
      ], 'report-clients');
    } else if (activeTab === 'team') {
      exportToCSV(data.profiles.filter(p => data.tasks.some(t => t.assigned_to === p.id)), [
        { key: 'full_name', label: 'Μέλος' },
        { key: 'job_title', label: 'Ρόλος' },
        { key: 'email', label: 'Email' },
      ], 'report-team');
    }
  }, [activeTab, data]);

  const handleExportExcel = useCallback(() => {
    if (activeTab === 'financial') {
      exportToExcel(data.invoices, [
        { key: 'invoice_number', label: 'Αριθμός' },
        { key: 'amount', label: 'Ποσό', format: (v) => formatters.currency(v) },
        { key: 'status', label: 'Κατάσταση' },
        { key: 'issued_date', label: 'Ημ/νία', format: (v) => formatters.date(v) },
      ], 'report-financial');
    } else if (activeTab === 'projects') {
      exportToExcel(data.projects, [
        { key: 'name', label: 'Έργο' },
        { key: 'status', label: 'Κατάσταση' },
        { key: 'budget', label: 'Budget', format: (v) => formatters.currency(v) },
        { key: 'progress', label: 'Πρόοδος', format: (v) => formatters.percentage(v) },
      ], 'report-projects');
    } else if (activeTab === 'clients') {
      const clientExport = data.clients.map(c => {
        const rev = data.invoices.filter(i => i.client_id === c.id && i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
        return { ...c, revenue: rev };
      });
      exportToExcel(clientExport, [
        { key: 'name', label: 'Πελάτης' },
        { key: 'revenue', label: 'Έσοδα', format: (v) => formatters.currency(v) },
      ], 'report-clients');
    }
  }, [activeTab, data]);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  if (data.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto" id="reports-content">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Αναφορές</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <ReportFilters
            filters={filters}
            onChange={setFilters}
            clients={data.clients}
            projects={data.projects}
          />
          <ReportExportMenu
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="print:hidden">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><ReportsOverview data={data} /></TabsContent>
        <TabsContent value="financial"><ReportsFinancial data={data} /></TabsContent>
        <TabsContent value="projects"><ReportsProjects data={data} /></TabsContent>
        <TabsContent value="clients"><ReportsClients data={data} /></TabsContent>
        <TabsContent value="team"><ReportsTeam data={data} /></TabsContent>
      </Tabs>
    </div>
  );
}
