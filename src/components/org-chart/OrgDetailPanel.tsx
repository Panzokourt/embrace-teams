import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Building2, Users, ExternalLink, Pencil, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { OrgPosition } from './types';

interface OrgDetailPanelProps {
  position: OrgPosition | null;
  open: boolean;
  onClose: () => void;
  childCount: number;
  canEdit: boolean;
  onEdit: (node: OrgPosition) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
}

const getInitials = (name: string | null | undefined, email?: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return email?.slice(0, 2).toUpperCase() || '?';
};

export function OrgDetailPanel({ position, open, onClose, childCount, canEdit, onEdit, onAddChild, onDelete }: OrgDetailPanelProps) {
  const navigate = useNavigate();
  if (!position) return null;

  const isVacant = !position.user;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="text-left">Λεπτομέρειες Θέσης</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile section */}
          <div className="flex flex-col items-center text-center gap-3">
            {position.user ? (
              <Avatar className="h-20 w-20 ring-2 ring-offset-2 ring-offset-background" style={{ '--tw-ring-color': position.color } as React.CSSProperties}>
                <AvatarImage src={position.user.avatar_url || undefined} />
                <AvatarFallback className="text-xl font-bold" style={{ backgroundColor: position.color + '18', color: position.color }}>
                  {getInitials(position.user.full_name, position.user.email)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center border-2 border-dashed"
                style={{ borderColor: position.color + '50' }}
              >
                <UserPlus className="h-8 w-8" style={{ color: position.color + '70' }} />
              </div>
            )}

            {position.user ? (
              <>
                <h3 className="text-lg font-bold">{position.user.full_name || 'Χωρίς όνομα'}</h3>
                <Badge variant="outline" style={{ borderColor: position.color, color: position.color }}>
                  {position.position_title}
                </Badge>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-muted-foreground italic">Κενή θέση</h3>
                <Badge variant="outline" style={{ borderColor: position.color, color: position.color }}>
                  {position.position_title}
                </Badge>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Αναζητείται
                </Badge>
              </>
            )}
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            {position.department && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground">Τμήμα:</span>
                  <span className="ml-2 font-medium">{position.department}</span>
                </div>
              </div>
            )}

            {position.user?.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{position.user.email}</span>
              </div>
            )}

            {position.user?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{position.user.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Υφιστάμενοι:</span>
                <span className="ml-2 font-medium">{childCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground text-xs">Level:</span>
              <span className="font-medium">{position.level}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            {position.user && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/hr/employee/${position.user!.id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Προφίλ Εργαζομένου
              </Button>
            )}

            {canEdit && (
              <>
                <Button variant="outline" className="w-full justify-start" onClick={() => onEdit(position)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Επεξεργασία θέσης
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onAddChild(position.id)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Προσθήκη υφισταμένου
                </Button>
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => { onDelete(position.id); onClose(); }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Διαγραφή θέσης
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
