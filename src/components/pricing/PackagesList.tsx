import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function PackagesList() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-40" />
        <h3 className="text-lg font-medium mb-1">Package Builder</h3>
        <p className="text-sm">Δημιουργήστε πακέτα υπηρεσιών με bundle pricing — Phase 2</p>
      </CardContent>
    </Card>
  );
}
