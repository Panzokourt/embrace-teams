import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, ChevronLeft, ChevronRight, Loader2, Upload, X, FileIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  companyId: string | undefined;
  onNext: (uploadedSourceIds: string[]) => void;
  onBack: () => void;
  onSkip: () => void;
}

type DocCategory = 'sop' | 'brand' | 'contract' | 'policy' | 'other';

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  sourceId?: string;
  category?: DocCategory;
}

// Heuristic, instant-categorization (free) — pre-fills before any AI compile.
function guessCategory(name: string): DocCategory {
  const n = name.toLowerCase();
  if (/(sop|process|playbook|workflow|διαδικ)/.test(n)) return 'sop';
  if (/(brand|logo|guideline|identity|visual)/.test(n)) return 'brand';
  if (/(contract|agreement|nda|σύμβαση|συμβόλαιο)/.test(n)) return 'contract';
  if (/(policy|πολιτικ|κανον)/.test(n)) return 'policy';
  return 'other';
}

const CAT_LABEL: Record<DocCategory, string> = {
  sop: 'SOP / Διαδικασία',
  brand: 'Brand Guidelines',
  contract: 'Contract / Template',
  policy: 'Πολιτική',
  other: 'Άλλο',
};

const CAT_COLOR: Record<DocCategory, string> = {
  sop: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  brand: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  contract: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  policy: 'bg-green-500/10 text-green-600 border-green-500/20',
  other: 'bg-muted text-muted-foreground border-border/60',
};

export default function OnboardingCompanyDocs({ userId, companyId, onNext, onBack, onSkip }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const newFiles = selected.map(f => ({
      file: f,
      status: 'pending' as const,
      category: guessCategory(f.name),
    }));
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    const newFiles = dropped.map(f => ({
      file: f,
      status: 'pending' as const,
      category: guessCategory(f.name),
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const setCategory = (idx: number, cat: DocCategory) => {
    setFiles(prev => prev.map((item, i) => i === idx ? { ...item, category: cat } : item));
  };

  const categorySummary = useMemo(() => {
    const counts: Record<DocCategory, number> = { sop: 0, brand: 0, contract: 0, policy: 0, other: 0 };
    files.forEach(f => { counts[f.category ?? 'other']++; });
    return counts;
  }, [files]);

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUploadAndContinue = async () => {
    if (!companyId || files.length === 0) {
      onNext([]);
      return;
    }

    setLoading(true);
    const sourceIds: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));

        // Upload to storage
        const path = `onboarding-docs/${companyId}/${Date.now()}-${f.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(path, f.file);

        if (uploadError) {
          setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
          continue;
        }

        // Read text content for text-based files
        let content = `[Αρχείο: ${f.file.name}, Τύπος: ${f.file.type}, Μέγεθος: ${(f.file.size / 1024).toFixed(1)}KB]`;
        if (f.file.type.startsWith('text/') || f.file.name.endsWith('.md') || f.file.name.endsWith('.txt')) {
          try {
            content = await f.file.text();
          } catch {}
        }

        // Create kb_raw_source entry
        const { data: source, error: sourceError } = await supabase
          .from('kb_raw_sources')
          .insert({
            company_id: companyId,
            user_id: userId,
            title: f.file.name,
            content,
            source_type: 'document',
            compiled: false,
          })
          .select('id')
          .single();

        if (!sourceError && source) {
          sourceIds.push(source.id);
          setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done', sourceId: source.id } : item));
        } else {
          setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
        }
      }

      toast.success(`${sourceIds.length} αρχεί(-ο/α) ανέβηκαν!`);
      onNext(sourceIds);
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα upload');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <FileText className="h-10 w-10 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-foreground">Εταιρικά έγγραφα</h2>
        <p className="text-sm text-muted-foreground">
          Ανεβάστε αρχεία (manifesto, brand guidelines, πολιτικές) για να εκπαιδευτεί ο AI βοηθός σας
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border/60 hover:border-primary/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
      >
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Σύρτε αρχεία εδώ ή <span className="text-primary font-medium">κλικ για επιλογή</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOCX, TXT, MD — μέχρι 20MB ανά αρχείο
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md,.pptx"
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      {/* AI Categorization summary */}
      {files.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-foreground font-medium">AI κατηγοριοποίηση (preview)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(categorySummary) as DocCategory[])
              .filter(k => categorySummary[k] > 0)
              .map(k => (
                <span key={k} className={`px-2 py-0.5 rounded border text-[11px] ${CAT_COLOR[k]}`}>
                  {CAT_LABEL[k]} · {categorySummary[k]}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Αρχεία ({files.length})</Label>
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/40 text-sm gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-foreground">{f.file.name}</span>
                <span className="text-muted-foreground text-xs shrink-0">{formatSize(f.file.size)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {f.status === 'pending' && (
                  <select
                    value={f.category ?? 'other'}
                    onChange={(e) => setCategory(idx, e.target.value as DocCategory)}
                    className={`text-[11px] rounded border px-1.5 py-0.5 bg-transparent ${CAT_COLOR[f.category ?? 'other']}`}
                  >
                    {(Object.keys(CAT_LABEL) as DocCategory[]).map(c => (
                      <option key={c} value={c}>{CAT_LABEL[c]}</option>
                    ))}
                  </select>
                )}
                {f.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                {f.status === 'done' && <span className="text-xs text-success">✓</span>}
                {f.status === 'error' && <span className="text-xs text-destructive">✗</span>}
                {f.status === 'pending' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
        </Button>
        <Button onClick={handleUploadAndContinue} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {files.length > 0 ? 'Ανέβασμα & συνέχεια' : 'Συνέχεια'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Παράλειψη
        </Button>
      </div>
    </div>
  );
}
