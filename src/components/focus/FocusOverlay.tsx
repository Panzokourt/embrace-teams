import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Shield, ChevronRight, FileText, ListChecks, User, Flag, GripVertical, Building2, Package, ChevronsRight } from 'lucide-react';
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
import FocusDependenciesSection from './sections/FocusDependenciesSection';
import FocusEntityDrawer, { type EntityDrawerPayload } from './FocusEntityDrawer';
import FocusSidebarSearch from './FocusSidebarSearch';
import { format } from 'date-fns';
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
          isCurrent ? 'text-white' : 'text-white/90',
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project_name && (
            <span className="text-[11px] text-white/65 truncate">{task.project_name}</span>
          )}
          {task.due_date && (
            <span className="text-[11px] text-white/50">· {format(new Date(task.due_date), 'd/MM')}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white/70 shrink-0" />
    </div>
  );
}

// ---------- Section wrapper ----------
function Section({ icon: Icon, title, children, action, contentClassName }: {
  icon: any; title: string; children: React.ReactNode; action?: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/70">
          <Icon className="h-4 w-4" />
          <h3 className="text-[13px] font-semibold uppercase tracking-widest">{title}</h3>
        </div>
        {action}
      </div>
      <div className={cn('bg-white/[0.04] border border-white/10 rounded-xl p-4', contentClassName)}>
        {children}
      </div>
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
  const [drawerPayload, setDrawerPayload] = useState<EntityDrawerPayload>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH;
    const stored = parseInt(localStorage.getItem(SIDEBAR_KEY) || '', 10);
    return Number.isFinite(stored) && stored >= MIN_W && stored <= MAX_W ? stored : DEFAULT_WIDTH;
  });

  const aiChatRef = useRef<FocusAIChatHandle>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (isActive) requestAnimationFrame(() => setFadeIn(true));
    else setFadeIn(false);
  }, [isActive]);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
          <span className="text-xs text-white/65 font-medium tracking-wide uppercase">
            Shield Active · Notifications Muted
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/65 font-mono">{format(currentTime, 'HH:mm')}</span>
          <button
            onClick={exitFocus}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Έξοδος Focus Mode (Esc)"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace */}
        <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
          {currentTask ? (
            <div className="max-w-[1500px] mx-auto space-y-6">
              {/* Header — full-width */}
              <div className="space-y-3">
                {/* Project name + breadcrumb chips */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px]">
                  {currentTask.project_name && (
                    <span className="text-white/65 uppercase tracking-widest font-medium">
                      {currentTask.project_name}
                    </span>
                  )}
                  {(currentTask.client_name || currentTask.deliverable_name) && (
                    <ChevronsRight className="h-3.5 w-3.5 text-white/30" />
                  )}
                  {currentTask.client_name && currentTask.client_id && (
                    <button
                      onClick={() => setDrawerPayload({ type: 'client', id: currentTask.client_id! })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-white/85 hover:text-white transition-colors"
                    >
                      <Building2 className="h-3 w-3 text-[#3b82f6]" />
                      <span>{currentTask.client_name}</span>
                    </button>
                  )}
                  {currentTask.deliverable_name && currentTask.deliverable_id && (
                    <button
                      onClick={() => setDrawerPayload({ type: 'deliverable', id: currentTask.deliverable_id! })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-white/85 hover:text-white transition-colors"
                    >
                      <Package className="h-3 w-3 text-[#3b82f6]" />
                      <span>{currentTask.deliverable_name}</span>
                    </button>
                  )}
                </div>

                <FocusEditableField
                  value={currentTask.title}
                  onSave={(v) => updateCurrentTask({ title: v })}
                  type="text"
                  placeholder="Task title…"
                  ariaLabel="Edit task title"
                  displayClassName="!px-0 !mx-0"
                  inputClassName="text-3xl font-bold !py-2"
                  renderDisplay={(v) => (
                    <span className="text-3xl font-bold text-white tracking-tight leading-tight">
                      {v}
                    </span>
                  )}
                />

                {/* Priority + Status */}
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
                    <SelectTrigger className="h-7 w-auto px-2.5 text-xs bg-white/10 border-white/15 text-white/90">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentTask.task_category && (
                    <Badge className="bg-white/10 text-white/80 border-0 text-xs">
                      {currentTask.task_category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 items-start">
                {/* LEFT — Details + Description + Subtasks + Files */}
                <div className="space-y-6 min-w-0">
                  {/* Details (μετακινήθηκε αριστερά κάτω από τίτλο) */}
                  <Section icon={User} title="Λεπτομέρειες">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[15px]">
                      <DetailItem label="Ανατέθηκε σε">
                        <span className="inline-flex items-center gap-2 text-white">
                          <User className="h-4 w-4 text-white/55" />
                          <span>{assigneeName || <span className="text-white/50 italic">—</span>}</span>
                        </span>
                      </DetailItem>

                      <DetailItem label="Ημ. Έναρξης">
                        <input
                          type="date"
                          value={currentTask.start_date ? currentTask.start_date.slice(0, 10) : ''}
                          onChange={(e) => updateCurrentTask({ start_date: e.target.value || null })}
                          className="bg-white/[0.06] border border-white/15 rounded-lg px-3 py-1.5 text-white text-[15px] focus:border-[#3b82f6] outline-none w-full max-w-[200px]"
                        />
                      </DetailItem>

                      <DetailItem label="Προθεσμία">
                        <input
                          type="date"
                          value={currentTask.due_date ? currentTask.due_date.slice(0, 10) : ''}
                          onChange={(e) => updateCurrentTask({ due_date: e.target.value || null })}
                          className="bg-white/[0.06] border border-white/15 rounded-lg px-3 py-1.5 text-white text-[15px] focus:border-[#3b82f6] outline-none w-full max-w-[200px]"
                        />
                      </DetailItem>

                      <DetailItem label="Εκτίμηση (h)">
                        <FocusEditableField
                          value={currentTask.estimated_hours ?? ''}
                          onSave={(v) => updateCurrentTask({ estimated_hours: v ? Number(v) : null })}
                          type="number"
                          min={0}
                          step={0.25}
                          placeholder="0"
                          displayClassName="!px-0 !mx-0"
                          renderDisplay={(v) => (
                            <span className="inline-flex items-center gap-2 text-white">
                              <span className="font-medium">{v}h</span>
                              {currentTask.actual_hours != null && Number(currentTask.actual_hours) > 0 && (
                                <span className="text-white/55 text-[13px]">/ {currentTask.actual_hours}h πραγμ.</span>
                              )}
                            </span>
                          )}
                        />
                      </DetailItem>
                    </div>
                  </Section>

                  {/* Dependencies (compact, only renders if any) */}
                  <FocusDependenciesSection taskId={currentTask.id} />

                  {/* Description */}
                  <Section icon={FileText} title="Περιγραφή">
                    <FocusEditableField
                      value={currentTask.description || ''}
                      onSave={(v) => updateCurrentTask({ description: v || null })}
                      type="textarea"
                      multiline
                      placeholder="Πρόσθεσε περιγραφή για αυτό το task…"
                      displayClassName="!px-0 !mx-0"
                      renderDisplay={(v) => (
                        <p className="text-white/85 text-[15px] leading-relaxed whitespace-pre-wrap">{v}</p>
                      )}
                    />
                  </Section>

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
                </div>

                {/* RIGHT — Comments only, full-height */}
                <div className="min-w-0 xl:sticky xl:top-2">
                  <div className="min-h-[700px]">
                    <FocusCommentsSection taskId={currentTask.id} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-white/80">Δεν υπάρχουν tasks</h2>
                <p className="text-white/55">Προσθέστε tasks για να ξεκινήσετε το Focus Mode</p>
              </div>
            </div>
          )}
        </div>

        {/* Up Next sidebar */}
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

          {/* Smart search header (replaces simple title) */}
          <FocusSidebarSearch onActiveChange={setSearchActive} />

          {/* Up Next list (hidden when search has a query active) */}
          {!searchActive && (
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
                <div className="flex items-center justify-center h-32 text-white/45 text-sm">
                  Δεν υπάρχουν άλλα tasks
                </div>
              )}
            </div>
          )}
          {searchActive && <div className="flex-1" />}
        </div>
      </div>

      {/* Control Bar (with Ask AI trigger) */}
      <FocusControlBar onAskAI={() => aiChatRef.current?.open()} />

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

      {/* Entity drawer for client/deliverable */}
      <FocusEntityDrawer payload={drawerPayload} onClose={() => setDrawerPayload(null)} />
    </div>
  );
}

// ---------- Helpers ----------
function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-h-[44px]">
      <span className="block text-white/65 text-[13px]">{label}</span>
      <div className="text-white">{children}</div>
    </div>
  );
}
