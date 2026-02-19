import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Calendar, Pencil, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

type EditableField = 'full_name' | 'job_title' | 'phone' | 'hire_date' | null;

export function EmployeeHeader({ user, departmentName, roleName, canEdit = false, onUserUpdate }: EmployeeHeaderProps) {
  const navigate = useNavigate();
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const startEdit = (field: EditableField, currentValue: string | null) => {
    if (!canEdit) return;
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingField) return;
    setSaving(true);
    try {
      const updateData: Record<string, string | null> = {
        [editingField]: editValue.trim() || null,
      };
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      if (error) throw error;
      onUserUpdate?.(updateData);
      toast.success('Ενημερώθηκε επιτυχώς');
      setEditingField(null);
    } catch (err) {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    else if (e.key === 'Escape') cancelEdit();
  };

  const renderEditable = (field: EditableField, value: string | null, displayValue: string, icon: React.ReactNode, inputType = 'text') => {
    if (editingField === field) {
      return (
        <span className="flex items-center gap-1.5">
          {icon}
          <Input
            type={inputType}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-6 text-sm px-1.5 py-0 w-40"
            disabled={saving}
          />
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={saveEdit} disabled={saving}>
            <Check className="h-3 w-3 text-success" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={cancelEdit} disabled={saving}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </span>
      );
    }
    return (
      <span
        className={`flex items-center gap-1.5 group ${canEdit ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors' : ''}`}
        onClick={() => startEdit(field, value)}
        title={canEdit ? 'Κλικ για επεξεργασία' : undefined}
      >
        {icon}
        {displayValue}
        {canEdit && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </span>
    );
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
              {editingField === 'full_name' ? (
                <span className="flex items-center gap-1.5">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="h-8 text-xl font-bold px-2 w-64"
                    disabled={saving}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEdit} disabled={saving}>
                    <Check className="h-3.5 w-3.5 text-success" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit} disabled={saving}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </span>
              ) : (
                <h1
                  className={`text-2xl font-bold tracking-tight group ${canEdit ? 'cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors' : ''}`}
                  onClick={() => startEdit('full_name', user.full_name)}
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
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
              {renderEditable('job_title', user.job_title, user.job_title || 'Προσθήκη θέσης', <Briefcase className="h-3.5 w-3.5" />)}
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
              {renderEditable('phone', user.phone, user.phone || 'Προσθήκη τηλ.', <Phone className="h-3.5 w-3.5" />)}
              {renderEditable(
                'hire_date',
                user.hire_date,
                user.hire_date ? `Πρόσληψη: ${format(new Date(user.hire_date), 'd MMM yyyy', { locale: el })}` : 'Ημ. πρόσληψης',
                <Calendar className="h-3.5 w-3.5" />,
                'date'
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
