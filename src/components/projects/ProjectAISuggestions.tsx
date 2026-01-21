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
  AlertCircle
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileContent {
  fileName: string;
  content: string;
}

interface ProjectSuggestion {
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

interface ProjectAISuggestionsProps {
  projectId: string;
  projectName: string;
  projectBudget?: number;
  files: FileContent[];
  onSuggestionsApplied?: () => void;
  onProjectDetailsUpdate?: (details: { description?: string; start_date?: string; end_date?: string; budget?: number }) => void;
}

export function ProjectAISuggestions({
  projectId,
  projectName,
  projectBudget,
  files,
  onSuggestionsApplied,
  onProjectDetailsUpdate
}: ProjectAISuggestionsProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion | null>(null);
  const [applying, setApplying] = useState(false);
  const [selectedDeliverables, setSelectedDeliverables] = useState<number[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    deliverables: true,
    tasks: true,
    invoices: true
  });

  // Notify parent about suggested project details when suggestions change
  useEffect(() => {
    if (suggestions?.suggestedProjectDetails && onProjectDetailsUpdate) {
      onProjectDetailsUpdate(suggestions.suggestedProjectDetails);
    }
  }, [suggestions, onProjectDetailsUpdate]);

  const parseLocalDateString = (dateStr: string): Date | null => {
    // Handles YYYY-MM-DD without timezone shifting.
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(dateStr);
    if (!m) return null;
    const [y, mo, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return isValid(dt) ? dt : null;
  };

  const safeFormatDate = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    const date = parseLocalDateString(dateStr) ?? (isValid(parseISO(dateStr)) ? parseISO(dateStr) : null);
    if (!date) return null;
    try {
      return format(date, 'd MMM yyyy', { locale: el });
    } catch {
      return null;
    }
  };

  const analyzeFiles = async () => {
    if (files.length === 0) {
      toast.error('Παρακαλώ ανεβάστε τουλάχιστον ένα αρχείο');
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-project-files', {
        body: {
          fileContents: files,
          projectName,
          projectBudget
        }
      });

      if (error) throw error;

