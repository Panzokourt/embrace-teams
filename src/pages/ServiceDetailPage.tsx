import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCosts, ServiceRoleCost } from '@/hooks/usePricingData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import ServiceCostingTable from '@/components/pricing/ServiceCostingTable';
import { Loader2, ArrowLeft, Tags, TrendingUp, TrendingDown, DollarSign, Clock, FileText } from 'lucide-react';

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useAuth();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { roleCosts } = useRoleCosts(id);

  useEffect(() => {
    if (!id) return;
    supabase.from('services').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/pricing'); return; }
        setService(data);
        setLoading(false);
      });
  }, [id, navigate]);

  if (loading || !service) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const laborCost = roleCosts.reduce((s, c) => s + (c.total_cost || 0), 0);
  const externalCost = service.external_cost || 0;
  const totalCost = laborCost + externalCost;
  const marginEur = service.list_price - totalCost;
  const marginPct = service.list_price > 0 ? (marginEur / service.list_price) * 100 : 0;

  return (
    <div className="page-shell">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Πίσω
        </Button>
      </div>

      <PageHeader
        icon={Tags}
        title={service.name}
        subtitle={service.description || 'Υπηρεσία'}
        breadcrumbs={[{ label: 'Revenue' }, { label: 'Τιμολόγηση', href: '/pricing' }, { label: service.name }]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><DollarSign className="h-4 w-4" />Τιμή Πώλησης</div>
            <p className="text-2xl font-bold">€{service.list_price.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Clock className="h-4 w-4" />Συνολικό Κόστος</div>
            <p className="text-2xl font-bold">€{totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Labor: €{laborCost.toFixed(2)} + Ext: €{externalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><TrendingUp className="h-4 w-4" />Margin</div>
            <p className="text-2xl font-bold">€{marginEur.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              {marginPct >= (service.target_margin || 0) ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              Margin %
            </div>
            <p className="text-2xl font-bold">{marginPct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Target: {service.target_margin || 0}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="costing">Κοστολόγηση</TabsTrigger>
          <TabsTrigger value="deliverables">Παραδοτέα</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Πληροφορίες</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Κατηγορία</span><Badge variant="outline" className="capitalize">{service.category}</Badge></div>
                {service.subcategory && <div className="flex justify-between"><span className="text-muted-foreground">Υποκατηγορία</span><span>{service.subcategory}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Pricing Model</span><Badge variant="secondary" className="capitalize">{service.pricing_model || 'fixed'}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Μονάδα</span><span className="capitalize">{service.pricing_unit}</span></div>
                {service.estimated_turnaround && <div className="flex justify-between"><span className="text-muted-foreground">Χρόνος Παράδοσης</span><span>{service.estimated_turnaround}</span></div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Σημειώσεις</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.notes || 'Δεν υπάρχουν σημειώσεις.'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costing" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Κοστολόγηση Ομάδας</CardTitle></CardHeader>
            <CardContent>
              <ServiceCostingTable serviceId={service.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliverables" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Παραδοτέα</CardTitle></CardHeader>
            <CardContent>
              {service.deliverables && service.deliverables.length > 0 ? (
                <ul className="space-y-2">
                  {service.deliverables.map((d: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Δεν έχουν οριστεί παραδοτέα.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
