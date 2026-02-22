import { useState, useEffect } from 'react';
import { X, Shield, Calendar, ChevronRight, FileText, CheckCircle2, Circle, Clock, User, FolderOpen, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFocusMode } from '@/contexts/FocusContext';
import FocusControlBar from './FocusControlBar';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---------- Types ----------
interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface TaskFile {
  id: string;
  file_name: string;
  file_path: string;
  content_type: string | null;
  file_size: number | null;
}

// ---------- Sidebar Task ----------
function SortableSidebarTask({ task, onSelect }: {
  task: { id: string; title: string; project_name?: string; due_date: string | null; priority: string };
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 touch-none
        opacity-40 hover:opacity-100 hover:bg-white/5 ${isDragging ? 'opacity-70 z-50' : ''}`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project_name && <span className="text-xs text-white/40">{task.project_name}</span>}
          {task.due_date && (
            <span className="text-xs text-white/30">· {format(new Date(task.due_date), 'd/MM')}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
    </div>
  );
}

// ---------- Section Wrapper ----------
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-white/40">
        <Icon className="h-4 w-4" />
        <h3 className="text-xs font-semibold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">{children}</div>
    </div>
  );
}

// ---------- Main Overlay ----------
export default function FocusOverlay() {
  const { isActive, currentTask, upNextTasks, exitFocus, setCurrentTaskById, reorderTasks } = useFocusMode();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fadeIn, setFadeIn] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Fade in
  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => setFadeIn(true));
    } else {
      setFadeIn(false);
    }
  }, [isActive]);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch subtasks, files, assignee when task changes
  useEffect(() => {
    if (!currentTask) { setSubtasks([]); setFiles([]); setAssigneeName(null); return; }

    const fetchDetails = async () => {
      const [subRes, fileRes] = await Promise.all([
        supabase.from('tasks').select('id, title, status, priority').eq('parent_task_id', currentTask.id).order('created_at'),
        supabase.from('file_attachments').select('id, file_name, file_path, content_type, file_size').eq('task_id', currentTask.id),
      ]);
      setSubtasks((subRes.data || []) as Subtask[]);
      setFiles((fileRes.data || []) as TaskFile[]);

      if (currentTask.assigned_to) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', currentTask.assigned_to).single();
        setAssigneeName(profile?.full_name || null);
      } else {
        setAssigneeName(null);
      }
    };
    fetchDetails();
  }, [currentTask?.id]);

  if (!isActive) return null;

  const allTaskIds = currentTask
    ? [currentTask.id, ...upNextTasks.map(t => t.id)]
    : upNextTasks.map(t => t.id);

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

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-white/10 text-white/60',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    done: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0f1219] flex flex-col transition-opacity duration-500 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Status Shield */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#3b82f6]" />
          <span className="text-xs text-white/50 font-medium tracking-wide uppercase">Shield Active · Notifications Muted</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/40 font-mono">{format(currentTime, 'HH:mm')}</span>
          <button
            onClick={exitFocus}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Έξοδος Focus Mode"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center workspace */}
        <div className="flex-1 overflow-y-auto p-8 pb-32">
          {currentTask ? (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="space-y-3">
                {currentTask.project_name && (
                  <p className="text-sm text-white/30 uppercase tracking-widest font-medium">
                    {currentTask.project_name}
                  </p>
                )}
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  {currentTask.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${priorityColors[currentTask.priority] || priorityColors.low} border-0 text-xs`}>
                    {currentTask.priority}
                  </Badge>
                  <Badge className="bg-white/10 text-white/60 border-0 text-xs">{currentTask.status}</Badge>
                  {currentTask.task_category && (
                    <Badge className="bg-white/10 text-white/60 border-0 text-xs">{currentTask.task_category}</Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {currentTask.description && (
                <Section icon={FileText} title="Περιγραφή">
                  <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{currentTask.description}</p>
                </Section>
              )}

              {/* Properties Grid */}
              <Section icon={Clock} title="Λεπτομέρειες">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {assigneeName && (
                    <div className="space-y-1">
                      <span className="text-white/30 text-xs">Ανατέθηκε σε</span>
                      <div className="flex items-center gap-2 text-white/70">
                        <User className="h-3.5 w-3.5" />
                        <span>{assigneeName}</span>
                      </div>
                    </div>
                  )}
                  {currentTask.start_date && (
                    <div className="space-y-1">
                      <span className="text-white/30 text-xs">Ημ. Έναρξης</span>
                      <div className="flex items-center gap-2 text-white/70">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(new Date(currentTask.start_date), 'd MMM yyyy', { locale: el })}</span>
                      </div>
                    </div>
                  )}
                  {currentTask.due_date && (
                    <div className="space-y-1">
                      <span className="text-white/30 text-xs">Προθεσμία</span>
                      <div className="flex items-center gap-2 text-white/70">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(new Date(currentTask.due_date), 'd MMM yyyy', { locale: el })}</span>
                      </div>
                    </div>
                  )}
                  {currentTask.estimated_hours != null && (
                    <div className="space-y-1">
                      <span className="text-white/30 text-xs">Εκτίμηση</span>
                      <div className="flex items-center gap-2 text-white/70">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{currentTask.estimated_hours}h{currentTask.actual_hours != null ? ` / ${currentTask.actual_hours}h πραγμ.` : ''}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {currentTask.progress != null && currentTask.progress > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-white/30">
                      <span>Πρόοδος</span>
                      <span>{currentTask.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#3b82f6] transition-all duration-500"
                        style={{ width: `${currentTask.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Section>

              {/* Subtasks */}
              {subtasks.length > 0 && (
                <Section icon={ListChecks} title={`Subtasks (${subtasks.length})`}>
                  <div className="space-y-2">
                    {subtasks.map(st => {
                      const isCompleted = st.status === 'completed' || st.status === 'done';
                      return (
                        <div key={st.id} className="flex items-center gap-3 py-1.5">
                          {isCompleted
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            : <Circle className="h-4 w-4 text-white/20 shrink-0" />
                          }
                          <span className={`text-sm flex-1 ${isCompleted ? 'text-white/30 line-through' : 'text-white/70'}`}>
                            {st.title}
                          </span>
                          <Badge className={`${priorityColors[st.priority] || priorityColors.low} border-0 text-[10px] py-0`}>
                            {st.priority}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Files */}
              {files.length > 0 && (
                <Section icon={FolderOpen} title={`Αρχεία (${files.length})`}>
                  <div className="space-y-2">
                    {files.map(f => (
                      <div key={f.id} className="flex items-center gap-3 py-1.5">
                        <FileText className="h-4 w-4 text-white/30 shrink-0" />
                        <span className="text-sm text-white/70 flex-1 truncate">{f.file_name}</span>
                        {f.file_size && (
                          <span className="text-xs text-white/30">{formatFileSize(f.file_size)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-white/60">Δεν υπάρχουν tasks</h2>
                <p className="text-white/30">Προσθέστε tasks για να ξεκινήσετε το Focus Mode</p>
              </div>
            </div>
          )}
        </div>

        {/* Up Next Sidebar - always visible */}
        <div className="w-72 border-l border-white/10 bg-white/[0.02] backdrop-blur-xl flex flex-col shrink-0">
          <div className="px-4 py-4 border-b border-white/5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Up Next</h3>
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
              <div className="flex items-center justify-center h-32 text-white/20 text-sm">
                Δεν υπάρχουν άλλα tasks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <FocusControlBar />
    </div>
  );
}
