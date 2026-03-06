import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users, MoreVertical, Pencil, Plus, Trash2, ChevronDown, ChevronUp, UserPlus
} from 'lucide-react';
import type { OrgPosition } from './types';

interface OrgNodeCardProps {
  node: OrgPosition;
  isExpanded: boolean;
  canEdit: boolean;
  childCount: number;
  onClick: (node: OrgPosition) => void;
  onToggleExpand: (nodeId: string) => void;
  onEdit: (node: OrgPosition) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
}

const getInitials = (name: string | null | undefined, email?: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return email?.slice(0, 2).toUpperCase() || '?';
};

export function OrgNodeCard({
  node, isExpanded, canEdit, childCount,
  onClick, onToggleExpand, onEdit, onAddChild, onDelete,
}: OrgNodeCardProps) {
  const hasChildren = childCount > 0;
  const isVacant = !node.user_id && !node.user;

  return (
    <div className="flex flex-col items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative group bg-card border-2 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all min-w-[210px] max-w-[280px] cursor-pointer select-none ${
              isVacant ? 'border-dashed' : ''
            }`}
            style={{ borderColor: isVacant ? node.color + '60' : node.color + '50' }}
            onClick={(e) => {
              e.stopPropagation();
              onClick(node);
            }}
          >
            {/* Actions dropdown */}
            {canEdit && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Επεξεργασία
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Προσθήκη υφισταμένου
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Διαγραφή
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col items-center text-center gap-1.5">
              {node.user ? (
                <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-offset-card" style={{ '--tw-ring-color': node.color } as React.CSSProperties}>
                  <AvatarImage src={node.user.avatar_url || undefined} />
                  <AvatarFallback className="text-sm font-bold" style={{ backgroundColor: node.color + '18', color: node.color }}>
                    {getInitials(node.user.full_name, node.user.email)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center border-2 border-dashed"
                  style={{ borderColor: node.color + '60' }}
                >
                  <UserPlus className="h-5 w-5" style={{ color: node.color + '80' }} />
                </div>
              )}

              {node.user ? (
                <span className="font-semibold text-sm leading-tight">{node.user.full_name || node.user.email}</span>
              ) : (
                <span className="font-medium text-sm text-muted-foreground italic">Κενή θέση</span>
              )}

              <Badge
                variant="outline"
                className="text-xs font-medium"
                style={{ borderColor: node.color + '60', color: node.color }}
              >
                {node.position_title}
              </Badge>

              {node.department && (
                <span className="text-[11px] text-muted-foreground">{node.department}</span>
              )}

              {isVacant && (
                <Badge variant="secondary" className="text-[10px] mt-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Αναζητείται
                </Badge>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="font-medium">{node.position_title}</p>
          {node.user?.full_name && <p className="text-xs text-muted-foreground">{node.user.full_name}</p>}
          {node.department && <p className="text-xs text-muted-foreground">{node.department}</p>}
          {childCount > 0 && <p className="text-xs text-muted-foreground mt-1">{childCount} υφιστάμενοι</p>}
        </TooltipContent>
      </Tooltip>

      {/* Expand toggle */}
      {hasChildren && (
        <button
          className="mt-1 h-6 w-6 rounded-full bg-card border-2 border-border flex items-center justify-center hover:bg-muted transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
        >
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}
