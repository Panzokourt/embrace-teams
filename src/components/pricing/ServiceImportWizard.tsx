import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, ArrowRight, Check, AlertTriangle, Loader2, Download } from 'lucide-react';

const SERVICE_FIELDS = [
  { key: 'name', label: 'Όνομα', required: true },
  { key: 'description', label: 'Περιγραφή', required: false },
  { key: 'category', label: 'Κατηγορία', required: false },
  { key: 'subcategory', label: 'Υποκατηγορία', required: false },
  { key: 'pricing_model', label: 'Pricing Model', required: false },
  { key: 'pricing_unit', label: 'Μονάδα Χρέωσης', required: false },
  { key: 'list_price', label: 'Τιμή Πώλησης', required: false },
  { key: 'external_cost', label: 'Εξωτερικό Κόστος', required: false },
  { key: 'target_margin', label: 'Target Margin %', required: false },
  { key: 'estimated_turnaround', label: 'Εκτιμώμενος Χρόνος', required: false },
  { key: 'notes', label: 'Σημειώσεις', required: false },
];

type Step = 'upload' | 'mapping' | 'preview' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter(r => r.some(c => c));
  return { headers, rows };
}

function autoMap(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const aliases: Record<string, string[]> = {
    name: ['name', 'όνομα', 'onoma', 'service', 'υπηρεσία', 'title'],
    description: ['description', 'περιγραφή', 'desc', 'perigrafh'],
    category: ['category', 'κατηγορία', 'kategoria', 'cat'],
    subcategory: ['subcategory', 'υποκατηγορία'],
    pricing_model: ['pricing_model', 'pricing model', 'model', 'μοντέλο'],
    pricing_unit: ['pricing_unit', 'unit', 'μονάδα', 'billing unit'],
    list_price: ['list_price', 'price', 'τιμή', 'timi', 'sell price', 'sale price'],
    external_cost: ['external_cost', 'εξωτερικό κόστος', 'ext cost', 'external'],
    target_margin: ['target_margin', 'margin', 'target margin', 'margin %'],
    estimated_turnaround: ['turnaround', 'χρόνος', 'duration', 'estimated_turnaround'],
    notes: ['notes', 'σημειώσεις', 'note'],
  };

  headers.forEach((h, i) => {
    const norm = h.toLowerCase().trim();
    for (const [field, alts] of Object.entries(aliases)) {
      if (alts.some(a => norm === a || norm.includes(a))) {
        mapping[i] = field;
        break;
      }
    }
  });
  return mapping;
}

