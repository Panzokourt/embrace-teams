import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTendersRealtime } from '@/hooks/useRealtimeSubscription';
import { useTenderToProject } from '@/hooks/useTenderToProject';
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
import { UnifiedViewToggle, type UnifiedViewMode } from '@/components/ui/unified-view-toggle';
import { InlineEditCell } from '@/components/shared/InlineEditCell';
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
  Trash2
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTender, setActiveTender] = useState<Tender | null>(null);
  const [editingTender, setEditingTender] = useState<Tender | null>(null);
  const [viewMode, setViewMode] = useState<UnifiedViewMode>('kanban');

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

  // Subscribe to realtime updates
  useTendersRealtime(fetchTenders);

  useEffect(() => {
    fetchTenders();
    fetchClients();
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
      <Card 
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer",
          isDeadlinePassed && tender.stage !== 'won' && tender.stage !== 'lost' && "border-warning/50",
          isDragOverlay && "shadow-xl rotate-2"
        )}
        onClick={() => !isDragOverlay && navigate(`/tenders/${tender.id}`)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0 cursor-grab" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <h4 className="font-medium text-sm mb-1 line-clamp-2 flex-1">
                  {tender.name}
                </h4>
                {canManage && !isDragOverlay && (
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEdit(tender)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDelete(tender.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {tender.client && (
                <p className="text-xs text-muted-foreground mb-2">
                  {tender.client.name}
                </p>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary font-medium">
                  €{tender.budget.toLocaleString()}
                </span>
                {tender.submission_deadline && (
                  <span className={cn(
                    "flex items-center gap-1",
                    isDeadlinePassed ? "text-warning" : "text-muted-foreground"
                  )}>
                    <Calendar className="h-3 w-3" />
                    {format(new Date(tender.submission_deadline), 'd/M', { locale: el })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredTenders.map(tender => (
        <Card 
          key={tender.id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate(`/tenders/${tender.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">{tender.name}</h3>
                {tender.client && (
                  <p className="text-sm text-muted-foreground">{tender.client.name}</p>
                )}
              </div>
              {getStageBadge(tender.stage)}
            </div>
            {tender.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{tender.description}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-primary">€{tender.budget.toLocaleString()}</span>
              {tender.submission_deadline && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(tender.submission_deadline), 'd MMM yyyy', { locale: el })}
                </span>
              )}
            </div>
            {canManage && (
              <div className="flex gap-2 mt-4 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => handleEdit(tender)}>
                  <Pencil className="h-3 w-3 mr-1" /> Επεξεργασία
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(tender.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Διαγραφή
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Τίτλος</TableHead>
            <TableHead>Πελάτης</TableHead>
            <TableHead>Φάση</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Deadline</TableHead>
            {canManage && <TableHead className="w-[100px]">Ενέργειες</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTenders.map(tender => (
            <TableRow 
              key={tender.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleEdit(tender)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <InlineEditCell
                  value={tender.name}
                  onSave={(val) => handleInlineUpdate(tender.id, 'name', val)}
                />
              </TableCell>
              <TableCell>{tender.client?.name || '-'}</TableCell>
              <TableCell>{getStageBadge(tender.stage)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <InlineEditCell
                  value={tender.budget}
                  type="number"
                  displayValue={`€${tender.budget.toLocaleString()}`}
                  onSave={(val) => handleInlineUpdate(tender.id, 'budget', val)}
                />
              </TableCell>
              <TableCell>
                {tender.submission_deadline 
                  ? format(new Date(tender.submission_deadline), 'd MMM yyyy', { locale: el })
                  : '-'
                }
              </TableCell>
              {canManage && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(tender)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(tender.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
        {stages.map(stage => (
          <div key={stage} className="space-y-3">
            <div className="flex items-center justify-between">
              {getStageBadge(stage)}
              <Badge variant="secondary">{tendersByStage[stage].length}</Badge>
            </div>
            <DroppableColumn
              id={stage}
              items={tendersByStage[stage].map(t => t.id)}
            >
              <div className="space-y-3">
                {tendersByStage[stage].map(tender => (
                  <DraggableCard key={tender.id} id={tender.id}>
                    <TenderCard tender={tender} />
                  </DraggableCard>
                ))}
                {tendersByStage[stage].length === 0 && (
                  <div className="border border-dashed rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Διαγωνισμοί
          </h1>
          <p className="text-muted-foreground mt-1">
            Παρακολούθηση pipeline διαγωνισμών
          </p>
        </div>

        <div className="flex items-center gap-3">
          <UnifiedViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode}
          />
          
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Νέος Διαγωνισμός
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTender ? 'Επεξεργασία Διαγωνισμού' : 'Νέος Διαγωνισμός'}</DialogTitle>
                  <DialogDescription>
                    {editingTender ? 'Ενημερώστε τα στοιχεία του διαγωνισμού' : 'Προσθέστε έναν νέο διαγωνισμό στο pipeline'}
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
                      <Select
                        value={formData.client_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      {editingTender ? 'Αποθήκευση' : 'Δημιουργία'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση διαγωνισμών..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {viewMode !== 'kanban' && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTenders.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν βρέθηκαν διαγωνισμοί</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || stageFilter !== 'all'
                ? 'Δοκιμάστε διαφορετικά φίλτρα αναζήτησης'
                : 'Δημιουργήστε τον πρώτο διαγωνισμό για να ξεκινήσετε'}
            </p>
          </CardContent>
        </Card>
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