      if (data.suggestions) {
        setSuggestions(data.suggestions);
        // Select all by default
        setSelectedDeliverables(data.suggestions.deliverables.map((_: any, i: number) => i));
        setSelectedTasks(data.suggestions.tasks.map((_: any, i: number) => i));
        setSelectedInvoices(data.suggestions.invoices.map((_: any, i: number) => i));
        toast.success('Η ανάλυση ολοκληρώθηκε!');
        
        // Auto-apply project details if callback exists
        if (data.suggestions.suggestedProjectDetails && onProjectDetailsUpdate) {
          onProjectDetailsUpdate(data.suggestions.suggestedProjectDetails);
          toast.info('Τα στοιχεία έργου ενημερώθηκαν από την AI ανάλυση');
        }
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

  const applySuggestions = async () => {
    if (!suggestions) return;

    // Check if projectId is valid
    if (!projectId || projectId.trim() === '') {
      toast.error('Παρακαλώ αποθηκεύστε πρώτα το έργο πριν εφαρμόσετε τις προτάσεις');
      return;
    }

    setApplying(true);
    try {
      // Create selected deliverables
      const deliverableIds: string[] = [];
      for (const idx of selectedDeliverables) {
        const d = suggestions.deliverables[idx];
        const { data, error } = await supabase
          .from('deliverables')
          .insert({
            project_id: projectId,
            name: d.name,
            description: d.description,
            due_date: d.due_date || null,
            budget: d.budget || null,
            completed: false
          })
          .select('id')
          .single();

        if (error) throw error;
        deliverableIds[idx] = data.id;
      }

      // Create selected tasks
      for (const idx of selectedTasks) {
        const t = suggestions.tasks[idx];
        const deliverableId = t.deliverable_index !== undefined && selectedDeliverables.includes(t.deliverable_index)
          ? deliverableIds[t.deliverable_index]
          : null;

        const { error } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            title: t.title,
            description: t.description,
            due_date: t.due_date || null,
            status: 'todo',
            deliverable_id: deliverableId
          });

        if (error) throw error;
      }

      // Create selected invoices
      for (const idx of selectedInvoices) {
        const inv = suggestions.invoices[idx];
        // Get client_id from project
        const { data: project } = await supabase
          .from('projects')
          .select('client_id')
          .eq('id', projectId)
          .single();

        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
        
        const { error } = await supabase
          .from('invoices')
          .insert({
            project_id: projectId,
            client_id: project?.client_id || null,
            invoice_number: invoiceNumber,
            amount: inv.amount,
            due_date: inv.due_date || null,
            issued_date: new Date().toISOString().split('T')[0],
            paid: false
          });

        if (error) throw error;
      }

      toast.success('Οι προτάσεις εφαρμόστηκαν!');
      setSuggestions(null);
      onSuggestionsApplied?.();
    } catch (error) {
      console.error('Error applying suggestions:', error);
      toast.error('Σφάλμα κατά την εφαρμογή προτάσεων');
    } finally {
      setApplying(false);
    }
  };

  const hasValidProjectId = projectId && projectId.trim() !== '';

  const toggleSection = (section: 'deliverables' | 'tasks' | 'invoices') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!suggestions) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
          <h3 className="font-semibold mb-2">AI Ανάλυση Αρχείων</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Ανεβάστε αρχεία (προκηρύξεις, συμβάσεις, RFPs) και το AI θα προτείνει 
            παραδοτέα, tasks και τιμολόγια αυτόματα.
          </p>
          <Button 
            onClick={analyzeFiles} 
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
          Προτάσεις AI
        </CardTitle>
        <CardDescription>
          {suggestions.projectSummary}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deliverables */}
        <Collapsible open={expandedSections.deliverables} onOpenChange={() => toggleSection('deliverables')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">Παραδοτέα ({suggestions.deliverables.length})</span>
              <Badge variant="secondary">{selectedDeliverables.length} επιλεγμένα</Badge>
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
                    {(() => {
                      const fd = safeFormatDate(d.due_date);
                      return fd ? <span>Προθεσμία: {fd}</span> : null;
                    })()}
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
                  {(() => {
                    const fd = safeFormatDate(t.due_date);
                    return fd ? (
                      <span className="text-xs text-muted-foreground">
                        Προθεσμία: {fd}
                      </span>
                    ) : null;
                  })()}
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
                    {(() => {
                      const fd = safeFormatDate(inv.due_date);
                      return fd ? (
                        <span className="text-muted-foreground">
                          Λήξη: {fd}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Warning if no project ID */}
        {!hasValidProjectId && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Πρέπει πρώτα να αποθηκεύσετε το έργο (tab "Στοιχεία" → "Δημιουργία") πριν εφαρμόσετε τις προτάσεις.
            </AlertDescription>
          </Alert>
        )}

        {/* Suggested Project Details */}
        {suggestions.suggestedProjectDetails && (
          <div className="p-3 rounded-lg border bg-primary/5 mt-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Προτεινόμενα Στοιχεία Έργου (εφαρμόστηκαν στη φόρμα)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {suggestions.suggestedProjectDetails.budget && (
                <span>Budget: €{suggestions.suggestedProjectDetails.budget.toLocaleString()}</span>
              )}
              {(() => {
                const fd = safeFormatDate(suggestions.suggestedProjectDetails.start_date);
                return fd ? <span>Έναρξη: {fd}</span> : null;
              })()}
              {(() => {
                const fd = safeFormatDate(suggestions.suggestedProjectDetails.end_date);
                return fd ? <span>Λήξη: {fd}</span> : null;
              })()}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={applySuggestions}
            disabled={applying || !hasValidProjectId || (selectedDeliverables.length === 0 && selectedTasks.length === 0 && selectedInvoices.length === 0)}
            className="flex-1"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Εφαρμογή...
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Εφαρμογή Επιλεγμένων
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSuggestions(null)}
            disabled={applying}
          >
            Ακύρωση
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
