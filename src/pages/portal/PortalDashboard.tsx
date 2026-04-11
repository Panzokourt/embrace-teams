import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, FileText, Package, Clock } from 'lucide-react';

interface PortalContext {
  client: { id: string; name: string };
}

export default function PortalDashboard() {
  const { client } = useOutletContext<PortalContext>();
  const [stats, setStats] = useState({ projects: 0, invoices: 0, files: 0, pendingAmount: 0 });

  useEffect(() => {
    if (!client) return;
    fetchStats();
  }, [client]);

  const fetchStats = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', client.id);

    const projectIds = (projects || []).map(p => p.id);

    let invoiceCount = 0;
    let pendingAmount = 0;
    let fileCount = 0;

    if (projectIds.length > 0) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, amount, status')
        .in('project_id', projectIds);
      invoiceCount = invoices?.length || 0;
      pendingAmount = (invoices || [])
        .filter(i => i.status !== 'paid')
        .reduce((s, i) => s + (i.amount || 0), 0);

      const { data: files } = await supabase
        .from('file_attachments')
        .select('id')
        .in('project_id', projectIds);
      fileCount = files?.length || 0;
    }

    setStats({
      projects: projects?.length || 0,
      invoices: invoiceCount,
      files: fileCount,
      pendingAmount,
    });
  };

  const cards = [
    { icon: FolderKanban, label: 'Ενεργά Έργα', value: stats.projects, color: 'text-primary' },
    { icon: FileText, label: 'Τιμολόγια', value: stats.invoices, color: 'text-blue-500' },
    { icon: Package, label: 'Αρχεία', value: stats.files, color: 'text-green-500' },
    { icon: Clock, label: 'Εκκρεμή Ποσά', value: `€${stats.pendingAmount.toLocaleString()}`, color: 'text-amber-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold">Καλώς ήρθατε</h2>
        <p className="text-sm text-muted-foreground">Επισκόπηση του λογαριασμού σας στο {client.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className={cn("h-4 w-4", c.color)} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
