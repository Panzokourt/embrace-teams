import { useMemo } from 'react';
import { useServices, usePackages, useProposals } from '@/hooks/usePricingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, DollarSign, Package, FileText, Activity, Loader2 } from 'lucide-react';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5, 280 65% 60%))',
];

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

export default function PricingDashboard() {
  const { services, loading: sLoading } = useServices();
  const { packages, loading: pLoading } = usePackages();
  const { proposals, loading: prLoading } = useProposals();

  const loading = sLoading || pLoading || prLoading;

  // ── KPIs ──
  const kpis = useMemo(() => {
    const active = services.filter(s => !s.archived_at);
    const avgMargin = active.length > 0
      ? active.reduce((s, sv) => s + (sv.margin_pct || 0), 0) / active.length
      : 0;
    const totalRevenue = active.reduce((s, sv) => s + sv.list_price, 0);
    const totalCost = active.reduce((s, sv) => s + (sv.total_cost || 0), 0);

    const wonProposals = proposals.filter(p => p.status === 'won');
    const wonValue = wonProposals.reduce((s, p) => s + (p.total_revenue || 0), 0);
    const winRate = proposals.length > 0
      ? (wonProposals.length / proposals.filter(p => ['won', 'lost'].includes(p.status)).length) * 100 || 0
      : 0;

    return {
      serviceCount: active.length,
      avgMargin: avgMargin.toFixed(1),
      totalRevenue,
      totalCost,
      packageCount: packages.filter(p => p.is_active).length,
      proposalCount: proposals.length,
      wonValue,
      winRate: winRate.toFixed(0),
    };
  }, [services, packages, proposals]);

  // ── Margin Health Distribution ──
  const marginDistribution = useMemo(() => {
    const active = services.filter(s => !s.archived_at);
    const buckets = [
      { name: 'Αρνητικό (<0%)', value: 0, color: 'hsl(var(--destructive))' },
      { name: 'Χαμηλό (0-20%)', value: 0, color: 'hsl(var(--chart-4))' },
      { name: 'Μέτριο (20-40%)', value: 0, color: 'hsl(var(--chart-2))' },
      { name: 'Υγιές (40-60%)', value: 0, color: 'hsl(var(--chart-3))' },
      { name: 'Εξαιρετικό (>60%)', value: 0, color: 'hsl(var(--primary))' },
    ];
    active.forEach(s => {
      const m = s.margin_pct || 0;
      if (m < 0) buckets[0].value++;
      else if (m < 20) buckets[1].value++;
      else if (m < 40) buckets[2].value++;
      else if (m < 60) buckets[3].value++;
      else buckets[4].value++;
    });
    return buckets.filter(b => b.value > 0);
  }, [services]);

  // ── Top Services by Profitability ──
  const topServices = useMemo(() => {
    return services
      .filter(s => !s.archived_at && s.list_price > 0)
      .sort((a, b) => (b.margin_eur || 0) - (a.margin_eur || 0))
      .slice(0, 8)
      .map(s => ({
        name: s.name.length > 20 ? s.name.slice(0, 20) + '…' : s.name,
        margin: Math.round(s.margin_eur || 0),
        pct: Math.round(s.margin_pct || 0),
      }));
  }, [services]);

  // ── Package Performance ──
  const packagePerf = useMemo(() => {
    return packages
      .filter(p => p.is_active)
      .sort((a, b) => (b.margin_eur || 0) - (a.margin_eur || 0))
      .slice(0, 6)
      .map(p => ({
        name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
        revenue: Math.round(p.final_price || 0),
        cost: Math.round(p.internal_cost || 0),
        margin: Math.round(p.margin_eur || 0),
      }));
  }, [packages]);

  // ── Proposal Win Rates by Status ──
  const proposalsByStatus = useMemo(() => {
    const statusMap: Record<string, { count: number; value: number }> = {};
    proposals.forEach(p => {
      if (!statusMap[p.status]) statusMap[p.status] = { count: 0, value: 0 };
      statusMap[p.status].count++;
      statusMap[p.status].value += p.total_revenue || 0;
    });
    const labels: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      negotiation: 'Negotiation',
      won: 'Won',
      lost: 'Lost',
    };
    return Object.entries(statusMap).map(([status, data]) => ({
      name: labels[status] || status,
      count: data.count,
      value: Math.round(data.value),
    }));
  }, [proposals]);

  // ── Proposal Value by Month ──
  const proposalTrend = useMemo(() => {
    const months: Record<string, { won: number; total: number }> = {};
    proposals.forEach(p => {
      const key = p.created_at.slice(0, 7); // YYYY-MM
      if (!months[key]) months[key] = { won: 0, total: 0 };
      months[key].total += p.total_revenue || 0;
      if (p.status === 'won') months[key].won += p.total_revenue || 0;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('el-GR', { month: 'short' }),
        won: Math.round(data.won),
        total: Math.round(data.total),
      }));
  }, [proposals]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} title="Ενεργές Υπηρεσίες" value={kpis.serviceCount} subtitle={`Μέσο margin: ${kpis.avgMargin}%`} variant="primary" />
        <StatCard icon={Package} title="Ενεργά Πακέτα" value={kpis.packageCount} variant="default" />
        <StatCard icon={FileText} title="Προσφορές" value={kpis.proposalCount} subtitle={`Win rate: ${kpis.winRate}%`} variant="success" />
        <StatCard icon={DollarSign} title="Won Value" value={`€${kpis.wonValue.toLocaleString('el-GR')}`} variant="warning" />
      </div>

      {/* Row 2: Margin Distribution + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Margin Health Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Activity className="h-4 w-4 text-foreground" />
              </span>
              Margin Health Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {marginDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={marginDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3} label={({ name, value }) => `${value}`}>
                      {marginDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Δεν υπάρχουν δεδομένα</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Services by Profitability */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-foreground" />
              </span>
              Top Υπηρεσίες (Κερδοφορία)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {topServices.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServices} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} contentStyle={tooltipStyle} />
                    <Bar dataKey="margin" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Δεν υπάρχουν δεδομένα</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Package Performance + Proposal Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Package Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-4 w-4 text-foreground" />
              </span>
              Πακέτα: Revenue vs Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {packagePerf.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={packagePerf} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                    <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Κόστος" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Δεν υπάρχουν πακέτα</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Proposal by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-4 w-4 text-foreground" />
              </span>
              Προσφορές ανά Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {proposalsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={proposalsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar yAxisId="left" dataKey="count" name="Πλήθος" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="value" name="Αξία" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Δεν υπάρχουν προσφορές</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Proposal Trend */}
      {proposalTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-foreground" />
              </span>
              Αξία Προσφορών ανά Μήνα
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={proposalTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="total" name="Σύνολο" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="won" name="Won" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom: Quick lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Margin Alert */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">⚠️ Υπηρεσίες σε Κίνδυνο</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {services.filter(s => !s.archived_at && (s.margin_pct || 0) < 15).length === 0 ? (
                <p className="text-sm text-muted-foreground">Όλες οι υπηρεσίες έχουν υγιές margin 🎉</p>
              ) : (
                services
                  .filter(s => !s.archived_at && (s.margin_pct || 0) < 15)
                  .sort((a, b) => (a.margin_pct || 0) - (b.margin_pct || 0))
                  .slice(0, 5)
                  .map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                      <span className="truncate max-w-[200px]">{s.name}</span>
                      <Badge variant={(s.margin_pct || 0) < 0 ? 'destructive' : 'secondary'}>
                        {(s.margin_pct || 0).toFixed(1)}%
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">📋 Πρόσφατες Προσφορές</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {proposals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Δεν υπάρχουν προσφορές</p>
              ) : (
                proposals.slice(0, 5).map(p => {
                  const statusColors: Record<string, string> = {
                    draft: 'bg-muted text-muted-foreground',
                    sent: 'bg-blue-500/15 text-blue-600',
                    negotiation: 'bg-amber-500/15 text-amber-600',
                    won: 'bg-primary/15 text-primary',
                    lost: 'bg-destructive/15 text-destructive',
                  };
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                      <div className="truncate max-w-[180px]">
                        <span className="font-medium">{p.name}</span>
                        {p.client_name && <span className="text-muted-foreground ml-1">({p.client_name})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">€{(p.total_revenue || 0).toLocaleString('el-GR')}</span>
                        <Badge className={statusColors[p.status] || ''}>{p.status}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
