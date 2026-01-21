import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  ArrowRight,
  Building2,
  Briefcase,
  Globe,
  FileText,
  Upload,
  Sparkles,
  Users,
  Check,
  Loader2,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClientSelector } from '@/components/shared/ClientSelector';

type TenderType = 'public' | 'eu' | 'private';
type TenderStage = 'identification' | 'preparation' | 'submitted' | 'evaluation' | 'won' | 'lost';

interface Client {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface FileContent {
  fileName: string;
  content: string;
}

interface AISuggestion {
  deliverables: Array<{
    name: string;
    description: string;
    due_date?: string;
    budget?: number;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    due_date?: string;
    deliverable_index?: number;
  }>;
  invoices: Array<{
    description: string;
    amount: number;
    due_date?: string;
  }>;
  projectSummary: string;
  suggestedProjectDetails?: {
    description?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
  };
}

interface TenderCreationWizardProps {
  clients: Client[];
  profiles: Profile[];
  onComplete: (tenderId: string) => void;
  onCancel: () => void;
}

const tenderTypes = [
  {
    type: 'public' as TenderType,
    title: 'Δημόσιος Διαγωνισμός',
    description: 'Διαγωνισμοί δημοσίου τομέα (ΕΣΗΔΗΣ, ΚΗΜΔΗΣ)',
    icon: Building2,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  {
    type: 'eu' as TenderType,
    title: 'Ευρωπαϊκό Πρόγραμμα',
    description: 'Ευρωπαϊκά προγράμματα χρηματοδότησης',
    icon: Globe,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  },
  {
    type: 'private' as TenderType,
    title: 'Ιδιώτης B2B',
    description: 'Έργα για ιδιωτικούς πελάτες',
    icon: Briefcase,
    color: 'bg-green-500/10 text-green-500 border-green-500/20'
  }
];

const steps = [
  { id: 1, title: 'Τύπος', description: 'Επιλογή τύπου' },
  { id: 2, title: 'Στοιχεία', description: 'Βασικές πληροφορίες' },
  { id: 3, title: 'Αρχεία', description: 'Ανέβασμα εγγράφων' },
  { id: 4, title: 'AI Ανάλυση', description: 'Αυτόματη εξαγωγή' },
  { id: 5, title: 'Ομάδα', description: 'Ανάθεση χρηστών' },
  { id: 6, title: 'Επιβεβαίωση', description: 'Τελικός έλεγχος' }
];

export function TenderCreationWizard({ 
  clients, 
  profiles, 
  onComplete, 
  onCancel 
}: TenderCreationWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Form state
  const [tenderType, setTenderType] = useState<TenderType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    budget: '',
    submission_deadline: '',
    source_email: '',
    probability: '50'
  });
  
  // Files state
  const [files, setFiles] = useState<FileContent[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  
  const { parsing: uploading, parseFiles } = useDocumentParser({
    onSuccess: (parsedFiles) => {
      setFiles(prev => [...prev, ...parsedFiles.map(f => ({
        fileName: f.fileName,
        content: f.content
      }))]);
    }
  });
  
  // AI Suggestions
  const [suggestions, setSuggestions] = useState<AISuggestion | null>(null);
  const [selectedDeliverables, setSelectedDeliverables] = useState<number[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  
  // Team state
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  
  // UI state
  const [expandedSections, setExpandedSections] = useState({
    deliverables: true,
    tasks: true,
    invoices: false
  });

  const progress = (currentStep / steps.length) * 100;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Store raw files
    setRawFiles(prev => [...prev, ...Array.from(fileList)]);
    
    // Parse files using the hook
    const parsed = await parseFiles(fileList);
    
    if (parsed.length > 0) {
      toast.success(`${parsed.length} αρχείο(α) αναλύθηκαν`);
    }
    
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setRawFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeWithAI = async () => {
    if (files.length === 0) {
      toast.error('Παρακαλώ ανεβάστε τουλάχιστον ένα αρχείο');
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-project-files', {
        body: {
          fileContents: files,
          projectName: formData.name,
          projectBudget: parseFloat(formData.budget) || undefined
        }
      });

      if (error) throw error;

      if (data.suggestions) {
        setSuggestions(data.suggestions);
        setSelectedDeliverables(data.suggestions.deliverables.map((_: any, i: number) => i));
        setSelectedTasks(data.suggestions.tasks.map((_: any, i: number) => i));
        setSelectedInvoices(data.suggestions.invoices.map((_: any, i: number) => i));
        
        // Update form with AI suggestions
        if (data.suggestions.suggestedProjectDetails) {
          const details = data.suggestions.suggestedProjectDetails;
          setFormData(prev => ({
            ...prev,
            description: details.description || prev.description,
            budget: details.budget?.toString() || prev.budget,
            submission_deadline: details.end_date || prev.submission_deadline
          }));
        }
        
        toast.success('Η ανάλυση ολοκληρώθηκε!');
        setCurrentStep(5); // Move to team step
      }
    } catch (error: any) {
      console.error('Error analyzing files:', error);
      toast.error('Σφάλμα κατά την ανάλυση');
    } finally {
      setAnalyzing(false);
    }
  };

