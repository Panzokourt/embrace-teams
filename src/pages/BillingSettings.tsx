import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Package, BarChart3, ArrowUpRight } from 'lucide-react';

export default function BillingSettings() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Διαχείριση συνδρομής και πληρωμών</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Τρέχον Πλάνο</CardTitle>
                <CardDescription>Η τρέχουσα συνδρομή σας</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">Free</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Free Plan</p>
              <p className="text-sm text-muted-foreground">Βασικές λειτουργίες για μικρές ομάδες</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <ArrowUpRight className="h-4 w-4 mr-1" /> Αναβάθμιση
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Τα πλάνα αναβάθμισης θα είναι διαθέσιμα σύντομα.
          </p>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Χρήση</CardTitle>
              <CardDescription>Στατιστικά χρήσης πλατφόρμας</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Μέλη ομάδας', value: '—', limit: '∞' },
              { label: 'Έργα', value: '—', limit: '∞' },
              { label: 'Αποθηκευτικός χώρος', value: '—', limit: '∞' },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                <p className="text-xs text-muted-foreground">Όριο: {item.limit}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Μέθοδος Πληρωμής</CardTitle>
              <CardDescription>Δεν έχει οριστεί μέθοδος πληρωμής</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Προσθήκη κάρτας
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Η διαχείριση πληρωμών θα είναι διαθέσιμη σύντομα.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
