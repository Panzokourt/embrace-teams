import { useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Bell, Zap, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';

const stageTypeConfig: Record<string, { label: string; color: string }> = {
  request: { label: 'Αίτημα', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  review: { label: 'Αξιολόγηση', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  approval: { label: 'Έγκριση', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  kickoff: { label: 'Εκκίνηση', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
  internal: { label: 'Εσωτερικό', color: 'bg-muted text-muted-foreground border-border' },
};

export type SpecialNodeType = 'start' | 'end';

interface WorkflowNodeProps {
  stage?: IntakeWorkflowStage;
  specialType?: SpecialNodeType;
  specialLabel?: string;
  x: number;
  y: number;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  onNameChange?: (name: string) => void;
  onSlaChange?: (sla: number | null) => void;
  onConnectionStart?: (e: React.MouseEvent) => void;
  onConnectionEnd?: () => void;
  zoom?: number;
}

export function WorkflowNode({
  stage, specialType, specialLabel, x, y, selected, onClick, onDoubleClick,
  onDelete, onPositionChange, onNameChange, onSlaChange, onConnectionStart, onConnectionEnd, zoom = 1,
}: WorkflowNodeProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingSla, setEditingSla] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempSla, setTempSla] = useState('');
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const nameRef = useRef<HTMLInputElement>(null);
  const slaRef = useRef<HTMLInputElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (editingName || editingSla) return;
    e.stopPropagation();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, nodeX: x, nodeY: y };

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = (ev.clientX - dragStart.current.x) / zoom;
      const dy = (ev.clientY - dragStart.current.y) / zoom;
      onPositionChange?.(dragStart.current.nodeX + dx, dragStart.current.nodeY + dy);
    };
    const handleUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [x, y, zoom, onPositionChange, editingName, editingSla]);

  const startEditName = () => {
    if (!stage) return;
    setTempName(stage.name);
    setEditingName(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const commitName = () => {
    setEditingName(false);
    if (tempName.trim() && tempName !== stage?.name) onNameChange?.(tempName.trim());
  };

  const startEditSla = () => {
    if (!stage) return;
    setTempSla(stage.sla_hours?.toString() || '');
    setEditingSla(true);
    setTimeout(() => slaRef.current?.focus(), 50);
  };

  const commitSla = () => {
    setEditingSla(false);
    const val = tempSla ? parseInt(tempSla) : null;
    if (val !== stage?.sla_hours) onSlaChange?.(val);
  };

  // Special start/end nodes
  if (specialType) {
    const isStart = specialType === 'start';
    return (
      <div
        className="absolute"
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      >
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer border-2 transition-all",
            isStart
              ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/15 border-destructive/50 text-destructive",
            selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
          )}
          onClick={onClick}
          onMouseUp={onConnectionEnd}
        >
          {specialLabel || (isStart ? 'Αρχή' : 'Τέλος')}
        </div>
        {/* Output handle for start */}
        {isStart && (
          <div
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background cursor-crosshair hover:scale-125 transition-transform"
            onMouseDown={(e) => { e.stopPropagation(); onConnectionStart?.(e); }}
          />
        )}
        {/* Input handle for end */}
        {!isStart && (
          <div
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-destructive border-2 border-background"
            onMouseUp={(e) => { e.stopPropagation(); onConnectionEnd?.(); }}
          />
        )}
      </div>
    );
  }

  if (!stage) return null;
  const typeConf = stageTypeConfig[stage.stage_type] || stageTypeConfig.internal;

  return (
    <div
      className="absolute"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <div
        className={cn(
          "relative w-56 rounded-2xl border bg-card p-4 shadow-soft transition-all group cursor-pointer",
          selected ? "border-ring ring-2 ring-ring/30 shadow-soft-lg" : "border-border/50 hover:shadow-soft-lg"
        )}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
      >
        {/* Drag handle */}
        <div
          className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-full pt-0.5 pb-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={handleDragStart}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Input handle (left) */}
        <div
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-muted-foreground/50 border-2 border-background hover:bg-foreground transition-colors"
          onMouseUp={(e) => { e.stopPropagation(); onConnectionEnd?.(); }}
        />

        {/* Output handle (right) */}
        <div
          className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-muted-foreground/50 border-2 border-background cursor-crosshair hover:bg-foreground hover:scale-125 transition-all"
          onMouseDown={(e) => { e.stopPropagation(); onConnectionStart?.(e); }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={cn("text-[10px] font-medium", typeConf.color)}>
            {typeConf.label}
          </Badge>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Name — inline editable */}
        {editingName ? (
          <input
            ref={nameRef}
            className="text-sm font-semibold text-foreground bg-transparent border-b border-ring outline-none w-full"
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
          />
        ) : (
          <h4
            className="text-sm font-semibold text-foreground truncate cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); startEditName(); }}
            title="Διπλό κλικ για επεξεργασία"
          >
            {stage.name}
          </h4>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
          {editingSla ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <input
                ref={slaRef}
                type="number"
                className="w-10 bg-transparent border-b border-ring outline-none text-[11px]"
                value={tempSla}
                onChange={e => setTempSla(e.target.value)}
                onBlur={commitSla}
                onKeyDown={e => { if (e.key === 'Enter') commitSla(); if (e.key === 'Escape') setEditingSla(false); }}
              />ώρες
            </span>
          ) : (
            stage.sla_hours && (
              <span
                className="flex items-center gap-1 cursor-text"
                onDoubleClick={(e) => { e.stopPropagation(); startEditSla(); }}
                title="Διπλό κλικ για αλλαγή SLA"
              >
                <Clock className="h-3 w-3" />{stage.sla_hours}ώρες
              </span>
            )
          )}
          {stage.notify_on_enter && <span title="Ειδοποίηση εισόδου"><Bell className="h-3 w-3" /></span>}
          {stage.auto_advance && <span title="Αυτόματη προώθηση"><Zap className="h-3 w-3" /></span>}
          {(stage.required_fields as string[])?.length > 0 && (
            <span>{(stage.required_fields as string[]).length} πεδία</span>
          )}
        </div>
      </div>
    </div>
  );
}
