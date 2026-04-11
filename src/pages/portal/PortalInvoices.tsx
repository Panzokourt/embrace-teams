import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface PortalContext {
  client: { id: string; name: string };
}

interface PortalInvoice {
  id: string;
  invoice_number: string | null;
  status: string;
  total_amount: number;
  issue_date: string | null;
  due_date: string | null;
  project: { name: string } | null;
}

const statusLabels: Record<string, string> = {
  draft: 'Πρόχειρο',
  sent: 'Απεσταλμένο',
  paid: 'Πληρωμένο',
  overdue: 'Εκπρόθεσμο',
  cancelled: 'Ακυρωμένο',
};

const statusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function PortalInvoices() {
  const { client } = useOutletContext<PortalContext>();
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    fetchInvoices();
  }, [client]);

  const fetchInvoices = async () => {
    // Get client's project IDs first
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', client.id);

    const projectIds = (projects || []).map(p => p.id);
    if (projectIds.length === 0) { setLoading(false); return; }

    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount, issue_date, due_date, project:projects(name)')
      .in('project_id', projectIds)
      .order('issue_date', { ascending: false });

    setInvoices((data as any[]) || []);
    setLoading(false);
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">Φόρτωση...</div>;

  const totalPending = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + (i.total_amount || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Τιμολόγια
        </h2>
        {totalPending > 0 && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Εκκρεμή: €{totalPending.toLocaleString()}
          </Badge>
        )}
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Δεν βρέθηκαν τιμολόγια</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="py-3 px-5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{inv.invoice_number || 'Χωρίς αριθμό'}</span>
                    <Badge className={statusColors[inv.status] || 'bg-muted'}>
                      {statusLabels[inv.status] || inv.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    {inv.project && <span>{inv.project.name}</span>}
                    {inv.issue_date && <span>Ημ/νία: {new Date(inv.issue_date).toLocaleDateString('el-GR')}</span>}
                    {inv.due_date && <span>Λήξη: {new Date(inv.due_date).toLocaleDateString('el-GR')}</span>}
                  </div>
                </div>
                <span className="text-sm font-bold">€{(inv.total_amount || 0).toLocaleString()}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
