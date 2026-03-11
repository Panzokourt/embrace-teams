import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Loader2, FileText, Brain, ArrowRight, ArrowLeft, Save, CheckCircle2, Calendar, DollarSign, ListChecks, ClipboardList, Users } from 'lucide-react';

export const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Συμβόλαιο / Σύμβαση' },
  { value: 'brief', label: 'Brief' },
  { value: 'proposal', label: 'Πρόταση / Προσφορά' },
  { value: 'report', label: 'Αναφορά' },
  { value: 'invoice', label: 'Τιμολόγιο / Παραστατικό' },
  { value: 'presentation', label: 'Παρουσίαση' },
  { value: 'creative', label: 'Δημιουργικό' },
  { value: 'vendor_doc', label: 'Έγγραφο Προμηθευτή' },
  { value: 'correspondence', label: 'Αλληλογραφία' },
  { value: 'other', label: 'Άλλο' },
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number]['value'];

export const DOCTYPE_FOLDER_MAP: Record<string, string> = {
  contract: 'Συμβόλαια & Συμβάσεις',
  brief: 'Briefs',
  proposal: 'Προτάσεις',
  report: 'Αναφορές',
  invoice: 'Τιμολόγια & Παραστατικά',
  presentation: 'Παρουσιάσεις',
  creative: 'Δημιουργικά',
  vendor_doc: 'Προμηθευτές',
  correspondence: 'Αλληλογραφία',
};

export interface AnalysisData {
  summary?: string;
  budget?: number | null;
  value?: number | null;
  total_cost?: number | null;
  currency?: string;
  start_date?: string | null;
  end_date?: string | null;
  deliverables?: string[];
  action_items?: string[];
  obligations?: string[];
  key_points?: string[];
  parties?: Array<{ name: string; role?: string }>;
  [key: string]: any;
}

export interface ApplyFields {
  description: string;
  budget: number | null;
  startDate: string;
  endDate: string;
  deliverables: Array<{ name: string; selected: boolean }>;
  tasks: Array<{ title: string; selected: boolean }>;
  parties: Array<{ name: string; role?: string }>;
}

type WizardStep = 'upload' | 'analyzing' | 'review' | 'done';

interface FileUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: FileList, folderId: string | null, documentType: DocumentType, runAnalysis: boolean) => Promise<string[]>;
  onRunAnalysis: (fileId: string, documentType: string) => Promise<AnalysisData | null>;
  onApplyToProject?: (fields: ApplyFields, documentType: DocumentType, fileId: string) => Promise<void>;
  folders: { id: string; name: string }[];
  uploading: boolean;
  hasProject: boolean;
  currentFolderId?: string | null;
}

