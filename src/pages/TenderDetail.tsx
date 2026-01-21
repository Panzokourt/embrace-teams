import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTenderToProject } from '@/hooks/useTenderToProject';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TenderAISuggestions } from '@/components/tenders/TenderAISuggestions';
import { TenderEvaluationCriteria } from '@/components/tenders/TenderEvaluationCriteria';
import { TenderTeamManager } from '@/components/tenders/TenderTeamManager';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Loader2,
  Sparkles,
  Upload,
  Save,
  Trophy,
  Search,
  Edit3,
  Send,
  X,
  Users,
  Target,
  TrendingUp
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
  updated_at: string;
  client?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

const stageConfig: Record<TenderStage, { icon: React.ReactNode; label: string; className: string }> = {
  identification: { icon: <Search className="h-4 w-4" />, label: 'Εντοπισμός', className: 'bg-muted text-muted-foreground' },
  preparation: { icon: <Edit3 className="h-4 w-4" />, label: 'Προετοιμασία', className: 'bg-primary/10 text-primary border-primary/20' },
  submitted: { icon: <Send className="h-4 w-4" />, label: 'Υποβλήθηκε', className: 'bg-accent/10 text-accent border-accent/20' },
  evaluation: { icon: <Clock className="h-4 w-4" />, label: 'Αξιολόγηση', className: 'bg-warning/10 text-warning border-warning/20' },
  won: { icon: <Trophy className="h-4 w-4" />, label: 'Κερδήθηκε', className: 'bg-success/10 text-success border-success/20' },
  lost: { icon: <X className="h-4 w-4" />, label: 'Απορρίφθηκε', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const { handleStageChange } = useTenderToProject();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    stage: 'identification' as TenderStage,
    budget: '',
    submission_deadline: '',
  });
  
  // AI Analysis state
  const [aiFiles, setAiFiles] = useState<Array<{ fileName: string; content: string }>>([]);
  const [uploadingForAi, setUploadingForAi] = useState(false);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    if (id) {
      fetchTenderData();
      fetchClients();
    }
  }, [id]);

  const fetchTenderData = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*, client:clients(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTender(data);
      
      // Populate form
      setFormData({
        name: data.name,
        description: data.description || '',
        client_id: data.client_id || '',
        stage: data.stage,
        budget: data.budget?.toString() || '',
        submission_deadline: data.submission_deadline || '',
      });
    } catch (error) {
      console.error('Error fetching tender:', error);
      toast.error('Σφάλμα κατά τη φόρτωση του διαγωνισμού');
      navigate('/tenders');
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

  // Handle AI file uploads
  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingForAi(true);
    const newFiles: Array<{ fileName: string; content: string }> = [];

    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        newFiles.push({ fileName: file.name, content: text });
      }
      setAiFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} αρχείο(α) έτοιμο για ανάλυση`);
    } catch (error) {
      console.error('Error reading files:', error);
      toast.error('Σφάλμα κατά την ανάγνωση αρχείων');
    } finally {
      setUploadingForAi(false);
      e.target.value = '';
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !canManage) return;

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id || null,
        stage: formData.stage,
        budget: parseFloat(formData.budget) || 0,
        submission_deadline: formData.submission_deadline || null,
      };

      const { error } = await supabase
        .from('tenders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Ο διαγωνισμός ενημερώθηκε!');
      fetchTenderData();
    } catch (error) {
      console.error('Error updating tender:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  // Handle stage change with conversion to project if won
  const handleStageChangeClick = async (newStage: TenderStage) => {
    if (!tender || !canManage) return;

    const success = await handleStageChange(
      tender.id,
      newStage,
      {
        id: tender.id,
        name: tender.name,
        description: tender.description,
        client_id: tender.client_id,
        budget: tender.budget,
        submission_deadline: tender.submission_deadline
      },
      (projectId) => {
        navigate(`/projects/${projectId}`);
      }
    );

    if (success) {
      setFormData(prev => ({ ...prev, stage: newStage }));
      fetchTenderData();
    }
  };

  // Handle project details update from AI
  const handleProjectDetailsUpdate = useCallback((details: {
    description?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      description: details.description || prev.description,
      budget: details.budget?.toString() || prev.budget,
      submission_deadline: details.end_date || prev.submission_deadline,
    }));
  }, []);

  // Handle suggestions applied - clear files
  const handleSuggestionsApplied = useCallback(() => {
    setAiFiles([]);
    toast.success('Οι προτάσεις αποθηκεύτηκαν για τη μετατροπή σε έργο');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Ο διαγωνισμός δεν βρέθηκε</p>
        <Button variant="link" onClick={() => navigate('/tenders')}>
          Επιστροφή στους διαγωνισμούς
        </Button>
      </div>
    );
  }

  const isDeadlinePassed = tender.submission_deadline && isPast(new Date(tender.submission_deadline));
  const config = stageConfig[tender.stage];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tenders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{tender.name}</h1>
            <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
              {config.icon} {config.label}
            </Badge>
          </div>
          {tender.client && (
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {tender.client.name}
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-xl font-bold">€{tender.budget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", isDeadlinePassed ? "bg-warning/10" : "bg-muted")}>
                <Calendar className={cn("h-5 w-5", isDeadlinePassed ? "text-warning" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className={cn("text-xl font-bold", isDeadlinePassed && "text-warning")}>
                  {tender.submission_deadline 
                    ? format(new Date(tender.submission_deadline), 'd MMM', { locale: el })
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Φάση</p>
                <p className="text-xl font-bold">{config.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Δημιουργία</p>
                <p className="text-xl font-bold">
                  {format(new Date(tender.created_at), 'd MMM', { locale: el })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Progress */}
      {canManage && tender.stage !== 'won' && tender.stage !== 'lost' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Αλλαγή Φάσης</CardTitle>
            <CardDescription>
              Επιλέξτε τη νέα φάση του διαγωνισμού
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(['identification', 'preparation', 'submitted', 'evaluation', 'won', 'lost'] as TenderStage[]).map(stage => {
                const stageConf = stageConfig[stage];
                const isActive = tender.stage === stage;
                return (
                  <Button
                    key={stage}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(!isActive && stageConf.className)}
                    onClick={() => handleStageChangeClick(stage)}
                    disabled={isActive}
                  >
                    {stageConf.icon}
                    <span className="ml-1">{stageConf.label}</span>
                  </Button>
                );
              })}
            </div>
            {(tender.stage as string) !== 'won' && (
              <p className="text-xs text-muted-foreground mt-3">
                💡 Αν ο διαγωνισμός κερδηθεί, θα δημιουργηθεί αυτόματα νέο έργο
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Στοιχεία</TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-1.5" />
            Ομάδα
          </TabsTrigger>
          <TabsTrigger value="evaluation">
            <Target className="h-4 w-4 mr-1.5" />
            Αξιολόγηση
          </TabsTrigger>
          <TabsTrigger value="ai-analysis">
            <Sparkles className="h-4 w-4 mr-1.5" />
            AI Ανάλυση
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Στοιχεία Διαγωνισμού</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Τίτλος *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    disabled={!canManage}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Περιγραφή</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    disabled={!canManage}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Πελάτης/Φορέας</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                      disabled={!canManage}
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
                      disabled={!canManage}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage">Φάση</Label>
                    <Select
                      value={formData.stage}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value as TenderStage }))}
                      disabled={!canManage}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="identification">Εντοπισμός</SelectItem>
                        <SelectItem value="preparation">Προετοιμασία</SelectItem>
                        <SelectItem value="submitted">Υποβλήθηκε</SelectItem>
                        <SelectItem value="evaluation">Αξιολόγηση</SelectItem>
                        <SelectItem value="won">Κερδήθηκε</SelectItem>
                        <SelectItem value="lost">Απορρίφθηκε</SelectItem>
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
                      disabled={!canManage}
                    />
                  </div>
                </div>

                {canManage && (
                  <div className="pt-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Αποθήκευση...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Αποθήκευση Αλλαγών
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <TenderTeamManager tenderId={tender.id} />
        </TabsContent>

        {/* Evaluation Tab */}
        <TabsContent value="evaluation">
          <TenderEvaluationCriteria tenderId={tender.id} />
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="ai-analysis" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Ανάλυση Διαγωνισμού
              </CardTitle>
              <CardDescription>
                Ανεβάστε αρχεία (προκηρύξεις, τεχνικές προδιαγραφές, RFPs) και το AI θα αναλύσει 
                τα παραδοτέα, το χρονοδιάγραμμα και τα οικονομικά. Οι προτάσεις θα χρησιμοποιηθούν 
                όταν ο διαγωνισμός μετατραπεί σε έργο.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload for AI */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="ai-file-upload" className="sr-only">Ανέβασμα αρχείων για AI</Label>
                  <Input
                    id="ai-file-upload"
                    type="file"
                    multiple
                    accept=".txt,.pdf,.doc,.docx,.rtf"
                    onChange={handleAiFileUpload}
                    disabled={uploadingForAi}
                    className="cursor-pointer"
                  />
                </div>
                {uploadingForAi && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>

              {/* Show uploaded files */}
              {aiFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {aiFiles.map((file, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      {file.fileName}
                      <button
                        onClick={() => setAiFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* AI Suggestions Component */}
              {aiFiles.length > 0 && (
                <TenderAISuggestions
                  tenderId={tender.id}
                  tenderName={tender.name}
                  tenderBudget={tender.budget}
                  files={aiFiles}
                  onSuggestionsApplied={handleSuggestionsApplied}
                  onTenderDetailsUpdate={handleProjectDetailsUpdate}
                />
              )}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Πώς λειτουργεί
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Ανεβάστε τα αρχεία του διαγωνισμού (προκήρυξη, τεχνικές προδιαγραφές)</li>
                <li>Πατήστε "Ανάλυση με AI" για να εξαχθούν τα παραδοτέα και οι εργασίες</li>
                <li>Επιλέξτε ποιες προτάσεις θέλετε να κρατήσετε</li>
                <li>Όταν ο διαγωνισμός κερδηθεί, οι προτάσεις θα εφαρμοστούν στο νέο έργο</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
