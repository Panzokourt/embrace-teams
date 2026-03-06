import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function PricingDashboard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4 opacity-40" />
        <h3 className="text-lg font-medium mb-1">Pricing Dashboard</h3>
        <p className="text-sm">Margin health, profitability charts, proposal analytics — Phase 3</p>
      </CardContent>
    </Card>
  );
}
