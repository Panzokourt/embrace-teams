import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Shield, Calendar, ChevronRight, FileText, Clock, User, Flag, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useFocusMode } from '@/contexts/FocusContext';
import FocusControlBar from './FocusControlBar';
import FocusAIChat, { type FocusAIChatHandle } from './FocusAIChat';
import FocusSidebarResizer from './FocusSidebarResizer';
import FocusKeyboardShortcuts from './FocusKeyboardShortcuts';
import FocusEditableField from './sections/FocusEditableField';
import FocusSubtasksSection from './sections/FocusSubtasksSection';
import FocusFilesSection from './sections/FocusFilesSection';
import FocusCommentsSection from './sections/FocusCommentsSection';
import FocusTimeTrackingSection from './sections/FocusTimeTrackingSection';
import FocusDependenciesSection from './sections/FocusDependenciesSection';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---------- Constants ----------
const SIDEBAR_KEY = 'focus.sidebarWidth';
const DEFAULT_WIDTH = 288;
const MIN_W = 240;
const MAX_W = 480;

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'low', label: 'Low', color: 'bg-white/10 text-white/70 border-white/15' },
];

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
];

// ---------- Sortable sidebar task ----------
function SortableSidebarTask({
  task, onSelect, isCurrent,
}: {
  task: { id: string; title: string; project_name?: string; due_date: string | null; priority: string };
  onSelect: () => void;
  isCurrent?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const dot =
    task.priority === 'urgent' ? 'bg-red-400' :
    task.priority === 'high' ? 'bg-orange-400' :
    task.priority === 'medium' ? 'bg-yellow-400' : 'bg-white/40';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all touch-none',
        isCurrent
          ? 'bg-[#3b82f6]/15 border border-[#3b82f6]/40'
          : 'border border-transparent hover:bg-white/5 hover:border-white/10',
        isDragging && 'opacity-70 z-50',
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isCurrent ? 'text-white' : 'text-white/85',
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project_name && (
            <span className="text-[11px] text-white/55 truncate">{task.project_name}</span>
          )}
          {task.due_date && (
            <span className="text-[11px] text-white/40">· {format(new Date(task.due_date), 'd/MM')}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white/70 shrink-0" />
    </div>
  );
}

// ---------- Section wrapper ----------
function Section({ icon: Icon, title, children, action }: {
  icon: any; title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/45">
          <Icon className="h-4 w-4" />
          <h3 className="text-xs font-semibold uppercase tracking-widest">{title}</h3>
        </div>
        {action}
      </div>
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">{children}</div>
    </div>
  );
}

// ---------- Main overlay ----------
export default function FocusOverlay() {
  const {
    isActive, currentTask, upNextTasks, exitFocus, setCurrentTaskById, reorderTasks,
    isPaused, setIsPaused, sessionStartTime, startSession,
    skipToNext, completeCurrentTask, updateCurrentTask,
  } = useFocusMode();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [fadeIn, setFadeIn] = useState(false);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH;
    const stored = parseInt(localStorage.getItem(SIDEBAR_KEY) || '', 10);
    return Number.isFinite(stored) && stored >= MIN_W && stored <= MAX_W ? stored : DEFAULT_WIDTH;
  });

  const aiChatRef = useRef<FocusAIChatHandle>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Persist sidebar width
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  // Fade in
  useEffect(() => {
    if (isActive) requestAnimationFrame(() => setFadeIn(true));
    else setFadeIn(false);
  }, [isActive]);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch assignee
  useEffect(() => {
    if (!currentTask?.assigned_to) { setAssigneeName(null); return; }
    supabase.from('profiles').select('full_name').eq('id', currentTask.assigned_to).single()
      .then(({ data }) => setAssigneeName(data?.full_name || null));
  }, [currentTask?.assigned_to]);

  const allTaskIds = useMemo(
    () => currentTask ? [currentTask.id, ...upNextTasks.map(t => t.id)] : upNextTasks.map(t => t.id),
    [currentTask, upNextTasks],
  );

  if (!isActive) return null;

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = allTaskIds.indexOf(active.id);
    const newIdx = allTaskIds.indexOf(over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const newOrder = arrayMove(allTaskIds, oldIdx, newIdx);
    if (newIdx === 0 && active.id !== currentTask?.id) {
      setCurrentTaskById(active.id);
    }
    reorderTasks(newOrder);
  };

  const currentPriority = PRIORITIES.find(p => p.value === currentTask?.priority) || PRIORITIES[3];

  // Keyboard shortcut handlers
  const handleNext = () => {
    if (!currentTask) return;
    const idx = allTaskIds.indexOf(currentTask.id);
    if (idx < allTaskIds.length - 1) setCurrentTaskById(allTaskIds[idx + 1]);
  };
  const handlePrev = () => {
    if (!currentTask) return;
    const idx = allTaskIds.indexOf(currentTask.id);
    if (idx > 0) setCurrentTaskById(allTaskIds[idx - 1]);
  };
  const handleTogglePlay = () => {
    if (!sessionStartTime) startSession();
    else setIsPaused(!isPaused);
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-[#0f1219] flex flex-col transition-opacity duration-500',
        fadeIn ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#3b82f6]" />
          <span className="text-xs text-white/55 font-medium tracking-wide uppercase">
            Shield Active · Notifications Muted
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50 font-mono">{format(currentTime, 'HH:mm')}</span>
          <button
            onClick={exitFocus}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Έξοδος Focus Mode (Esc)"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-8 pb-32">
          {currentTask ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Header */}
              <div className="space-y-3">
                {currentTask.project_name && (
                  <p className="text-xs text-white/45 uppercase tracking-widest font-medium">
                    {currentTask.project_name}
                  </p>
                )}
                <FocusEditableField
                  value={currentTask.title}
                  onSave={(v) => updateCurrentTask({ title: v })}
                  type="text"
                  placeholder="Task title…"
                  ariaLabel="Edit task title"
                  displayClassName="!px-0 !mx-0"
                  inputClassName="text-2xl md:text-3xl font-bold !py-2"
                  renderDisplay={(v) => (
                    <span className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                      {v}
                    </span>
                  )}
                />

                {/* Priority + Status quick selectors */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={currentTask.priority}
                    onValueChange={(v) => updateCurrentTask({ priority: v })}
                  >
                    <SelectTrigger className={cn(
                      'h-7 w-auto px-2.5 text-xs border bg-transparent gap-1.5',
                      currentPriority.color,
                    )}>
                      <Flag className="h-3 w-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={currentTask.status}
                    onValueChange={(v) => updateCurrentTask({ status: v })}
                  >
                    <SelectTrigger className="h-7 w-auto px-2.5 text-xs bg-white/10 border-white/15 text-white/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentTask.task_category && (
                    <Badge className="bg-white/10 text-white/70 border-0 text-xs">
                      {currentTask.task_category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Description (inline edit) */}
              <Section icon={FileText} title="Περιγραφή">
                <FocusEditableField
                  value={currentTask.description || ''}
                  onSave={(v) => updateCurrentTask({ description: v || null })}
                  type="textarea"
                  multiline
                  placeholder="Πρόσθεσε περιγραφή για αυτό το task…"
                  displayClassName="!px-0 !mx-0"
                  renderDisplay={(v) => (
                    <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{v}</p>
                  )}
                />
              </Section>

              {/* Properties */}
              <Section icon={Clock} title="Λεπτομέρειες">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-white/45 text-xs">Ανατέθηκε σε</span>
                    <div className="flex items-center gap-2 text-white/80">
                      <User className="h-3.5 w-3.5 text-white/50" />
                      <span>{assigneeName || <span className="text-white/40 italic">—</span>}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-white/45 text-xs">Ημ. Έναρξης</span>
                    <input
                      type="date"
                      value={currentTask.start_date || ''}
                      onChange={(e) => updateCurrentTask({ start_date: e.target.value || null })}
                      className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white/80 text-sm focus:border-[#3b82f6] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-white/45 text-xs">Προθεσμία</span>
                    <input
                      type="date"
                      value={currentTask.due_date || ''}
                      onChange={(e) => updateCurrentTask({ due_date: e.target.value || null })}
                      className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white/80 text-sm focus:border-[#3b82f6] outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-white/45 text-xs">Εκτίμηση (h)</span>
                    <FocusEditableField
                      value={currentTask.estimated_hours ?? ''}
                      onSave={(v) => updateCurrentTask({ estimated_hours: v ? Number(v) : null })}
                      type="number"
                      min={0}
                      step={0.25}
                      placeholder="0"
                      displayClassName="!px-0 !mx-0"
                      renderDisplay={(v) => (
                        <span className="inline-flex items-center gap-1.5 text-white/80">
                          <Clock className="h-3.5 w-3.5 text-white/50" />
                          {v}h
                          {currentTask.actual_hours != null && (
                            <span className="text-white/45 text-xs">/ {currentTask.actual_hours}h πραγμ.</span>
                          )}
                        </span>
                      )}
                    />
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex justify-between text-xs text-white/45">
                    <span>Πρόοδος</span>
                    <span>{currentTask.progress ?? 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={currentTask.progress ?? 0}
                    onChange={(e) => updateCurrentTask({ progress: Number(e.target.value) })}
                    className="w-full accent-[#3b82f6]"
                  />
                </div>
              </Section>

              {/* Time tracking */}
              <FocusTimeTrackingSection
                taskId={currentTask.id}
                projectId={currentTask.project_id}
              />

              {/* Subtasks */}
              <FocusSubtasksSection
                taskId={currentTask.id}
                projectId={currentTask.project_id}
              />

              {/* Files */}
              <FocusFilesSection
                taskId={currentTask.id}
                projectId={currentTask.project_id}
              />

              {/* Dependencies */}
              <FocusDependenciesSection taskId={currentTask.id} />

              {/* Comments */}
              <FocusCommentsSection taskId={currentTask.id} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-white/70">Δεν υπάρχουν tasks</h2>
                <p className="text-white/40">Προσθέστε tasks για να ξεκινήσετε το Focus Mode</p>
              </div>
            </div>
          )}
        </div>

        {/* Up Next sidebar (resizable) */}
        <div
          className="relative border-l border-white/10 bg-white/[0.025] backdrop-blur-xl flex flex-col shrink-0"
          style={{ width: sidebarWidth }}
        >
          <FocusSidebarResizer
            width={sidebarWidth}
            setWidth={setSidebarWidth}
            min={MIN_W}
            max={MAX_W}
          />
          <div className="px-4 py-4 border-b border-white/5">
            <h3 className="text-xs font-semibold text-white/55 uppercase tracking-widest">
              Up Next ({upNextTasks.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {upNextTasks.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={upNextTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {upNextTasks.map(task => (
                    <SortableSidebarTask
                      key={task.id}
                      task={task}
                      onSelect={() => setCurrentTaskById(task.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex items-center justify-center h-32 text-white/30 text-sm">
                Δεν υπάρχουν άλλα tasks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <FocusControlBar />

      {/* AI Chat */}
      {currentTask && (
        <FocusAIChat
          ref={aiChatRef}
          task={{
            id: currentTask.id,
            title: currentTask.title,
            description: currentTask.description,
            status: currentTask.status,
            priority: currentTask.priority,
            due_date: currentTask.due_date,
            project_id: currentTask.project_id,
            project_name: currentTask.project_name,
          }}
        />
      )}

      {/* Keyboard shortcuts */}
      <FocusKeyboardShortcuts
        onNext={handleNext}
        onPrev={handlePrev}
        onTogglePlay={handleTogglePlay}
        onComplete={completeCurrentTask}
        onSkip={skipToNext}
        onFocusChat={() => aiChatRef.current?.focusInput()}
      />
    </div>
  );
}
