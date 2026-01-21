import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Shield, 
  UserCheck, 
  UserX, 
  Clock,
  Crown,
  Users,
  Briefcase,
  Settings,
  Ban,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { CompanyRole, UserStatus } from '@/contexts/AuthContext';
import { CompanyUser } from '@/hooks/useRBAC';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface UserCardProps {
  user: CompanyUser;
  onEditPermissions: (user: CompanyUser) => void;
  onEditUser?: (user: CompanyUser) => void;
  onChangeRole: (userId: string, role: CompanyRole) => void;
  onChangeStatus: (userId: string, status: UserStatus) => void;
}

const ROLE_CONFIG: Record<CompanyRole, { label: string; icon: React.ReactNode; className: string }> = {
  super_admin: { label: 'Super Admin', icon: <Crown className="h-3 w-3" />, className: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30' },
  admin: { label: 'Admin', icon: <Shield className="h-3 w-3" />, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  manager: { label: 'Manager', icon: <Briefcase className="h-3 w-3" />, className: 'bg-primary/10 text-primary border-primary/20' },
  standard: { label: 'Standard', icon: <Users className="h-3 w-3" />, className: 'bg-secondary text-secondary-foreground border-border' },
  client: { label: 'Client', icon: <Users className="h-3 w-3" />, className: 'bg-success/10 text-success border-success/20' },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; icon: React.ReactNode; className: string }> = {
  invited: { label: 'Προσκλήθηκε', icon: <Clock className="h-3 w-3" />, className: 'bg-primary/10 text-primary border-primary/20' },
  pending: { label: 'Αναμονή', icon: <Clock className="h-3 w-3" />, className: 'bg-warning/10 text-warning border-warning/20' },
  active: { label: 'Ενεργός', icon: <UserCheck className="h-3 w-3" />, className: 'bg-success/10 text-success border-success/20' },
  suspended: { label: 'Ανεσταλμένος', icon: <Ban className="h-3 w-3" />, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  deactivated: { label: 'Απενεργοποιημένος', icon: <UserX className="h-3 w-3" />, className: 'bg-muted text-muted-foreground border-border' },
};

export function UserCard({ user, onEditPermissions, onEditUser, onChangeRole, onChangeStatus }: UserCardProps) {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === user.user_id;
  const isSuperAdminUser = user.role === 'super_admin';
  const canModify = (isSuperAdmin || !isSuperAdminUser) && !isCurrentUser;

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleConfig = ROLE_CONFIG[user.role];
  const statusConfig = STATUS_CONFIG[user.status];

  return (
    <div className={cn(
      "group relative p-4 rounded-xl border transition-all duration-200 ease-apple",
      "hover:shadow-soft hover:border-border hover:-translate-y-0.5",
      user.status === 'active' ? "bg-card" : "bg-muted/30"
    )}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-soft">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground font-medium">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">
              {user.full_name || 'Χωρίς όνομα'}
            </h3>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">Εσείς</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={cn("flex items-center gap-1", roleConfig.className)}>
              {roleConfig.icon}
              {roleConfig.label}
            </Badge>
            <Badge variant="outline" className={cn("flex items-center gap-1", statusConfig.className)}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
            {user.access_scope === 'company' && (
              <Badge variant="outline" className="text-xs">
                <Briefcase className="h-2.5 w-2.5 mr-1" />
                Company-wide
              </Badge>
            )}
          </div>

          {/* Permissions count */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>{user.permissions.length} δικαιώματα</span>
            {user.client_ids.length > 0 && <span>{user.client_ids.length} clients</span>}
            {user.project_ids.length > 0 && <span>{user.project_ids.length} projects</span>}
            {user.last_login_at && (
              <span>Τελευταία σύνδεση: {format(new Date(user.last_login_at), 'd MMM yyyy', { locale: el })}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {canModify && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Ενέργειες</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onEditUser?.(user)}>
                <Pencil className="h-4 w-4 mr-2" />
                Επεξεργασία χρήστη
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onEditPermissions(user)}>
                <Settings className="h-4 w-4 mr-2" />
                Επεξεργασία δικαιωμάτων
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Αλλαγή ρόλου</DropdownMenuLabel>
              {(['admin', 'manager', 'standard', 'client'] as CompanyRole[]).map(role => (
                <DropdownMenuItem 
                  key={role}
                  disabled={user.role === role}
                  onClick={() => onChangeRole(user.user_id, role)}
                >
                  {ROLE_CONFIG[role].icon}
                  <span className="ml-2">{ROLE_CONFIG[role].label}</span>
                  {user.role === role && <Badge variant="secondary" className="ml-auto">Τρέχων</Badge>}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Κατάσταση</DropdownMenuLabel>
              {user.status === 'active' ? (
                <>
                  <DropdownMenuItem onClick={() => onChangeStatus(user.user_id, 'suspended')}>
                    <Ban className="h-4 w-4 mr-2 text-warning" />
                    Αναστολή
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeStatus(user.user_id, 'deactivated')} className="text-destructive">
                    <UserX className="h-4 w-4 mr-2" />
                    Απενεργοποίηση
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => onChangeStatus(user.user_id, 'active')}>
                  <UserCheck className="h-4 w-4 mr-2 text-success" />
                  Ενεργοποίηση
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}