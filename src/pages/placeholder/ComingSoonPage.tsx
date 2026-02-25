import { Badge } from '@/components/ui/badge';
import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function ComingSoonPage({ title, description, icon: Icon = Construction }: ComingSoonPageProps) {
  return (
    <div className="page-shell">
      <PageHeader
        icon={Icon as any}
        title={title}
        subtitle={description}
        breadcrumbs={[{ label: title }]}
        actions={
          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
        }
      />
      <div className="flex items-center justify-center min-h-[400px] rounded-xl border border-dashed border-border/60 bg-muted/20">
        <div className="text-center space-y-2">
          <Construction className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground text-sm">Αυτή η λειτουργία βρίσκεται υπό ανάπτυξη</p>
        </div>
      </div>
    </div>
  );
}