export function FileUploadWizard({
  open, onOpenChange, onUpload, onRunAnalysis, onApplyToProject,
  folders, uploading, hasProject, currentFolderId
}: FileUploadWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [runAnalysis, setRunAnalysis] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields derived from analysis
  const [applyFields, setApplyFields] = useState<ApplyFields>({
    description: '',
    budget: null,
    startDate: '',
    endDate: '',
    deliverables: [],
    tasks: [],
    parties: [],
  });

  const resetWizard = () => {
    setStep('upload');
    setDocumentType('other');
    setSelectedFiles(null);
    setRunAnalysis(true);
    setAnalysis(null);
    setUploadedFileId(null);
    setApplying(false);
    setApplyFields({ description: '', budget: null, startDate: '', endDate: '', deliverables: [], tasks: [], parties: [] });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const populateFieldsFromAnalysis = useCallback((data: AnalysisData) => {
    const deliverablesList = (data.deliverables || []).map(d => ({ name: d, selected: true }));
    const tasksList = (data.action_items || data.obligations || data.key_points || []).map(t => ({ title: t, selected: true }));
    const budget = data.budget ?? data.value ?? data.total_cost ?? null;

    setApplyFields({
      description: data.summary || '',
      budget,
      startDate: data.start_date || '',
      endDate: data.end_date || '',
      deliverables: deliverablesList,
      tasks: tasksList,
      parties: data.parties || [],
    });
  }, []);

  const handleUploadAndAnalyze = async () => {
    if (!selectedFiles) return;

    // Find matching folder for document type
    const mappedFolderName = DOCTYPE_FOLDER_MAP[documentType];
    let targetFolderId = currentFolderId || null;
    if (mappedFolderName && !currentFolderId) {
      const matchingFolder = folders.find(f => f.name === mappedFolderName);
      if (matchingFolder) targetFolderId = matchingFolder.id;
    }

    // Upload files
    const fileIds = await onUpload(selectedFiles, targetFolderId, documentType, false);

    if (!fileIds || fileIds.length === 0) return;
    setUploadedFileId(fileIds[0]);

    if (runAnalysis && hasProject) {
      setStep('analyzing');
      setAnalyzing(true);
      try {
        const result = await onRunAnalysis(fileIds[0], documentType);
        if (result) {
          setAnalysis(result);
          populateFieldsFromAnalysis(result);
          setStep('review');
        } else {
          setStep('done');
        }
      } catch {
        setStep('done');
      } finally {
        setAnalyzing(false);
      }
    } else {
      setStep('done');
    }
  };

  const handleApply = async () => {
    if (!onApplyToProject || !uploadedFileId) return;
    setApplying(true);
    try {
      await onApplyToProject(applyFields, documentType, uploadedFileId);
      setStep('done');
    } catch {
      // error handled in parent
    } finally {
      setApplying(false);
    }
  };

  const toggleDeliverable = (index: number) => {
    setApplyFields(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((d, i) => i === index ? { ...d, selected: !d.selected } : d),
    }));
  };

  const toggleTask = (index: number) => {
    setApplyFields(prev => ({
      ...prev,
      tasks: prev.tasks.map((t, i) => i === index ? { ...t, selected: !t.selected } : t),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'upload' && <><Upload className="h-5 w-5" /> Ανέβασμα Αρχείων</>}
            {step === 'analyzing' && <><Brain className="h-5 w-5 text-primary animate-pulse" /> AI Ανάλυση σε εξέλιξη...</>}
            {step === 'review' && <><Brain className="h-5 w-5 text-primary" /> Αποτελέσματα Ανάλυσης</>}
            {step === 'done' && <><CheckCircle2 className="h-5 w-5 text-green-600" /> Ολοκληρώθηκε</>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Αρχεία</Label>
                <input ref={fileInputRef} type="file" multiple onChange={(e) => setSelectedFiles(e.target.files)} className="hidden" />
                <Button variant="outline" className="w-full mt-1 border-dashed" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="h-4 w-4 mr-2" />
                  {selectedFiles ? `${selectedFiles.length} αρχείο/α επιλεγμένα` : 'Επιλέξτε αρχεία'}
                </Button>
              </div>

              <div>
                <Label>Τύπος Εγγράφου</Label>
                <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(dt => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {DOCTYPE_FOLDER_MAP[documentType] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    → Θα αποθηκευτεί στον φάκελο: <span className="font-medium">{DOCTYPE_FOLDER_MAP[documentType]}</span>
                  </p>
                )}
              </div>

              {hasProject && (
                <div className="flex items-center gap-2">
                  <Checkbox id="run-analysis" checked={runAnalysis} onCheckedChange={(c) => setRunAnalysis(!!c)} />
                  <Label htmlFor="run-analysis" className="text-sm cursor-pointer">
                    Αυτόματη AI ανάλυση & εξαγωγή δεδομένων στο έργο
                  </Label>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Analyzing */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Ανάλυση εγγράφου σε εξέλιξη...</p>
              <p className="text-xs text-muted-foreground">Εξαγωγή δεδομένων, παραδοτέων & ενεργειών</p>
            </div>
          )}

          {/* STEP 3: Review & Edit */}
          {step === 'review' && analysis && (
            <div className="space-y-5 py-2">
              {/* Summary / Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-semibold">Περίληψη / Περιγραφή</Label>
                </div>
                <Textarea
                  value={applyFields.description}
                  onChange={e => setApplyFields(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <Separator />

              {/* Financial */}
              {(applyFields.budget !== null || analysis.value || analysis.total_cost) && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold">Οικονομικά</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Budget / Αξία (€)</Label>
                        <Input
                          type="number"
                          value={applyFields.budget ?? ''}
                          onChange={e => setApplyFields(p => ({ ...p, budget: e.target.value ? parseFloat(e.target.value) : null }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      {analysis.currency && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Νόμισμα</Label>
                          <Input value={analysis.currency} disabled className="h-8 text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Dates */}
              {(applyFields.startDate || applyFields.endDate) && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold">Ημερομηνίες</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Ημ. Έναρξης</Label>
                        <Input
                          type="date"
                          value={applyFields.startDate}
                          onChange={e => setApplyFields(p => ({ ...p, startDate: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Ημ. Λήξης</Label>
                        <Input
                          type="date"
                          value={applyFields.endDate}
                          onChange={e => setApplyFields(p => ({ ...p, endDate: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Deliverables */}
              {applyFields.deliverables.length > 0 && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ListChecks className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold">Παραδοτέα</Label>
                      <Badge variant="secondary" className="text-[10px]">{applyFields.deliverables.filter(d => d.selected).length}/{applyFields.deliverables.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {applyFields.deliverables.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox checked={d.selected} onCheckedChange={() => toggleDeliverable(i)} />
                          <Input
                            value={d.name}
                            onChange={e => {
                              const newD = [...applyFields.deliverables];
                              newD[i] = { ...newD[i], name: e.target.value };
                              setApplyFields(p => ({ ...p, deliverables: newD }));
                            }}
                            className="h-7 text-sm flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Tasks / Actions */}
              {applyFields.tasks.length > 0 && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-semibold">Ενέργειες / Tasks</Label>
                      <Badge variant="secondary" className="text-[10px]">{applyFields.tasks.filter(t => t.selected).length}/{applyFields.tasks.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {applyFields.tasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox checked={t.selected} onCheckedChange={() => toggleTask(i)} />
                          <Input
                            value={t.title}
                            onChange={e => {
                              const newT = [...applyFields.tasks];
                              newT[i] = { ...newT[i], title: e.target.value };
                              setApplyFields(p => ({ ...p, tasks: newT }));
                            }}
                            className="h-7 text-sm flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Parties (contracts) */}
              {applyFields.parties.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-semibold">Συμβαλλόμενα Μέρη</Label>
                  </div>
                  <div className="space-y-1.5">
                    {applyFields.parties.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{p.name}</span>
                        {p.role && <Badge variant="outline" className="text-[10px]">{p.role}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-sm font-medium">Το αρχείο ανέβηκε επιτυχώς!</p>
              {analysis && <p className="text-xs text-muted-foreground">Τα δεδομένα εφαρμόστηκαν στο έργο.</p>}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>Ακύρωση</Button>
              <Button onClick={handleUploadAndAnalyze} disabled={!selectedFiles || uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                {runAnalysis && hasProject ? 'Ανέβασμα & Ανάλυση' : 'Ανέβασμα'}
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => { setStep('done'); }}>
                Παράλειψη
              </Button>
              <Button onClick={handleApply} disabled={applying}>
                {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Εφαρμογή & Αποθήκευση
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button onClick={handleClose}>Κλείσιμο</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
