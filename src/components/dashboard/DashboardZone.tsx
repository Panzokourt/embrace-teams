import { type ReactNode } from 'react';
import { ZONE_DEFINITIONS, type ZoneId } from './dashboardTemplates';
import { cn } from '@/lib/utils';

interface DashboardZoneProps {
  zoneId: ZoneId;
  children: ReactNode;
}

export default function DashboardZone({ zoneId, children }: DashboardZoneProps) {
  const def = ZONE_DEFINITIONS[zoneId];

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-0.5">
        {def.label}
      </h3>
      <div className={cn('grid gap-4', def.gridClass)}>
        {children}
      </div>
    </div>
  );
}
