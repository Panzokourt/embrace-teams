import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface EmployeeHeaderProps {
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    job_title: string | null;
    phone: string | null;
    hire_date: string | null;
    status: string;
  };
  departmentName?: string | null;
  roleName?: string | null;
}

const statusLabels: Record<string, string> = {
  invited: 'Προσκεκλημένος',
  pending: 'Αναμονή',
  active: 'Ενεργός',
  suspended: 'Ανεσταλμένος',
  deactivated: 'Απενεργοποιημένος',
};

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  suspended: 'bg-destructive/10 text-destructive border-destructive/20',
  deactivated: 'bg-muted text-muted-foreground',
  invited: 'bg-primary/10 text-primary border-primary/20',
};

export function EmployeeHeader({ user, departmentName, roleName }: EmployeeHeaderProps) {
  const navigate = useNavigate();
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      {/* Cover gradient */}
      <div className="h-32 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/30" />

      {/* Profile section */}
      <div className="px-6 pb-4 -mt-12">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{user.full_name || 'Χωρίς όνομα'}</h1>
              <Badge variant="outline" className={statusColors[user.status]}>
                {statusLabels[user.status] || user.status}
              </Badge>
              {roleName && <Badge variant="outline">{roleName}</Badge>}
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
              {user.job_title && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {user.job_title}
                </span>
              )}
              {departmentName && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {departmentName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {user.phone}
                </span>
              )}
              {user.hire_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Πρόσληψη: {format(new Date(user.hire_date), 'd MMM yyyy', { locale: el })}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/hr')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Επιστροφή
          </Button>
        </div>
      </div>
    </div>
  );
}
