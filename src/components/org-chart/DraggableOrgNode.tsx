import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, ChevronDown, ChevronRight, MoreVertical,
  Pencil, Plus, Trash2, GripVertical
} from 'lucide-react';

interface OrgPosition {
  id: string;
  company_id: string;
  user_id: string | null;
  parent_position_id: string | null;
  position_title: string;
  department: string | null;
  level: number;
  sort_order: number;
  color: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  children?: OrgPosition[];
}

interface DraggableOrgNodeProps {
  node: OrgPosition;
  isExpanded: boolean;
  canEdit: boolean;
  isDragging?: boolean;
  onToggleExpand: (nodeId: string) => void;
  onEdit: (node: OrgPosition) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  renderChildren?: () => React.ReactNode;
}

const getInitials = (name: string | null | undefined, email?: string) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || '?';
};

export function DraggableOrgNode({
  node,
  isExpanded,
  canEdit,
  isDragging = false,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
  renderChildren
}: DraggableOrgNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`relative group bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all min-w-[200px] max-w-[280px] ${
          isDragging ? 'ring-2 ring-foreground shadow-lg' : ''
        }`}
        style={{ borderColor: node.color + '40' }}
      >
        {/* Drag handle */}
        {canEdit && (
          <div 
            {...attributes} 
            {...listeners}
            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Επεξεργασία
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChild(node.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Προσθήκη υφισταμένου
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(node.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Διαγραφή
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* User Avatar or Empty */}
        <div className="flex flex-col items-center text-center">
          {node.user ? (
            <>
              <Avatar className="h-14 w-14 ring-2 ring-offset-2" style={{ '--tw-ring-color': node.color } as React.CSSProperties}>
                <AvatarImage src={node.user.avatar_url || undefined} />
                <AvatarFallback className="text-lg" style={{ backgroundColor: node.color + '20', color: node.color }}>
                  {getInitials(node.user.full_name, node.user.email)}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-semibold mt-2">{node.user.full_name || 'Χωρίς όνομα'}</h4>
            </>
          ) : (
            <>
              <div 
                className="h-14 w-14 rounded-full flex items-center justify-center border-2 border-dashed"
                style={{ borderColor: node.color + '60' }}
              >
                <Users className="h-6 w-6" style={{ color: node.color }} />
              </div>
              <h4 className="font-semibold mt-2 text-muted-foreground italic">Κενή θέση</h4>
            </>
          )}
          <Badge variant="outline" className="mt-1" style={{ borderColor: node.color, color: node.color }}>
            {node.position_title}
          </Badge>
          {node.department && (
            <span className="text-xs text-muted-foreground mt-1">{node.department}</span>
          )}
        </div>

        {/* Expand toggle */}
        {hasChildren && (
          <button
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-secondary border flex items-center justify-center hover:bg-muted"
            onClick={() => onToggleExpand(node.id)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && renderChildren && (
        <>
          <div className="w-px h-6 bg-border" />
          {renderChildren()}
        </>
      )}
    </div>
  );
}
