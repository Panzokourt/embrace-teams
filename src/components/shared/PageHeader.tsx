import { type LucideIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment, type ReactNode } from 'react';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbEntry[];
  actions?: ReactNode;
  tabs?: ReactNode;
  toolbar?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  tabs,
  toolbar,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, idx) => (
              <Fragment key={idx}>
                <BreadcrumbSeparator className="text-muted-foreground/40" />
                <BreadcrumbItem>
                  {idx === breadcrumbs.length - 1 || !crumb.href ? (
                    <BreadcrumbPage className="text-muted-foreground/70">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Tabs */}
      {tabs}

      {/* Toolbar (search, filters, etc.) */}
      {toolbar}

      {/* Extra content */}
      {children}
    </div>
  );
}