  const skipAIAnalysis = () => {
    setCurrentStep(5);
  };

  const handleSubmit = async () => {
    if (!tenderType) {
      toast.error('Παρακαλώ επιλέξτε τύπο διαγωνισμού');
      return;
    }

    setSaving(true);
    try {
      // Create tender
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .insert({
          name: formData.name,
          description: formData.description || null,
          client_id: formData.client_id || null,
          stage: 'identification' as TenderStage,
          budget: parseFloat(formData.budget) || 0,
          submission_deadline: formData.submission_deadline || null,
          tender_type: tenderType,
          source_email: formData.source_email || null,
          probability: parseInt(formData.probability) || 50
        })
        .select()
        .single();

      if (tenderError) throw tenderError;

      // Add team members
      if (selectedTeamMembers.length > 0) {
        const teamInserts = selectedTeamMembers.map(userId => ({
          tender_id: tender.id,
          user_id: userId,
          role: 'member'
        }));

        const { error: teamError } = await supabase
          .from('tender_team_access')
          .insert(teamInserts);

        if (teamError) {
          console.error('Error adding team members:', teamError);
        }
      }

      // Save AI suggestions if any
      if (suggestions) {
        const insertData: Array<{
          tender_id: string;
          suggestion_type: string;
          data: any;
          selected: boolean;
        }> = [];

        suggestions.deliverables.forEach((d, idx) => {
          insertData.push({
            tender_id: tender.id,
            suggestion_type: 'deliverable',
            data: d,
            selected: selectedDeliverables.includes(idx)
          });
        });

        suggestions.tasks.forEach((t, idx) => {
          insertData.push({
            tender_id: tender.id,
            suggestion_type: 'task',
            data: t,
            selected: selectedTasks.includes(idx)
          });
        });

        suggestions.invoices.forEach((inv, idx) => {
          insertData.push({
            tender_id: tender.id,
            suggestion_type: 'invoice',
            data: inv,
            selected: selectedInvoices.includes(idx)
          });
        });

        if (insertData.length > 0) {
          await supabase.from('tender_suggestions').insert(insertData);
        }
      }

      toast.success('Ο διαγωνισμός δημιουργήθηκε!');
      onComplete(tender.id);
    } catch (error) {
      console.error('Error creating tender:', error);
      toast.error('Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return tenderType !== null;
      case 2:
        return formData.name.trim() !== '';
      case 3:
        return true; // Files are optional
      case 4:
        return true; // AI analysis is optional
      case 5:
        return true; // Team is optional
      case 6:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 6 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Επιλέξτε Τύπο Διαγωνισμού</h2>
              <p className="text-muted-foreground text-sm">
                Ο τύπος καθορίζει το workflow και τα templates που θα χρησιμοποιηθούν
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              {tenderTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = tenderType === type.type;
                return (
                  <Card
                    key={type.type}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-soft",
                      isSelected && "ring-2 ring-primary border-primary"
                    )}
                    onClick={() => setTenderType(type.type)}
                  >
                    <CardContent className="p-6">
                      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-4", type.color)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-1">{type.title}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      {isSelected && (
                        <Badge className="mt-3" variant="secondary">
                          <Check className="h-3 w-3 mr-1" />
                          Επιλεγμένο
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Βασικά Στοιχεία</h2>
              <p className="text-muted-foreground text-sm">
                Συμπληρώστε τις βασικές πληροφορίες του διαγωνισμού
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Τίτλος *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="π.χ. Τουριστική Προβολή Ρόδου 2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Περιγραφή</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Σύντομη περιγραφή του έργου..."
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
                      // Parent will refresh clients list
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
                  <Label htmlFor="deadline">Deadline Υποβολής</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.submission_deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, submission_deadline: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probability">Πιθανότητα Επιτυχίας (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                  />
                </div>
              </div>

              {tenderType === 'private' && (
                <div className="space-y-2">
                  <Label htmlFor="source_email">Email Πηγής (προαιρετικό)</Label>
                  <Input
                    id="source_email"
                    type="email"
                    value={formData.source_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, source_email: e.target.value }))}
                    placeholder="client@example.com"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Ανέβασμα Αρχείων</h2>
              <p className="text-muted-foreground text-sm">
                Ανεβάστε αρχεία (προκηρύξεις, briefs, RFPs) για AI ανάλυση
              </p>
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".txt,.md,.pdf,.doc,.docx"
                onChange={handleFileUpload}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <span className="text-sm font-medium">
                  {uploading ? 'Ανέβασμα...' : 'Σύρετε αρχεία ή κάντε κλικ'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  TXT, MD, PDF, DOC, DOCX
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Ανεβασμένα Αρχεία ({files.length})</Label>
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.fileName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">AI Ανάλυση</h2>
              <p className="text-muted-foreground text-sm">
                Το AI θα αναλύσει τα αρχεία και θα εξάγει παραδοτέα, tasks και τιμολόγια
              </p>
            </div>

            {!suggestions ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sparkles className="h-16 w-16 text-primary/50 mb-4" />
                  <h3 className="font-semibold mb-2">
                    {files.length > 0 ? 'Έτοιμο για Ανάλυση' : 'Δεν υπάρχουν αρχεία'}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                    {files.length > 0
                      ? `${files.length} αρχεία έτοιμα για ανάλυση. Το AI θα εξάγει δομημένες πληροφορίες.`
                      : 'Μπορείτε να συνεχίσετε χωρίς AI ανάλυση ή να επιστρέψετε για upload αρχείων.'}
                  </p>
                  <div className="flex gap-3">
                    {files.length > 0 && (
                      <Button onClick={analyzeWithAI} disabled={analyzing}>
                        {analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Ανάλυση...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Ανάλυση με AI
                          </>
                        )}
                      </Button>
                    )}
                    <Button variant="outline" onClick={skipAIAnalysis}>
                      Παράλειψη
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Αποτελέσματα Ανάλυσης
                    </CardTitle>
                    <CardDescription>{suggestions.projectSummary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Deliverables */}
                    <Collapsible 
                      open={expandedSections.deliverables} 
                      onOpenChange={() => setExpandedSections(prev => ({ ...prev, deliverables: !prev.deliverables }))}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
                        <span className="font-medium">Παραδοτέα ({suggestions.deliverables.length})</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{selectedDeliverables.length} επιλεγμένα</Badge>
                          {expandedSections.deliverables ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {suggestions.deliverables.map((d, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border">
                            <Checkbox
                              checked={selectedDeliverables.includes(idx)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDeliverables(prev => [...prev, idx]);
                                } else {
                                  setSelectedDeliverables(prev => prev.filter(i => i !== idx));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{d.name}</p>
                              <p className="text-sm text-muted-foreground">{d.description}</p>
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Tasks */}
                    <Collapsible 
                      open={expandedSections.tasks} 
                      onOpenChange={() => setExpandedSections(prev => ({ ...prev, tasks: !prev.tasks }))}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
                        <span className="font-medium">Tasks ({suggestions.tasks.length})</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{selectedTasks.length} επιλεγμένα</Badge>
                          {expandedSections.tasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {suggestions.tasks.map((t, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border">
                            <Checkbox
                              checked={selectedTasks.includes(idx)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTasks(prev => [...prev, idx]);
                                } else {
                                  setSelectedTasks(prev => prev.filter(i => i !== idx));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{t.title}</p>
                              <p className="text-sm text-muted-foreground">{t.description}</p>
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Ομάδα Έργου</h2>
              <p className="text-muted-foreground text-sm">
                Επιλέξτε τα μέλη της ομάδας που θα εργαστούν στον διαγωνισμό
              </p>
            </div>

            <div className="grid gap-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                    selectedTeamMembers.includes(profile.id)
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/30"
                  )}
                  onClick={() => {
                    if (selectedTeamMembers.includes(profile.id)) {
                      setSelectedTeamMembers(prev => prev.filter(id => id !== profile.id));
                    } else {
                      setSelectedTeamMembers(prev => [...prev, profile.id]);
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedTeamMembers.includes(profile.id)}
                    onCheckedChange={() => {}}
                  />
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{profile.full_name || 'Χωρίς Όνομα'}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedTeamMembers.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedTeamMembers.length} μέλος/η επιλεγμένα
              </p>
            )}
          </div>
        );

      case 6:
        const selectedType = tenderTypes.find(t => t.type === tenderType);
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Επιβεβαίωση</h2>
              <p className="text-muted-foreground text-sm">
                Ελέγξτε τα στοιχεία πριν τη δημιουργία
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{formData.name}</CardTitle>
                  <CardDescription>{formData.description || 'Χωρίς περιγραφή'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Τύπος:</span>
                      <p className="font-medium">{selectedType?.title}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Προϋπολογισμός:</span>
                      <p className="font-medium">€{(parseFloat(formData.budget) || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deadline:</span>
                      <p className="font-medium">{formData.submission_deadline || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Πιθανότητα:</span>
                      <p className="font-medium">{formData.probability}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ομάδα:</span>
                      <p className="font-medium">{selectedTeamMembers.length} μέλη</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AI Προτάσεις:</span>
                      <p className="font-medium">
                        {suggestions 
                          ? `${selectedDeliverables.length} παραδοτέα, ${selectedTasks.length} tasks`
                          : 'Καμία'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            Βήμα {currentStep} από {steps.length}
          </span>
          <span className="text-sm font-medium">{steps[currentStep - 1].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center",
                step.id === currentStep && "text-primary",
                step.id < currentStep && "text-primary",
                step.id > currentStep && "text-muted-foreground/50"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                  step.id === currentStep && "border-primary bg-primary text-primary-foreground",
                  step.id < currentStep && "border-primary bg-primary/10 text-primary",
                  step.id > currentStep && "border-muted-foreground/30"
                )}
              >
                {step.id < currentStep ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : prevStep}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Ακύρωση' : 'Πίσω'}
        </Button>

        {currentStep < 6 ? (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Επόμενο
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Δημιουργία...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Δημιουργία Διαγωνισμού
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
