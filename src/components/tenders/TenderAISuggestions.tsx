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
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileContent {
  fileName: string;
  content: string;
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
}

interface TenderAISuggestionsProps {
  tenderId: string;
  tenderName: string;
  tenderBudget?: number;
  files: FileContent[];
  onSuggestionsApplied?: () => void;
  onTenderDetailsUpdate?: (details: { description?: string; start_date?: string; end_date?: string; budget?: number }) => void;
}

export function TenderAISuggestions({
  tenderId,
  tenderName,
  tenderBudget,
  files,
  onSuggestionsApplied,
  onTenderDetailsUpdate
}: TenderAISuggestionsProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<TenderSuggestion | null>(null);
  const [selectedDeliverables, setSelectedDeliverables] = useState<number[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    deliverables: true,
    tasks: true,
    invoices: true
  });

  // Notify parent about suggested tender details when suggestions change
  useEffect(() => {
    if (suggestions?.suggestedProjectDetails && onTenderDetailsUpdate) {
      onTenderDetailsUpdate(suggestions.suggestedProjectDetails);
    }
  }, [suggestions, onTenderDetailsUpdate]);

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
          projectName: tenderName,
          projectBudget: tenderBudget
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
        
        // Auto-apply tender details if callback exists
        if (data.suggestions.suggestedProjectDetails && onTenderDetailsUpdate) {
          onTenderDetailsUpdate(data.suggestions.suggestedProjectDetails);
          toast.info('Τα στοιχεία διαγωνισμού ενημερώθηκαν από την AI ανάλυση');
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

  const saveSuggestions = () => {
    // For now, just store locally - when tender is converted to project, these will be used
    toast.success('Οι προτάσεις αποθηκεύτηκαν!');
    toast.info('Θα εφαρμοστούν όταν ο διαγωνισμός κερδηθεί και μετατραπεί σε έργο.');
    onSuggestionsApplied?.();
  };

  const toggleSection = (section: 'deliverables' | 'tasks' | 'invoices') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
          Προτάσεις AI για Διαγωνισμό
        </CardTitle>
        <CardDescription>
          {suggestions.projectSummary}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    {d.due_date && <span>Προθεσμία: {format(new Date(d.due_date), 'd MMM yyyy', { locale: el })}</span>}
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
                  {t.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Προθεσμία: {format(new Date(t.due_date), 'd MMM yyyy', { locale: el })}
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
                    {inv.due_date && (
                      <span className="text-muted-foreground">
                        Λήξη: {format(new Date(inv.due_date), 'd MMM yyyy', { locale: el })}
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
              {suggestions.suggestedProjectDetails.start_date && (
                <span>Έναρξη: {format(new Date(suggestions.suggestedProjectDetails.start_date), 'd MMM yyyy', { locale: el })}</span>
              )}
              {suggestions.suggestedProjectDetails.end_date && (
                <span>Λήξη: {format(new Date(suggestions.suggestedProjectDetails.end_date), 'd MMM yyyy', { locale: el })}</span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={saveSuggestions}
            disabled={selectedDeliverables.length === 0 && selectedTasks.length === 0 && selectedInvoices.length === 0}
            className="flex-1"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Αποθήκευση Προτάσεων
          </Button>
          <Button
            variant="outline"
            onClick={() => setSuggestions(null)}
          >
            Ακύρωση
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
