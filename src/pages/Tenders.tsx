import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  DollarSign,
  Loader2,
  Trophy,
  X,
  Clock,
  Send,
  Edit3
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

export default function TendersPage() {
  const { isAdmin, isManager } = useAuth();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    stage: 'identification' as TenderStage,
    budget: '',
    submission_deadline: '',
  });

  useEffect(() => {
    fetchTenders();
    fetchClients();
  }, []);

  const fetchTenders = async () => {
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
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('tenders')
        .insert({
          name: formData.name,
          description: formData.description || null,
          client_id: formData.client_id || null,
          stage: formData.stage,
          budget: parseFloat(formData.budget) || 0,
          submission_deadline: formData.submission_deadline || null,
        })
        .select(`*, client:clients(name)`)
        .single();

      if (error) throw error;

      setTenders(prev => [data, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success('Ο διαγωνισμός δημιουργήθηκε!');
    } catch (error) {
      console.error('Error creating tender:', error);
      toast.error('Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  const updateTenderStage = async (tenderId: string, stage: TenderStage) => {
    try {
      const { error } = await supabase
        .from('tenders')
        .update({ stage })
        .eq('id', tenderId);

      if (error) throw error;

      setTenders(prev => prev.map(t => 
        t.id === tenderId ? { ...t, stage } : t
      ));

      toast.success('Η φάση ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating tender:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const resetForm = () => {
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
    const config = {
      identification: { icon: <Search className="h-3 w-3" />, label: 'Εντοπισμός', className: 'bg-muted text-muted-foreground' },
      preparation: { icon: <Edit3 className="h-3 w-3" />, label: 'Προετοιμασία', className: 'bg-primary/10 text-primary border-primary/20' },
      submitted: { icon: <Send className="h-3 w-3" />, label: 'Υποβλήθηκε', className: 'bg-accent/10 text-accent border-accent/20' },
      evaluation: { icon: <Clock className="h-3 w-3" />, label: 'Αξιολόγηση', className: 'bg-warning/10 text-warning border-warning/20' },
      won: { icon: <Trophy className="h-3 w-3" />, label: 'Κερδήθηκε', className: 'bg-success/10 text-success border-success/20' },
      lost: { icon: <X className="h-3 w-3" />, label: 'Απορρίφθηκε', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    };
    const { icon, label, className } = config[stage];
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1", className)}>
        {icon} {label}
      </Badge>
    );
  };

  const filteredTenders = tenders.filter(tender =>
    tender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tender.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by stage
  const stages: TenderStage[] = ['identification', 'preparation', 'submitted', 'evaluation', 'won', 'lost'];
  const groupedTenders = stages.reduce((acc, stage) => {
    acc[stage] = filteredTenders.filter(t => t.stage === stage);
    return acc;
  }, {} as Record<TenderStage, Tender[]>);

  const canManage = isAdmin || isManager;

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

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Νέος Διαγωνισμός
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέος Διαγωνισμός</DialogTitle>
                <DialogDescription>
                  Προσθέστε έναν νέο διαγωνισμό στο pipeline
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
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Δημιουργία
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Αναζήτηση διαγωνισμών..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pipeline Board */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 overflow-x-auto">
          {stages.map(stage => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between">
                {getStageBadge(stage)}
                <Badge variant="secondary">{groupedTenders[stage].length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedTenders[stage].map(tender => {
                  const isDeadlinePassed = tender.submission_deadline && isPast(new Date(tender.submission_deadline));
                  
                  return (
                    <Card key={tender.id} className={cn(
                      "hover:shadow-md transition-shadow",
                      isDeadlinePassed && stage !== 'won' && stage !== 'lost' && "border-warning/50"
                    )}>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-1 line-clamp-2">
                          {tender.name}
                        </h4>
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
                      </CardContent>
                    </Card>
                  );
                })}

                {groupedTenders[stage].length === 0 && (
                  <div className="border border-dashed rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Κανένας διαγωνισμός
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
