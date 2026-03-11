import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentParser, ParsedFile } from '@/hooks/useDocumentParser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Sparkles, Loader2, Package, CheckSquare, Receipt,
  FileText, ChevronDown, ChevronUp, Upload, RefreshCw, Check,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, isValid, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

const sanitizeDate = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  // Must match YYYY-MM-DD with valid numbers
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? dateStr : null;
};

interface ProjectSuggestion {
  deliverables: Array<{ name: string; description: string; due_date?: string; budget?: number }>;
  tasks: Array<{ title: string; description: string; due_date?: string; deliverable_index?: number }>;
  invoices: Array<{ description: string; amount: number; due_date?: string }>;
  projectSummary: string;
  suggestedProjectDetails?: { description?: string; start_date?: string; end_date?: string; budget?: number };
}

interface ProjectAIAnalysisInlineProps {
  projectId: string;
  projectName: string;
  projectBudget?: number;
  /** Pre-uploaded File objects (from wizard step 1) */
  initialFiles?: File[];
  /** Allow uploading more files */
  allowUpload?: boolean;
  onDone?: () => void;
  onProjectDetailsUpdate?: (details: { description?: string; start_date?: string; end_date?: string; budget?: number }) => void;
}

export function ProjectAIAnalysisInline({
  projectId,
  projectName,
  projectBudget,
  initialFiles = [],
  allowUpload = true,
  onDone,
  onProjectDetailsUpdate,
}: ProjectAIAnalysisInlineProps) {
  const [aiInstructions, setAiInstructions] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion | null>(null);
  const [selectedDeliverables, setSelectedDeliverables] = useState<number[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState({ deliverables: true, tasks: true, invoices: true });
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { parseFiles, parsing } = useDocumentParser({ projectId, saveToStorage: true });

  const allFiles = [...initialFiles, ...extraFiles];

  const parseLocalDate = (dateStr: string): Date | null => {
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(dateStr);
    if (!m) return null;
    const [y, mo, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return isValid(dt) ? dt : null;
  };

  const safeFormatDate = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    const date = parseLocalDate(dateStr) ?? (isValid(parseISO(dateStr)) ? parseISO(dateStr) : null);
    if (!date) return null;
    try { return format(date, 'd MMM yyyy', { locale: el }); } catch { return null; }
  };

  const handleAnalyze = useCallback(async () => {
    if (allFiles.length === 0) {
      // Try to get already-uploaded files from DB
      const { data: existingFiles } = await supabase
        .from('file_attachments')
        .select('id, file_name, file_path')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!existingFiles || existingFiles.length === 0) {
        toast.error('Δεν υπάρχουν αρχεία για ανάλυση');
        return;
      }

      // Download and parse existing files from storage
      setAnalyzing(true);
      try {
        const fileContents: Array<{ fileName: string; content: string }> = [];
        for (const f of existingFiles) {
          const { data: blob } = await supabase.storage.from('project-files').download(f.file_path);
          if (blob) {
            const file = new File([blob], f.file_name, { type: blob.type });
            const parsed = await parseFiles([file]);
            if (parsed.length > 0) {
              fileContents.push({ fileName: parsed[0].fileName, content: parsed[0].content });
            }
          }
        }

        if (fileContents.length === 0) {
          toast.error('Δεν ήταν δυνατή η ανάγνωση των αρχείων');
          return;
        }

        await runAnalysis(fileContents);
      } catch (err) {
        console.error('Error analyzing existing files:', err);
        toast.error('Σφάλμα κατά την ανάλυση');
      } finally {
        setAnalyzing(false);
      }
      return;
    }

    setAnalyzing(true);
    try {
      // Parse files client-side
      const parsed = await parseFiles(allFiles);
      if (parsed.length === 0) {
        toast.error('Δεν ήταν δυνατή η ανάγνωση των αρχείων');
        return;
      }

      const fileContents = parsed.map(p => ({ fileName: p.fileName, content: p.content }));
      await runAnalysis(fileContents);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Σφάλμα κατά την ανάλυση');
    } finally {
      setAnalyzing(false);
    }
  }, [allFiles, projectId, projectName, projectBudget, aiInstructions]);

  const runAnalysis = async (fileContents: Array<{ fileName: string; content: string }>) => {
    const { data, error } = await supabase.functions.invoke('analyze-project-files', {
      body: {
        fileContents,
        projectName,
        projectBudget,
        projectId,
        focusInstructions: aiInstructions || undefined,
      },
    });

    if (error) throw error;

    if (data?.suggestions) {
      setSuggestions(data.suggestions);
      setSelectedDeliverables(data.suggestions.deliverables.map((_: any, i: number) => i));
      setSelectedTasks(data.suggestions.tasks.map((_: any, i: number) => i));
      setSelectedInvoices(data.suggestions.invoices.map((_: any, i: number) => i));
      toast.success('Η ανάλυση ολοκληρώθηκε!');

      if (data.suggestions.suggestedProjectDetails) {
        onProjectDetailsUpdate?.(data.suggestions.suggestedProjectDetails);
      }
    }
  };

  const applySuggestions = async () => {
    if (!suggestions || !projectId) return;
    setApplying(true);
    try {
      const deliverableIds: string[] = [];
      for (const idx of selectedDeliverables) {
        const d = suggestions.deliverables[idx];
        const { data, error } = await supabase
          .from('deliverables')
          .insert({ project_id: projectId, name: d.name, description: d.description, due_date: sanitizeDate(d.due_date), budget: d.budget || null, completed: false })
          .select('id').single();
        if (error) throw error;
        deliverableIds[idx] = data.id;
      }

      for (const idx of selectedTasks) {
        const t = suggestions.tasks[idx];
        const deliverableId = t.deliverable_index !== undefined && selectedDeliverables.includes(t.deliverable_index)
          ? deliverableIds[t.deliverable_index] : null;
        const { error } = await supabase
          .from('tasks')
          .insert({ project_id: projectId, title: t.title, description: t.description, due_date: sanitizeDate(t.due_date), status: 'todo', deliverable_id: deliverableId });
        if (error) throw error;
      }

      for (const idx of selectedInvoices) {
        const inv = suggestions.invoices[idx];
        const { data: project } = await supabase.from('projects').select('client_id').eq('id', projectId).single();
        const { error } = await supabase
          .from('invoices')
          .insert({
            project_id: projectId, client_id: project?.client_id || null,
            invoice_number: `INV-${Date.now().toString().slice(-6)}`,
            amount: inv.amount, due_date: sanitizeDate(inv.due_date),
            issued_date: new Date().toISOString().split('T')[0], paid: false,
          });
        if (error) throw error;
      }

      // Update project details if suggested
      if (suggestions.suggestedProjectDetails) {
        const details = suggestions.suggestedProjectDetails;
        const updateData: any = {};
        if (details.description) updateData.description = details.description;
        if (sanitizeDate(details.start_date)) updateData.start_date = sanitizeDate(details.start_date);
        if (sanitizeDate(details.end_date)) updateData.end_date = sanitizeDate(details.end_date);
        if (details.budget && details.budget > 0) updateData.budget = details.budget;
        if (Object.keys(updateData).length > 0) {
          await supabase.from('projects').update(updateData).eq('id', projectId);
        }
      }

      toast.success('Οι προτάσεις εφαρμόστηκαν!');
      setSuggestions(null);
      onDone?.();
    } catch (err) {
      console.error('Error applying suggestions:', err);
      toast.error('Σφάλμα κατά την εφαρμογή');
    } finally {
      setApplying(false);
    }
  };

  const toggleSection = (section: 'deliverables' | 'tasks' | 'invoices') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isLoading = analyzing || parsing;

  // Before analysis
  if (!suggestions) {
    return (
      <div className="space-y-4 py-2">
        <div className="text-center py-3">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-sm font-medium">AI Ανάλυση Αρχείων</p>
          <p className="text-xs text-muted-foreground mt-1">
            {allFiles.length > 0
              ? `${allFiles.length} αρχείο(α) έτοιμα για ανάλυση`
              : 'Θα αναλυθούν τα αρχεία του έργου'}
          </p>
        </div>

        {allowUpload && (
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => { if (e.target.files) setExtraFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
              accept=".txt,.md,.csv,.pdf,.doc,.docx,.xls,.xlsx,.pptx" />
            <Button type="button" variant="outline" size="sm" className="w-full border-dashed"
              onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-2" />
              Προσθήκη Αρχείων
            </Button>
            {extraFiles.length > 0 && (
              <div className="space-y-1">
                {extraFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-secondary/50 text-xs">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate flex-1">{file.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5"
                      onClick={() => setExtraFiles(prev => prev.filter((_, idx) => idx !== i))}>×</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <Label className="text-xs">Οδηγίες AI (προαιρετικό)</Label>
          <Textarea value={aiInstructions} onChange={e => setAiInstructions(e.target.value)}
            placeholder="π.χ. Ψάξε για budget, ημερομηνίες παράδοσης, deliverables..."
            rows={3} className="mt-1 text-sm" />
        </div>

        <Button className="w-full" onClick={handleAnalyze} disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {parsing ? 'Ανάγνωση αρχείων...' : 'Ανάλυση...'}</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Εκκίνηση Ανάλυσης</>
          )}
        </Button>
      </div>
    );
  }

  // After analysis — show results
  return (
    <div className="space-y-3">
      <div className="text-center pb-2">
        <p className="text-sm font-medium">{suggestions.projectSummary}</p>
      </div>

      {/* Deliverables */}
      <Collapsible open={expandedSections.deliverables} onOpenChange={() => toggleSection('deliverables')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-foreground" />
            <span className="font-medium text-sm">Παραδοτέα ({suggestions.deliverables.length})</span>
            <Badge variant="secondary" className="text-[10px]">{selectedDeliverables.length} επιλεγμένα</Badge>
          </div>
          {expandedSections.deliverables ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1.5 mt-1">
          {suggestions.deliverables.map((d, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 text-sm">
              <Checkbox checked={selectedDeliverables.includes(idx)}
                onCheckedChange={checked => {
                  if (checked) setSelectedDeliverables(p => [...p, idx]);
                  else setSelectedDeliverables(p => p.filter(i => i !== idx));
                }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{d.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  {safeFormatDate(d.due_date) && <span>Προθεσμία: {safeFormatDate(d.due_date)}</span>}
                  {d.budget && <span>€{d.budget.toLocaleString()}</span>}
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
            <span className="font-medium text-sm">Tasks ({suggestions.tasks.length})</span>
            <Badge variant="secondary" className="text-[10px]">{selectedTasks.length} επιλεγμένα</Badge>
          </div>
          {expandedSections.tasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1.5 mt-1">
          {suggestions.tasks.map((t, idx) => {
            const linkedDeliverable = t.deliverable_index !== undefined ? suggestions.deliverables[t.deliverable_index] : null;
            return (
            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 text-sm">
              <Checkbox checked={selectedTasks.includes(idx)}
                onCheckedChange={checked => {
                  if (checked) setSelectedTasks(p => [...p, idx]);
                  else setSelectedTasks(p => p.filter(i => i !== idx));
                }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{t.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {safeFormatDate(t.due_date) && <span className="text-[10px] text-muted-foreground">Προθεσμία: {safeFormatDate(t.due_date)}</span>}
                  {linkedDeliverable && (
                    <Badge variant="outline" className="text-[9px] h-4 gap-0.5 bg-primary/5 border-primary/20 text-primary">
                      <Package className="h-2.5 w-2.5" />
                      {linkedDeliverable.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      {/* Invoices */}
      <Collapsible open={expandedSections.invoices} onOpenChange={() => toggleSection('invoices')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-warning" />
            <span className="font-medium text-sm">Τιμολόγια ({suggestions.invoices.length})</span>
            <Badge variant="secondary" className="text-[10px]">{selectedInvoices.length} επιλεγμένα</Badge>
          </div>
          {expandedSections.invoices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1.5 mt-1">
          {suggestions.invoices.map((inv, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 text-sm">
              <Checkbox checked={selectedInvoices.includes(idx)}
                onCheckedChange={checked => {
                  if (checked) setSelectedInvoices(p => [...p, idx]);
                  else setSelectedInvoices(p => p.filter(i => i !== idx));
                }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{inv.description}</p>
                <div className="flex gap-3 mt-0.5 text-xs">
                  <span className="font-medium">€{inv.amount.toLocaleString()}</span>
                  {safeFormatDate(inv.due_date) && <span className="text-muted-foreground">Λήξη: {safeFormatDate(inv.due_date)}</span>}
                </div>
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Suggested project details */}
      {suggestions.suggestedProjectDetails && (
        <div className="p-2.5 rounded-lg border bg-primary/5 text-xs space-y-1">
          <p className="font-medium flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Στοιχεία Έργου (θα ενημερωθούν)</p>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            {suggestions.suggestedProjectDetails.budget && <span>Budget: €{suggestions.suggestedProjectDetails.budget.toLocaleString()}</span>}
            {safeFormatDate(suggestions.suggestedProjectDetails.start_date) && <span>Έναρξη: {safeFormatDate(suggestions.suggestedProjectDetails.start_date)}</span>}
            {safeFormatDate(suggestions.suggestedProjectDetails.end_date) && <span>Λήξη: {safeFormatDate(suggestions.suggestedProjectDetails.end_date)}</span>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button onClick={applySuggestions} className="flex-1"
          disabled={applying || (selectedDeliverables.length === 0 && selectedTasks.length === 0 && selectedInvoices.length === 0)}>
          {applying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Εφαρμογή...</>
            : <><Check className="h-4 w-4 mr-2" /> Εφαρμογή Επιλεγμένων</>}
        </Button>
        <Button variant="outline" size="icon" onClick={() => { setSuggestions(null); }} title="Επανάλυση">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => { setSuggestions(null); onDone?.(); }}>
          Κλείσιμο
        </Button>
      </div>
    </div>
  );
}
