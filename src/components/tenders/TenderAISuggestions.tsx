import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Loader2, 
  Package, 
  CheckSquare, 
  Receipt,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Save,
  RefreshCw,
  MessageCircleQuestion,
  Lightbulb,
  Target,
  AlertCircle,
  Check,
  Trash2,
  Play
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Helper to safely format dates
const safeFormatDate = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return null;
    return format(date, 'd MMM yyyy', { locale: el });
  } catch {
    return null;
  }
};

interface FileContent {
  fileName: string;
  content: string;
}

interface AIQuestion {
  type: 'confirmation' | 'clarification' | 'suggestion';
  question: string;
  context?: string;
  answered?: boolean;
  answer?: string;
}

interface TenderSuggestion {
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
  aiQuestions?: AIQuestion[];
  analysisConfidence?: {
    deliverables: 'high' | 'medium' | 'low';
    tasks: 'high' | 'medium' | 'low';
    invoices: 'high' | 'medium' | 'low';
    dates: 'high' | 'medium' | 'low';
  };
  missingInfo?: string[];
}

type AnalysisFocus = 'all' | 'deliverables' | 'tasks' | 'invoices' | 'dates' | 'budget';

interface TenderAISuggestionsProps {
  tenderId: string;
  tenderName: string;
  tenderBudget?: number;
  files: FileContent[];
  onSuggestionsApplied?: () => void;
  onTenderDetailsUpdate?: (details: { description?: string; start_date?: string; end_date?: string; budget?: number }) => void;
  onDeliverablesCreated?: () => void;
  onTasksCreated?: () => void;
}

