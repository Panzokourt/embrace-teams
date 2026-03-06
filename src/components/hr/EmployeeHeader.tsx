import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { XPBadge } from '@/components/gamification/XPBadge';
import { KudosDialog } from '@/components/gamification/KudosDialog';

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
  canEdit?: boolean;
  onUserUpdate?: (updates: Partial<{ full_name: string; job_title: string; phone: string; hire_date: string }>) => void;
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

export function EmployeeHeader({ user, departmentName, roleName, canEdit = false, onUserUpdate }: EmployeeHeaderProps) {
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const startEditName = () => {
    if (!canEdit) return;
    setEditingName(true);
    setEditValue(user.full_name || '');
  };

  const cancelEdit = () => {
    setEditingName(false);
    setEditValue('');
  };

  const saveName = async () => {
    setSaving(true);
    try {
      const val = editValue.trim() || null;
      const { error } = await supabase.from('profiles').update({ full_name: val }).eq('id', user.id);
      if (error) throw error;
      onUserUpdate?.({ full_name: val as string });
      toast.success('Ενημερώθηκε επιτυχώς');
      setEditingName(false);
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName();
    else if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="relative">
      <div className="h-32 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/30" />

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
              {editingName ? (
                <span className="flex items-center gap-1.5">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="h-8 text-xl font-bold px-2 w-64"
                    disabled={saving}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveName} disabled={saving}>
                    <Check className="h-3.5 w-3.5 text-success" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit} disabled={saving}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </span>
              ) : (
                <h1
                  className={`text-2xl font-bold tracking-tight group ${canEdit ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors' : ''}`}
                  onClick={startEditName}
                  title={canEdit ? 'Κλικ για επεξεργασία' : undefined}
                >
                  {user.full_name || 'Χωρίς όνομα'}
                  {canEdit && <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline ml-2" />}
                </h1>
              )}
              <Badge variant="outline" className={statusColors[user.status]}>
                {statusLabels[user.status] || user.status}
              </Badge>
              {roleName && <Badge variant="outline">{roleName}</Badge>}
              <XPBadge userId={user.id} size="md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <KudosDialog recipientId={user.id} recipientName={user.full_name || 'Χρήστης'} />
            <Button variant="outline" size="sm" onClick={() => navigate('/hr')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Επιστροφή
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
