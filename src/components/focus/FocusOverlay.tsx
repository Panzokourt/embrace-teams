import { useState, useEffect } from 'react';
import { X, Shield, Clock, Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFocusMode } from '@/contexts/FocusContext';
import FocusControlBar from './FocusControlBar';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSidebarTask({ task, isCurrent, onSelect }: {
  task: { id: string; title: string; project_name?: string; due_date: string | null; priority: string };
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 touch-none ${
        isCurrent ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-100 hover:bg-white/5'
      } ${isDragging ? 'opacity-70 z-50' : ''}`}
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

export default function FocusOverlay() {
  const { isActive, currentTask, upNextTasks, exitFocus, setCurrentTaskById, reorderTasks } = useFocusMode();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fadeIn, setFadeIn] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => setFadeIn(true));
    } else {
      setFadeIn(false);
    }
  }, [isActive]);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
    // If dragged to position 0, make it the current task
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
          <span className="text-sm text-white/40 font-mono">
            {format(currentTime, 'HH:mm')}
          </span>
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
        <div className="flex-1 flex items-center justify-center p-8">
          {currentTask ? (
            <div className="max-w-xl w-full text-center space-y-6">
              {/* Project name */}
              {currentTask.project_name && (
                <p className="text-sm text-white/30 uppercase tracking-widest font-medium">
                  {currentTask.project_name}
                </p>
              )}

              {/* Task title */}
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                {currentTask.title}
              </h1>

              {/* Meta row */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Badge className={`${priorityColors[currentTask.priority] || priorityColors.low} border-0 text-xs`}>
                  {currentTask.priority}
                </Badge>
                {currentTask.due_date && (
                  <div className="flex items-center gap-1.5 text-white/40">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-xs">{format(new Date(currentTask.due_date), 'd MMM yyyy', { locale: el })}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {currentTask.description && (
                <p className="text-white/40 text-base leading-relaxed max-w-md mx-auto">
                  {currentTask.description}
                </p>
              )}

              {/* Progress */}
              {currentTask.progress != null && currentTask.progress > 0 && (
                <div className="max-w-xs mx-auto space-y-2">
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
            </div>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white/60">Δεν υπάρχουν tasks</h2>
              <p className="text-white/30">Προσθέστε tasks για να ξεκινήσετε το Focus Mode</p>
            </div>
          )}
        </div>

        {/* Up Next Sidebar */}
        {upNextTasks.length > 0 && (
          <div className="w-72 border-l border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col">
            <div className="px-4 py-4 border-b border-white/5">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Up Next</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={upNextTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {upNextTasks.map(task => (
                    <SortableSidebarTask
                      key={task.id}
                      task={task}
                      isCurrent={false}
                      onSelect={() => setCurrentTaskById(task.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <FocusControlBar />
    </div>
  );
}