export default function ServiceImportWizard({ open, onOpenChange, onImported }: Props) {
  const { company } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImporting(false);
    setImportedCount(0);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'tsv', 'txt', 'xls', 'xlsx'].includes(ext || '')) {
      toast.error('Υποστηρίζονται μόνο CSV, TSV, XLS, XLSX αρχεία');
      return;
    }

    if (ext === 'xls' || ext === 'xlsx') {
      toast.info('Για XLSX αρχεία, αποθηκεύστε πρώτα ως CSV και ανεβάστε ξανά');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) { toast.error('Κενό αρχείο'); return; }
      setHeaders(h);
      setRows(r);
      setMapping(autoMap(h));
      setStep('mapping');
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  // Build preview data
  const previewData = useMemo((): Record<string, any>[] => {
    if (step !== 'preview' && step !== 'mapping') return [];
    const nameIdx = Object.entries(mapping).find(([, v]) => v === 'name')?.[0];
    if (nameIdx === undefined) return [];

    return rows.map((row, idx) => {
      const record: Record<string, any> = { _idx: idx };
      Object.entries(mapping).forEach(([colIdx, field]) => {
        let val = row[parseInt(colIdx)] || '';
        if (['list_price', 'external_cost', 'target_margin'].includes(field)) {
          val = val.replace(/[€$,\s]/g, '').replace(',', '.');
          record[field] = parseFloat(val) || 0;
        } else {
          record[field] = val;
        }
      });
      return record;
    });
  }, [rows, mapping, step]);

  const validRows = useMemo(() => previewData.filter(r => r.name && r.name.trim()), [previewData]);
  const invalidRows = useMemo(() => previewData.filter(r => !r.name || !r.name.trim()), [previewData]);
  const hasNameMapping = Object.values(mapping).includes('name');

  const handleImport = async () => {
    if (!company?.id) return;
    setImporting(true);

    const toInsert = validRows.map(r => ({
      company_id: company.id,
      name: r.name,
      description: r.description || null,
      category: r.category || 'project',
      subcategory: r.subcategory || null,
      pricing_model: r.pricing_model || 'fixed',
      pricing_unit: r.pricing_unit || 'project',
      list_price: r.list_price || 0,
      external_cost: r.external_cost || 0,
      target_margin: r.target_margin || null,
      estimated_turnaround: r.estimated_turnaround || null,
      notes: r.notes || null,
      is_active: true,
      sort_order: 0,
    }));

    // Batch insert in chunks of 50
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const chunk = toInsert.slice(i, i + 50);
      const { error } = await supabase.from('services').insert(chunk as any);
      if (error) {
        toast.error(`Σφάλμα εισαγωγής (γραμμή ${i + 1}): ${error.message}`);
        setImporting(false);
        return;
      }
      inserted += chunk.length;
    }

    setImportedCount(inserted);
    setStep('done');
    setImporting(false);
    toast.success(`Εισήχθησαν ${inserted} υπηρεσίες`);
    onImported();
  };

  const downloadTemplate = () => {
    const templateHeaders = SERVICE_FIELDS.map(f => f.label).join(',');
    const sampleRow = 'Social Media Management,Διαχείριση social media,retainer,,retainer,month,1500,200,40,,';
    const csv = `${templateHeaders}\n${sampleRow}`;
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'services_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Εισαγωγή Υπηρεσιών
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-xs mb-4">
          {['upload', 'mapping', 'preview', 'done'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['upload', 'mapping', 'preview', 'done'].indexOf(step) > i ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {['upload', 'mapping', 'preview', 'done'].indexOf(step) > i ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={step === s ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {s === 'upload' ? 'Αρχείο' : s === 'mapping' ? 'Αντιστοίχιση' : s === 'preview' ? 'Προεπισκόπηση' : 'Ολοκλήρωση'}
              </span>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Μεταφέρετε ένα CSV αρχείο ή κάντε κλικ για επιλογή</p>
              <Input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Κατέβασε Template CSV
              </Button>
            </div>
          </div>
        )}

        {/* Step: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Βρέθηκαν <strong>{rows.length}</strong> γραμμές και <strong>{headers.length}</strong> στήλες. Αντιστοιχίστε τις στήλες:
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-48 text-sm font-medium truncate flex-shrink-0 bg-muted/50 rounded px-2 py-1.5">
                    {h}
                    <span className="text-xs text-muted-foreground ml-1">({rows[0]?.[i]?.slice(0, 20) || ''})</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={mapping[i] || '_skip'}
                    onValueChange={v => setMapping(prev => {
                      const next = { ...prev };
                      if (v === '_skip') delete next[i];
                      else next[i] = v;
                      return next;
                    })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">— Παράλειψη —</SelectItem>
                      {SERVICE_FIELDS.map(f => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label} {f.required && '*'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {!hasNameMapping && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" /> Πρέπει να αντιστοιχίσετε τουλάχιστον τη στήλη "Όνομα"
              </div>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="default" className="bg-primary/15 text-primary">{validRows.length} έγκυρες</Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive">{invalidRows.length} χωρίς όνομα (θα παραλειφθούν)</Badge>
              )}
            </div>
            <div className="border rounded-lg overflow-x-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {Object.values(mapping).map((field, i) => (
                      <TableHead key={i} className="text-xs">
                        {SERVICE_FIELDS.find(f => f.key === field)?.label || field}
                      </TableHead>
                    ))}
                    <TableHead className="w-16">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 20).map((row, i) => {
                    const valid = row.name && row.name.trim();
                    return (
                      <TableRow key={i} className={!valid ? 'opacity-50' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        {Object.values(mapping).map((field, j) => (
                          <TableCell key={j} className="text-xs max-w-[150px] truncate">
                            {row[field] ?? ''}
                          </TableCell>
                        ))}
                        <TableCell>
                          {valid
                            ? <Check className="h-4 w-4 text-primary" />
                            : <AlertTriangle className="h-4 w-4 text-destructive" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {previewData.length > 20 && (
              <p className="text-xs text-muted-foreground">Εμφανίζονται οι πρώτες 20 από {previewData.length} γραμμές</p>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Η εισαγωγή ολοκληρώθηκε!</h3>
            <p className="text-muted-foreground">Εισήχθησαν <strong>{importedCount}</strong> υπηρεσίες επιτυχώς.</p>
          </div>
        )}

        <DialogFooter>
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Πίσω</Button>
              <Button onClick={() => setStep('preview')} disabled={!hasNameMapping}>
                Προεπισκόπηση <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>Πίσω</Button>
              <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Εισαγωγή {validRows.length} Υπηρεσιών
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Κλείσιμο</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
