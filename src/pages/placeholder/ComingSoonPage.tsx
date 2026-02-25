import { Badge } from '@/components/ui/badge';
import { Construction } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function ComingSoonPage({ title, description, icon: Icon = Construction }: ComingSoonPageProps) {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-[400px] rounded-xl border border-dashed border-border/60 bg-muted/20">
        <div className="text-center space-y-2">
          <Construction className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground text-sm">Αυτή η λειτουργία βρίσκεται υπό ανάπτυξη</p>
        </div>
      </div>
    </div>
  );
}
