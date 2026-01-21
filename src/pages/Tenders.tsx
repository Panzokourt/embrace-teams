import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTendersRealtime } from '@/hooks/useRealtimeSubscription';
import { useTenderToProject } from '@/hooks/useTenderToProject';
import { TenderCreationWizard } from '@/components/tenders/TenderCreationWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UnifiedViewToggle, usePersistedViewMode, type UnifiedViewMode } from '@/components/ui/unified-view-toggle';
import { ClientSelector } from '@/components/shared/ClientSelector';
import { TendersTableView } from '@/components/tenders/TendersTableView';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  Loader2,
  Trophy,
  X,
  Clock,
  Send,
  Edit3,
  GripVertical,
  Pencil,
  Trash2,
  Wand2
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DraggableCard } from '@/components/dnd/DraggableCard';
import { DroppableColumn } from '@/components/dnd/DroppableColumn';

type TenderStage = 'identification' | 'preparation' | 'submitted' | 'evaluation' | 'won' | 'lost';

interface Tender {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  stage: TenderStage;
  budget: number;
  submission_deadline: string | null;
  created_at: string;
  client?: { name: string } | null;
}

const stageConfig: Record<TenderStage, { icon: React.ReactNode; label: string; className: string }> = {
  identification: { icon: <Search className="h-3 w-3" />, label: 'Εντοπισμός', className: 'bg-muted text-muted-foreground' },
  preparation: { icon: <Edit3 className="h-3 w-3" />, label: 'Προετοιμασία', className: 'bg-primary/10 text-primary border-primary/20' },
  submitted: { icon: <Send className="h-3 w-3" />, label: 'Υποβλήθηκε', className: 'bg-accent/10 text-accent border-accent/20' },
  evaluation: { icon: <Clock className="h-3 w-3" />, label: 'Αξιολόγηση', className: 'bg-warning/10 text-warning border-warning/20' },
  won: { icon: <Trophy className="h-3 w-3" />, label: 'Κερδήθηκε', className: 'bg-success/10 text-success border-success/20' },
  lost: { icon: <X className="h-3 w-3" />, label: 'Απορρίφθηκε', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function TendersPage() {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const { handleStageChange } = useTenderToProject();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTender, setActiveTender] = useState<Tender | null>(null);
  const [editingTender, setEditingTender] = useState<Tender | null>(null);
  const [viewMode, setViewMode] = usePersistedViewMode('tenders', 'kanban');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    stage: 'identification' as TenderStage,
    budget: '',
    submission_deadline: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTenders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select(`
          *,
          client:clients(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenders(data || []);
    } catch (error) {
      console.error('Error fetching tenders:', error);
      toast.error('Σφάλμα κατά τη φόρτωση διαγωνισμών');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      // Get active users from user_company_roles and join with profiles
      const { data: activeUsers, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('status', 'active');

      if (rolesError) throw rolesError;

      if (activeUsers && activeUsers.length > 0) {
        const userIds = activeUsers.map(u => u.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
          .order('full_name');

        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);
      } else {
        // Fallback: get all profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name');

        if (error) throw error;
        setProfiles(data || []);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  // Subscribe to realtime updates
  useTendersRealtime(fetchTenders);

  useEffect(() => {
    fetchTenders();
    fetchClients();
    fetchProfiles();
  }, [fetchTenders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const tenderData = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id || null,
        stage: formData.stage,
        budget: parseFloat(formData.budget) || 0,
        submission_deadline: formData.submission_deadline || null,
      };

      if (editingTender) {
        const { data, error } = await supabase
          .from('tenders')
          .update(tenderData)
          .eq('id', editingTender.id)
          .select(`*, client:clients(name)`)
          .single();

        if (error) throw error;
        setTenders(prev => prev.map(t => t.id === editingTender.id ? data : t));
        toast.success('Ο διαγωνισμός ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('tenders')
          .insert(tenderData)
          .select(`*, client:clients(name)`)
          .single();

        if (error) throw error;
        setTenders(prev => [data, ...prev]);
        toast.success('Ο διαγωνισμός δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tender:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tender: Tender) => {
    setEditingTender(tender);
    setFormData({
      name: tender.name,
      description: tender.description || '',
      client_id: tender.client_id || '',
      stage: tender.stage,
      budget: tender.budget?.toString() || '',
      submission_deadline: tender.submission_deadline || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (tenderId: string) => {
    try {
      const { error } = await supabase.from('tenders').delete().eq('id', tenderId);
      if (error) throw error;
      setTenders(prev => prev.filter(t => t.id !== tenderId));
      toast.success('Ο διαγωνισμός διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting tender:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const resetForm = () => {
    setEditingTender(null);
    setFormData({
      name: '',
      description: '',
      client_id: '',
      stage: 'identification',
      budget: '',
      submission_deadline: '',
    });
  };

  const getStageBadge = (stage: TenderStage) => {
    const config = stageConfig[stage];
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  const filteredTenders = useMemo(() => 
    tenders.filter(tender => {
      const matchesSearch = tender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tender.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || tender.stage === stageFilter;
      return matchesSearch && matchesStage;
    }), [tenders, searchQuery, stageFilter]
  );

  const stages: TenderStage[] = ['identification', 'preparation', 'submitted', 'evaluation', 'won', 'lost'];
  
  const tendersByStage = useMemo(() => 
    stages.reduce((acc, stage) => {
      acc[stage] = filteredTenders.filter(t => t.stage === stage);
      return acc;
    }, {} as Record<TenderStage, Tender[]>)
  , [filteredTenders]);

  const canManage = isAdmin || isManager;

  const handleDragStart = (event: DragStartEvent) => {
    const tender = tenders.find(t => t.id === event.active.id);
    setActiveTender(tender || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTender = tenders.find(t => t.id === activeId);
    if (!activeTender) return;

    if (stages.includes(overId as TenderStage)) {
      if (activeTender.stage !== overId) {
        setTenders(prev => prev.map(t =>
          t.id === activeId ? { ...t, stage: overId as TenderStage } : t
        ));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTender(null);
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedTender = tenders.find(t => t.id === activeId);
    if (!draggedTender) return;

    let targetStage: TenderStage | null = null;

    if (stages.includes(overId as TenderStage)) {
      targetStage = overId as TenderStage;
    } else {
      const overTender = tenders.find(t => t.id === overId);
      if (overTender) {
        targetStage = overTender.stage;
      }
    }

    if (targetStage && draggedTender.stage !== targetStage) {
      const success = await handleStageChange(
        activeId, 
        targetStage, 
        {
          id: draggedTender.id,
          name: draggedTender.name,
          description: draggedTender.description,
          client_id: draggedTender.client_id,
          budget: draggedTender.budget,
          submission_deadline: draggedTender.submission_deadline
        },
        (projectId) => {
          // Navigate to new project after creation
          navigate(`/projects/${projectId}`);
        }
      );

      if (!success) {
        fetchTenders();
      }
    }
  };

  const handleInlineUpdate = async (tenderId: string, field: string, value: string) => {
    try {
      let updateData: Record<string, unknown> = {};
      
      if (field === 'budget') {
        updateData[field] = parseFloat(value) || 0;
      } else {
        updateData[field] = value || null;
      }

      const { error } = await supabase
        .from('tenders')
        .update(updateData)
        .eq('id', tenderId);

      if (error) throw error;

      setTenders(prev => prev.map(t => 
        t.id === tenderId ? { ...t, ...updateData } : t
      ));
      toast.success('Ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating tender:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const TenderCard = ({ tender, isDragOverlay = false }: { tender: Tender; isDragOverlay?: boolean }) => {
    const isDeadlinePassed = tender.submission_deadline && isPast(new Date(tender.submission_deadline));
    
    return (
      <div 
        className={cn(
          "group bg-card rounded-xl border border-border/50 p-4 transition-all duration-200 ease-apple cursor-pointer",
          "hover:shadow-soft hover:border-border hover:-translate-y-0.5",
          isDeadlinePassed && tender.stage !== 'won' && tender.stage !== 'lost' && "border-warning/30 bg-warning/[0.02]",
          isDragOverlay && "shadow-soft-xl rotate-1 scale-105"
        )}
        onClick={() => !isDragOverlay && navigate(`/tenders/${tender.id}`)}
      >
        <div className="flex items-start gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 flex-shrink-0 cursor-grab transition-colors group-hover:text-muted-foreground/50" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm text-foreground/90 line-clamp-2 flex-1 group-hover:text-foreground transition-colors">
                {tender.name}
              </h4>
              {canManage && !isDragOverlay && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-secondary" onClick={() => handleEdit(tender)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(tender.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {tender.client && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                {tender.client.name}
              </p>
            )}
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-border/30">
              <span className="text-primary font-semibold">
                €{tender.budget.toLocaleString()}
              </span>
              {tender.submission_deadline && (
                <span className={cn(
                  "flex items-center gap-1",
                  isDeadlinePassed ? "text-warning" : "text-muted-foreground/60"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(tender.submission_deadline), 'd/M', { locale: el })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredTenders.map((tender, index) => (
        <div 
          key={tender.id} 
          className="group bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 ease-apple cursor-pointer hover:shadow-soft hover:border-border hover:-translate-y-0.5 animate-fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
          onClick={() => navigate(`/tenders/${tender.id}`)}
        >
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground/90 group-hover:text-foreground transition-colors">{tender.name}</h3>
                {tender.client && (
                  <p className="text-sm text-muted-foreground/70 mt-1">{tender.client.name}</p>
                )}
              </div>
              {getStageBadge(tender.stage)}
            </div>
            {tender.description && (
              <p className="text-sm text-muted-foreground/60 line-clamp-2 mb-3">{tender.description}</p>
            )}
          </div>
          <div className="px-5 py-3 bg-secondary/30 border-t border-border/30 flex items-center justify-between text-sm">
            <span className="font-semibold text-primary">€{tender.budget.toLocaleString()}</span>
            {tender.submission_deadline && (
              <span className="flex items-center gap-1.5 text-muted-foreground/60 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(tender.submission_deadline), 'd MMM yyyy', { locale: el })}
              </span>
            )}
          </div>
          {canManage && (
            <div className="px-5 py-3 bg-secondary/20 border-t border-border/20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleEdit(tender)}>
                <Pencil className="h-3 w-3 mr-1.5" /> Επεξεργασία
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(tender.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <TendersTableView
      tenders={filteredTenders}
      clients={clients}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onInlineUpdate={handleInlineUpdate}
      canManage={canManage}
    />
  );

  const renderKanbanView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((stage, columnIndex) => (
          <div 
            key={stage} 
            className="space-y-3 animate-fade-in"
            style={{ animationDelay: `${columnIndex * 50}ms` }}
          >
            <div className="flex items-center justify-between px-1">
              {getStageBadge(stage)}
              <span className="text-xs font-medium text-muted-foreground/60 bg-secondary/50 px-2 py-0.5 rounded-full">
                {tendersByStage[stage].length}
              </span>
            </div>
            <DroppableColumn
              id={stage}
              items={tendersByStage[stage].map(t => t.id)}
            >
              <div className="space-y-3 min-h-[200px]">
                {tendersByStage[stage].map(tender => (
                  <DraggableCard key={tender.id} id={tender.id}>
                    <TenderCard tender={tender} />
                  </DraggableCard>
                ))}
                {tendersByStage[stage].length === 0 && (
                  <div className="border-2 border-dashed border-border/30 rounded-xl p-6 text-center transition-colors hover:border-border/50 hover:bg-secondary/20">
                    <p className="text-xs text-muted-foreground/50">
                      Σύρετε εδώ
                    </p>
                  </div>
                )}
              </div>
            </DroppableColumn>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTender ? <TenderCard tender={activeTender} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </span>
            Διαγωνισμοί
          </h1>
          <p className="text-muted-foreground mt-1 text-sm ml-[52px]">
            Παρακολούθηση pipeline διαγωνισμών
          </p>
        </div>

        <div className="flex items-center gap-3">
          <UnifiedViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode}
          />
          
          {canManage && (
            <>
              {/* Wizard Button - Primary */}
              <Button className="shadow-soft" onClick={() => setWizardOpen(true)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Νέος Διαγωνισμός
              </Button>

              {/* Quick Add Dialog - For editing */}
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Επεξεργασία Διαγωνισμού</DialogTitle>
                    <DialogDescription className="text-sm">
                      Ενημερώστε τα στοιχεία του διαγωνισμού
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Τίτλος *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="π.χ. Τουριστική Προβολή Ρόδου"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Περιγραφή</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="client">Πελάτης/Φορέας</Label>
                        <ClientSelector
                          value={formData.client_id}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                          clients={clients}
                          onClientCreated={(newClient) => {
                            setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
                          }}
                          placeholder="Επιλέξτε"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="budget">Προϋπολογισμός (€)</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={formData.budget}
                          onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stage">Φάση</Label>
                        <Select
                          value={formData.stage}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value as TenderStage }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="identification">Εντοπισμός</SelectItem>
                            <SelectItem value="preparation">Προετοιμασία</SelectItem>
                            <SelectItem value="submitted">Υποβλήθηκε</SelectItem>
                            <SelectItem value="evaluation">Αξιολόγηση</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deadline">Deadline Υποβολής</Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={formData.submission_deadline}
                          onChange={(e) => setFormData(prev => ({ ...prev, submission_deadline: e.target.value }))}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                        Ακύρωση
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Αποθήκευση
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Wizard Full-Screen Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Δημιουργία Νέου Διαγωνισμού
            </DialogTitle>
            <DialogDescription>
              Ακολουθήστε τα βήματα για να δημιουργήσετε έναν νέο διαγωνισμό με AI ανάλυση
            </DialogDescription>
          </DialogHeader>
          <TenderCreationWizard
            clients={clients}
            profiles={profiles}
            onComplete={(tenderId) => {
              setWizardOpen(false);
              fetchTenders();
              navigate(`/tenders/${tenderId}`);
            }}
            onCancel={() => setWizardOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Αναζήτηση διαγωνισμών..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/50 focus:border-primary/30"
          />
        </div>
        {viewMode !== 'kanban' && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px] bg-card border-border/50">
              <SelectValue placeholder="Φάση" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι Φάσεις</SelectItem>
              <SelectItem value="identification">Εντοπισμός</SelectItem>
              <SelectItem value="preparation">Προετοιμασία</SelectItem>
              <SelectItem value="submitted">Υποβλήθηκε</SelectItem>
              <SelectItem value="evaluation">Αξιολόγηση</SelectItem>
              <SelectItem value="won">Κερδήθηκε</SelectItem>
              <SelectItem value="lost">Απορρίφθηκε</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground mt-3">Φόρτωση...</p>
        </div>
      ) : filteredTenders.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card py-16 animate-fade-in shadow-soft">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Δεν βρέθηκαν διαγωνισμοί</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              {searchQuery || stageFilter !== 'all'
                ? 'Δοκιμάστε διαφορετικά φίλτρα αναζήτησης'
                : 'Δημιουργήστε τον πρώτο διαγωνισμό για να ξεκινήσετε'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'card' && renderCardView()}
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'kanban' && renderKanbanView()}
        </>
      )}
    </div>
  );
}