export function TenderAISuggestions({
  tenderId,
  tenderName,
  tenderBudget,
  files,
  onSuggestionsApplied,
  onTenderDetailsUpdate,
  onDeliverablesCreated,
  onTasksCreated
}: TenderAISuggestionsProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [suggestions, setSuggestions] = useState<TenderSuggestion | null>(null);
  const [selectedDeliverables, setSelectedDeliverables] = useState<number[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    deliverables: true,
    tasks: true,
    invoices: true,
    questions: true
  });
  const [existingSuggestions, setExistingSuggestions] = useState(false);
  
  // New states for enhanced analysis
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus>('all');
  const [userContext, setUserContext] = useState('');
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [showReanalysisOptions, setShowReanalysisOptions] = useState(false);

  // Check if tender already has saved suggestions
  useEffect(() => {
    checkExistingSuggestions();
  }, [tenderId]);

  const checkExistingSuggestions = async () => {
    try {
      const { count } = await supabase
        .from('tender_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('tender_id', tenderId);
      
      setExistingSuggestions((count || 0) > 0);
    } catch (error) {
      console.error('Error checking existing suggestions:', error);
    }
  };

  // Notify parent about suggested tender details when suggestions change
  useEffect(() => {
    if (suggestions?.suggestedProjectDetails && onTenderDetailsUpdate) {
      onTenderDetailsUpdate(suggestions.suggestedProjectDetails);
    }
  }, [suggestions, onTenderDetailsUpdate]);

  const analyzeFiles = async (isReanalysis = false, focusArea: AnalysisFocus = 'all') => {
    if (files.length === 0) {
      toast.error('Παρακαλώ ανεβάστε τουλάχιστον ένα αρχείο');
      return;
    }

    setAnalyzing(true);
    try {
      // Build context for reanalysis
      let additionalContext = userContext;
      if (isReanalysis && suggestions) {
        // Include currently selected items as context
        const selectedDeliverablesData = selectedDeliverables.map(i => suggestions.deliverables[i]);
        const selectedTasksData = selectedTasks.map(i => suggestions.tasks[i]);
        const selectedInvoicesData = selectedInvoices.map(i => suggestions.invoices[i]);
        
        additionalContext = `
ΣΗΜΑΝΤΙΚΟ - ΥΠΑΡΧΟΝΤΑ ΕΠΙΛΕΓΜΕΝΑ ΣΤΟΙΧΕΙΑ (ΝΑ ΔΙΑΤΗΡΗΘΟΥΝ):
${selectedDeliverablesData.length > 0 ? `Παραδοτέα: ${selectedDeliverablesData.map(d => d.name).join(', ')}` : ''}
${selectedTasksData.length > 0 ? `Tasks: ${selectedTasksData.map(t => t.title).join(', ')}` : ''}
${selectedInvoicesData.length > 0 ? `Τιμολόγια: ${selectedInvoicesData.map(i => i.description).join(', ')}` : ''}

Ψάξε για ΕΠΙΠΛΕΟΝ στοιχεία που μπορεί να έχασες στην πρώτη ανάλυση.
${userContext ? `\nΠρόσθετες οδηγίες χρήστη: ${userContext}` : ''}
`;
      }

      // Focus area instructions
      let focusInstructions = '';
      if (focusArea !== 'all') {
        const focusMap: Record<AnalysisFocus, string> = {
          all: '',
          deliverables: 'Εστίασε ΜΟΝΟ στην εύρεση παραδοτέων/φάσεων/πακέτων εργασίας.',
          tasks: 'Εστίασε ΜΟΝΟ στην εύρεση εργασιών/tasks/ενεργειών.',
          invoices: 'Εστίασε ΜΟΝΟ στην εύρεση πληρωμών/τιμολογίων/δόσεων.',
          dates: 'Εστίασε ΜΟΝΟ στην εύρεση ημερομηνιών/προθεσμιών/χρονοδιαγραμμάτων.',
          budget: 'Εστίασε ΜΟΝΟ στην εύρεση οικονομικών στοιχείων/budget/κόστους.'
        };
        focusInstructions = focusMap[focusArea];
      }

      const { data, error } = await supabase.functions.invoke('analyze-project-files', {
        body: {
          fileContents: files,
          projectName: tenderName,
          projectBudget: tenderBudget,
          additionalContext: additionalContext,
          focusArea: focusArea,
          focusInstructions: focusInstructions,
          isReanalysis: isReanalysis,
          requestQuestions: true // Request AI to ask questions
        }
      });

      if (error) throw error;

      if (data.suggestions) {
        if (isReanalysis && suggestions) {
          // Merge new suggestions with existing selected ones
          const mergedSuggestions = mergeSuggestions(suggestions, data.suggestions, {
            selectedDeliverables,
            selectedTasks,
            selectedInvoices
          });
          setSuggestions(mergedSuggestions);
          
          // Calculate new items
          const newDeliverables = mergedSuggestions.deliverables.length - suggestions.deliverables.length;
          const newTasks = mergedSuggestions.tasks.length - suggestions.tasks.length;
          const newInvoices = mergedSuggestions.invoices.length - suggestions.invoices.length;
          
          if (newDeliverables > 0 || newTasks > 0 || newInvoices > 0) {
            toast.success(`Βρέθηκαν νέα στοιχεία: ${newDeliverables > 0 ? `${newDeliverables} παραδοτέα, ` : ''}${newTasks > 0 ? `${newTasks} tasks, ` : ''}${newInvoices > 0 ? `${newInvoices} τιμολόγια` : ''}`);
          } else {
            toast.info('Δεν βρέθηκαν επιπλέον στοιχεία');
          }
        } else {
          setSuggestions(data.suggestions);
          setSelectedDeliverables(data.suggestions.deliverables.map((_: any, i: number) => i));
          setSelectedTasks(data.suggestions.tasks.map((_: any, i: number) => i));
          setSelectedInvoices(data.suggestions.invoices.map((_: any, i: number) => i));
          toast.success('Η ανάλυση ολοκληρώθηκε!');
        }
        
        // Handle AI questions
        if (data.suggestions.aiQuestions && data.suggestions.aiQuestions.length > 0) {
          setAiQuestions(data.suggestions.aiQuestions);
        } else {
          // Generate default questions based on analysis
          generateDefaultQuestions(data.suggestions);
        }
        
        if (data.suggestions.suggestedProjectDetails && onTenderDetailsUpdate) {
          onTenderDetailsUpdate(data.suggestions.suggestedProjectDetails);
          if (!isReanalysis) {
            toast.info('Τα στοιχεία διαγωνισμού ενημερώθηκαν από την AI ανάλυση');
          }
        }
        
        setShowReanalysisOptions(false);
      }
    } catch (error: any) {
      console.error('Error analyzing files:', error);
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Πολλές αιτήσεις. Περιμένετε λίγο και δοκιμάστε ξανά.');
      } else if (error.message?.includes('402')) {
        toast.error('Απαιτούνται credits. Προσθέστε credits στο workspace σας.');
      } else {
        toast.error('Σφάλμα κατά την ανάλυση αρχείων');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const generateDefaultQuestions = (sugg: TenderSuggestion) => {
    const questions: AIQuestion[] = [];
    
    // Confirmation question
    questions.push({
      type: 'confirmation',
      question: `Βρήκα ${sugg.deliverables.length} παραδοτέα, ${sugg.tasks.length} tasks και ${sugg.invoices.length} τιμολόγια. Είναι σωστά αυτά τα αποτελέσματα;`,
      context: 'Επιβεβαίωση αποτελεσμάτων ανάλυσης'
    });
    
    // Check for missing info
    if (!sugg.suggestedProjectDetails?.budget) {
      questions.push({
        type: 'clarification',
        question: 'Δεν βρήκα συγκεκριμένο budget στα αρχεία. Μπορείς να μου πεις τον προϋπολογισμό;',
        context: 'Ελλιπής πληροφορία: Προϋπολογισμός'
      });
    }
    
    if (!sugg.suggestedProjectDetails?.start_date || !sugg.suggestedProjectDetails?.end_date) {
      questions.push({
        type: 'clarification',
        question: 'Δεν βρήκα σαφείς ημερομηνίες έναρξης/λήξης. Μπορείς να τις διευκρινίσεις;',
        context: 'Ελλιπής πληροφορία: Χρονοδιάγραμμα'
      });
    }
    
    // Suggestions based on analysis
    if (sugg.deliverables.length > 0 && sugg.tasks.length < sugg.deliverables.length * 2) {
      questions.push({
        type: 'suggestion',
        question: 'Τα tasks φαίνονται λίγα σε σχέση με τα παραδοτέα. Θέλεις να κάνω πιο λεπτομερή ανάλυση για tasks;',
        context: 'Πρόταση βελτίωσης: Περισσότερα tasks'
      });
    }
    
    setAiQuestions(questions);
  };

  const mergeSuggestions = (
    existing: TenderSuggestion, 
    newSugg: TenderSuggestion,
    selected: { selectedDeliverables: number[], selectedTasks: number[], selectedInvoices: number[] }
  ): TenderSuggestion => {
    // Keep selected items from existing
    const keptDeliverables = selected.selectedDeliverables.map(i => existing.deliverables[i]);
    const keptTasks = selected.selectedTasks.map(i => existing.tasks[i]);
    const keptInvoices = selected.selectedInvoices.map(i => existing.invoices[i]);
    
    // Filter out duplicates from new suggestions
    const newDeliverables = newSugg.deliverables.filter(
      nd => !keptDeliverables.some(kd => kd.name.toLowerCase() === nd.name.toLowerCase())
    );
    const newTasks = newSugg.tasks.filter(
      nt => !keptTasks.some(kt => kt.title.toLowerCase() === nt.title.toLowerCase())
    );
    const newInvoices = newSugg.invoices.filter(
      ni => !keptInvoices.some(ki => ki.description.toLowerCase() === ni.description.toLowerCase())
    );
    
    // Merge and update selection indices
    const mergedDeliverables = [...keptDeliverables, ...newDeliverables];
    const mergedTasks = [...keptTasks, ...newTasks];
    const mergedInvoices = [...keptInvoices, ...newInvoices];
    
    // Auto-select all including new ones
    setSelectedDeliverables(mergedDeliverables.map((_, i) => i));
    setSelectedTasks(mergedTasks.map((_, i) => i));
    setSelectedInvoices(mergedInvoices.map((_, i) => i));
    
    return {
      ...newSugg,
      deliverables: mergedDeliverables,
      tasks: mergedTasks,
      invoices: mergedInvoices,
      projectSummary: newSugg.projectSummary || existing.projectSummary,
      suggestedProjectDetails: newSugg.suggestedProjectDetails || existing.suggestedProjectDetails
    };
  };

  const handleQuestionAnswer = (index: number, answer: string) => {
    setAiQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, answered: true, answer } : q
    ));
  };

  const saveSuggestions = async () => {
    if (!suggestions) return;

    setSaving(true);
    try {
      // First, delete any existing suggestions for this tender
      await supabase
        .from('tender_suggestions')
        .delete()
        .eq('tender_id', tenderId);

      const insertData: Array<{
        tender_id: string;
        suggestion_type: string;
        data: any;
        selected: boolean;
      }> = [];

      // Add deliverables
      suggestions.deliverables.forEach((d, idx) => {
        insertData.push({
          tender_id: tenderId,
          suggestion_type: 'deliverable',
          data: d,
          selected: selectedDeliverables.includes(idx)
        });
      });

      // Add tasks
      suggestions.tasks.forEach((t, idx) => {
        insertData.push({
          tender_id: tenderId,
          suggestion_type: 'task',
          data: t,
          selected: selectedTasks.includes(idx)
        });
      });

      // Add invoices
      suggestions.invoices.forEach((inv, idx) => {
        insertData.push({
          tender_id: tenderId,
          suggestion_type: 'invoice',
          data: inv,
          selected: selectedInvoices.includes(idx)
        });
      });

      const { error } = await supabase
        .from('tender_suggestions')
        .insert(insertData);

      if (error) throw error;

      toast.success('Οι προτάσεις αποθηκεύτηκαν!');
      toast.info('Θα εφαρμοστούν αυτόματα όταν ο διαγωνισμός κερδηθεί.');
      setExistingSuggestions(true);
      onSuggestionsApplied?.();
    } catch (error) {
      console.error('Error saving suggestions:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  // Apply suggestions directly to tender_deliverables and tender_tasks
  const applyToTender = async () => {
    if (!suggestions) return;

    setApplying(true);
    try {
      // Create a map to track deliverable names to IDs
      const deliverableIdMap = new Map<number, string>();

      // Insert selected deliverables
      if (selectedDeliverables.length > 0) {
        const deliverablesData = selectedDeliverables.map(idx => ({
          tender_id: tenderId,
          name: suggestions.deliverables[idx].name,
          description: suggestions.deliverables[idx].description || null,
          due_date: suggestions.deliverables[idx].due_date || null,
          budget: suggestions.deliverables[idx].budget || null,
          completed: false
        }));

        const { data: insertedDeliverables, error: delError } = await supabase
          .from('tender_deliverables')
          .insert(deliverablesData)
          .select('id');

        if (delError) throw delError;

        // Map deliverable indices to their new IDs
        if (insertedDeliverables) {
          selectedDeliverables.forEach((origIdx, insertIdx) => {
            if (insertedDeliverables[insertIdx]) {
              deliverableIdMap.set(origIdx, insertedDeliverables[insertIdx].id);
            }
          });
        }
      }

      // Insert selected tasks
      if (selectedTasks.length > 0) {
        const tasksData = selectedTasks.map(idx => {
          const task = suggestions.tasks[idx];
          let deliverableId: string | null = null;

          // Try to link task to deliverable if deliverable_index is specified
          if (task.deliverable_index !== undefined && deliverableIdMap.has(task.deliverable_index)) {
            deliverableId = deliverableIdMap.get(task.deliverable_index) || null;
          }

          return {
            tender_id: tenderId,
            title: task.title,
            description: task.description || null,
            due_date: task.due_date || null,
            status: 'todo',
            tender_deliverable_id: deliverableId
          };
        });

        const { error: taskError } = await supabase
          .from('tender_tasks')
          .insert(tasksData);

        if (taskError) throw taskError;
      }

      toast.success('Τα αποτελέσματα εφαρμόστηκαν στα tabs!');
      
      // Notify parent to refresh
      onDeliverablesCreated?.();
      onTasksCreated?.();
      
      // Save suggestions as well
      await saveSuggestions();
      
      setSuggestions(null);
    } catch (error) {
      console.error('Error applying to tender:', error);
      toast.error('Σφάλμα κατά την εφαρμογή');
    } finally {
      setApplying(false);
    }
  };

  // Delete existing suggestions
  const deleteExistingSuggestions = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tender_suggestions')
        .delete()
        .eq('tender_id', tenderId);

      if (error) throw error;

      toast.success('Οι αποθηκευμένες προτάσεις διαγράφηκαν!');
      setExistingSuggestions(false);
      setSuggestions(null);
    } catch (error) {
      console.error('Error deleting suggestions:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSection = (section: 'deliverables' | 'tasks' | 'invoices' | 'questions') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getConfidenceBadge = (level: 'high' | 'medium' | 'low' | undefined) => {
    if (!level) return null;
    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    const labels = { high: 'Υψηλή', medium: 'Μέτρια', low: 'Χαμηλή' };
    return <Badge className={colors[level]}>{labels[level]} βεβαιότητα</Badge>;
  };

  if (!suggestions) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
          <h3 className="font-semibold mb-2">AI Ανάλυση Διαγωνισμού</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Ανεβάστε αρχεία (προκηρύξεις, τεχνικές προδιαγραφές) και το AI θα εξάγει 
            παραδοτέα, tasks και πρόγραμμα πληρωμών.
          </p>
          
          {/* Focus area selection */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            <Button
              size="sm"
              variant={analysisFocus === 'all' ? 'default' : 'outline'}
              onClick={() => setAnalysisFocus('all')}
            >
              <Target className="h-3 w-3 mr-1" />
              Πλήρης
            </Button>
            <Button
              size="sm"
              variant={analysisFocus === 'deliverables' ? 'default' : 'outline'}
              onClick={() => setAnalysisFocus('deliverables')}
            >
              <Package className="h-3 w-3 mr-1" />
              Παραδοτέα
            </Button>
            <Button
              size="sm"
              variant={analysisFocus === 'dates' ? 'default' : 'outline'}
              onClick={() => setAnalysisFocus('dates')}
            >
              <FileText className="h-3 w-3 mr-1" />
              Ημ/νίες
            </Button>
            <Button
              size="sm"
              variant={analysisFocus === 'budget' ? 'default' : 'outline'}
              onClick={() => setAnalysisFocus('budget')}
            >
              <Receipt className="h-3 w-3 mr-1" />
              Budget
            </Button>
          </div>
          
          {existingSuggestions && (
            <div className="flex flex-col items-center gap-2 mb-3">
              <Badge variant="secondary">
                ✓ Υπάρχουν αποθηκευμένες προτάσεις
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={deleteExistingSuggestions}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                Διαγραφή αποθηκευμένων
              </Button>
            </div>
          )}
          <Button 
            onClick={() => analyzeFiles(false, analysisFocus)} 
            disabled={analyzing || files.length === 0}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ανάλυση...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Ανάλυση με AI ({files.length} αρχεία)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Προτάσεις AI για Διαγωνισμό
        </CardTitle>
        <CardDescription>
          {suggestions.projectSummary}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Questions Section */}
        {aiQuestions.length > 0 && (
          <Collapsible open={expandedSections.questions} onOpenChange={() => toggleSection('questions')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">Ερωτήσεις AI ({aiQuestions.length})</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {aiQuestions.filter(q => !q.answered).length} αναπάντητες
                </Badge>
              </div>
              {expandedSections.questions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {aiQuestions.map((q, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${q.answered ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200'}`}
                >
                  <div className="flex items-start gap-3">
                    {q.type === 'confirmation' && <Check className="h-5 w-5 text-blue-500 mt-0.5" />}
                    {q.type === 'clarification' && <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />}
                    {q.type === 'suggestion' && <Lightbulb className="h-5 w-5 text-purple-500 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{q.question}</p>
                      {q.context && (
                        <p className="text-xs text-muted-foreground mt-1">{q.context}</p>
                      )}
                      {q.answered ? (
                        <div className="mt-2 p-2 bg-background rounded text-sm">
                          <span className="text-muted-foreground">Απάντηση: </span>
                          {q.answer}
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          {q.type === 'confirmation' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleQuestionAnswer(idx, 'Ναι, σωστά')}>
                                <Check className="h-3 w-3 mr-1" /> Ναι
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleQuestionAnswer(idx, 'Όχι, χρειάζεται επανανάλυση')}>
                                Όχι
                              </Button>
                            </>
                          )}
                          {q.type === 'suggestion' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  handleQuestionAnswer(idx, 'Ναι, κάνε ανάλυση');
                                  setShowReanalysisOptions(true);
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" /> Ναι, κάνε το
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleQuestionAnswer(idx, 'Όχι ευχαριστώ')}>
                                Όχι
                              </Button>
                            </>
                          )}
                          {q.type === 'clarification' && (
                            <Button size="sm" variant="ghost" onClick={() => handleQuestionAnswer(idx, 'Θα συμπληρώσω χειροκίνητα')}>
                              Θα το συμπληρώσω
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Reanalysis Options */}
        {showReanalysisOptions && (
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Επανανάλυση Αρχείων</span>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Εστίαση σε:</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={analysisFocus === 'all' ? 'default' : 'outline'}
                  onClick={() => setAnalysisFocus('all')}
                >
                  Όλα
                </Button>
                <Button
                  size="sm"
                  variant={analysisFocus === 'tasks' ? 'default' : 'outline'}
                  onClick={() => setAnalysisFocus('tasks')}
                >
                  Tasks
                </Button>
                <Button
                  size="sm"
                  variant={analysisFocus === 'dates' ? 'default' : 'outline'}
                  onClick={() => setAnalysisFocus('dates')}
                >
                  Ημ/νίες
                </Button>
                <Button
                  size="sm"
                  variant={analysisFocus === 'budget' ? 'default' : 'outline'}
                  onClick={() => setAnalysisFocus('budget')}
                >
                  Budget
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Πρόσθετες οδηγίες (προαιρετικό):</Label>
              <Textarea
                placeholder="π.χ. Ψάξε για επιπλέον παραδοτέα στο κεφάλαιο 3..."
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => analyzeFiles(true, analysisFocus)} 
                disabled={analyzing}
                size="sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ανάλυση...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Επανανάλυση
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowReanalysisOptions(false)}
              >
                Ακύρωση
              </Button>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Αυτές οι προτάσεις θα εφαρμοστούν αυτόματα όταν ο διαγωνισμός κερδηθεί και μετατραπεί σε έργο.
          </AlertDescription>
        </Alert>

        {/* Deliverables */}
        <Collapsible open={expandedSections.deliverables} onOpenChange={() => toggleSection('deliverables')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">Παραδοτέα ({suggestions.deliverables.length})</span>
              <Badge variant="secondary">{selectedDeliverables.length} επιλεγμένα</Badge>
              {suggestions.analysisConfidence?.deliverables && getConfidenceBadge(suggestions.analysisConfidence.deliverables)}
            </div>
            {expandedSections.deliverables ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {suggestions.deliverables.map((d, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50"
              >
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
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    {safeFormatDate(d.due_date) && <span>Προθεσμία: {safeFormatDate(d.due_date)}</span>}
                    {d.budget && <span>Budget: €{d.budget.toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Tasks */}
        <Collapsible open={expandedSections.tasks} onOpenChange={() => toggleSection('tasks')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-success" />
              <span className="font-medium">Tasks ({suggestions.tasks.length})</span>
              <Badge variant="secondary">{selectedTasks.length} επιλεγμένα</Badge>
              {suggestions.analysisConfidence?.tasks && getConfidenceBadge(suggestions.analysisConfidence.tasks)}
            </div>
            {expandedSections.tasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {suggestions.tasks.map((t, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50"
              >
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
                  {safeFormatDate(t.due_date) && (
                    <span className="text-xs text-muted-foreground">
                      Προθεσμία: {safeFormatDate(t.due_date)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Invoices */}
        <Collapsible open={expandedSections.invoices} onOpenChange={() => toggleSection('invoices')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-warning" />
              <span className="font-medium">Τιμολόγια ({suggestions.invoices.length})</span>
              <Badge variant="secondary">{selectedInvoices.length} επιλεγμένα</Badge>
              {suggestions.analysisConfidence?.invoices && getConfidenceBadge(suggestions.analysisConfidence.invoices)}
            </div>
            {expandedSections.invoices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {suggestions.invoices.map((inv, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedInvoices.includes(idx)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedInvoices(prev => [...prev, idx]);
                    } else {
                      setSelectedInvoices(prev => prev.filter(i => i !== idx));
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium">{inv.description}</p>
                  <div className="flex gap-4 mt-1 text-sm">
                    <span className="text-primary font-medium">€{inv.amount.toLocaleString()}</span>
                    {safeFormatDate(inv.due_date) && (
                      <span className="text-muted-foreground">
                        Λήξη: {safeFormatDate(inv.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Suggested Tender Details */}
        {suggestions.suggestedProjectDetails && (
          <div className="p-3 rounded-lg border bg-primary/5 mt-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Προτεινόμενα Στοιχεία (εφαρμόστηκαν στη φόρμα)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {suggestions.suggestedProjectDetails.budget && (
                <span>Budget: €{suggestions.suggestedProjectDetails.budget.toLocaleString()}</span>
              )}
              {safeFormatDate(suggestions.suggestedProjectDetails.start_date) && (
                <span>Έναρξη: {safeFormatDate(suggestions.suggestedProjectDetails.start_date)}</span>
              )}
              {safeFormatDate(suggestions.suggestedProjectDetails.end_date) && (
                <span>Λήξη: {safeFormatDate(suggestions.suggestedProjectDetails.end_date)}</span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t">
          {/* Primary action - Apply to tabs */}
          <Button
            onClick={applyToTender}
            disabled={applying || saving || (selectedDeliverables.length === 0 && selectedTasks.length === 0)}
            className="w-full"
            size="lg"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Εφαρμογή...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Εφαρμογή στα Tabs ({selectedDeliverables.length} παραδοτέα, {selectedTasks.length} tasks)
              </>
            )}
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={saveSuggestions}
              disabled={saving || applying || (selectedDeliverables.length === 0 && selectedTasks.length === 0 && selectedInvoices.length === 0)}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Μόνο Αποθήκευση
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReanalysisOptions(true)}
              disabled={saving || analyzing || applying}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Επανανάλυση
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSuggestions(null)}
              disabled={saving || applying}
            >
              Ακύρωση
            </Button>
          </div>
        </div>

        {/* Info about difference */}
        <p className="text-xs text-muted-foreground mt-2">
          💡 <strong>Εφαρμογή:</strong> Δημιουργεί αμέσως παραδοτέα/tasks στα αντίστοιχα tabs. 
          <strong> Αποθήκευση:</strong> Κρατάει τις προτάσεις για μετατροπή σε έργο.
        </p>
      </CardContent>
    </Card>
  );
}
