import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseFile } from '../utils/parseFile';
import type { ParsedFile } from '../schemas/types';
import { cn } from '@/lib/utils';

interface Props {
  onParsed: (p: ParsedFile) => void;
}

export function StepUpload({ onParsed }: Props) {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedFile | null>(null);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const handleFile = useCallback(async (f: File, sheet?: string) => {
    setLoading(true);
    try {
      const parsed = await parseFile(f, sheet);
      setFile(f);
      setParsedPreview(parsed);
      setActiveSheet(parsed.sheetName ?? null);
    } catch (e: any) {
      toast.error(e?.message || 'Αποτυχία ανάγνωσης αρχείου');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onSheetChange = async (s: string) => {
    if (!file) return;
    setActiveSheet(s);
    handleFile(file, s);
  };

  return (
    <div className="space-y-4">
      <Card
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'p-8 border-2 border-dashed text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border'
        )}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">Σύρε εδώ το αρχείο σου</p>
        <p className="text-xs text-muted-foreground mb-3">Υποστηρίζονται .xlsx, .xls, .csv</p>
        <label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button asChild variant="outline" size="sm">
            <span>{loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}Επιλογή αρχείου</span>
          </Button>
        </label>
      </Card>

      {parsedPreview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="font-medium">{file?.name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{parsedPreview.rows.length} γραμμές</span>
            </div>
            {parsedPreview.sheetNames && parsedPreview.sheetNames.length > 1 && (
              <Select value={activeSheet ?? undefined} onValueChange={onSheetChange}>
                <SelectTrigger className="w-[200px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {parsedPreview.sheetNames.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {parsedPreview.headers.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedPreview.rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t">
                      {parsedPreview.headers.map((h) => (
                        <td key={h} className="px-2 py-1 whitespace-nowrap text-muted-foreground">
                          {String(r[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedPreview.rows.length > 10 && (
              <div className="px-2 py-1 text-xs text-muted-foreground bg-muted/30 border-t">
                + {parsedPreview.rows.length - 10} επιπλέον γραμμές…
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onParsed(parsedPreview)}>Συνέχεια στο mapping</Button>
          </div>
        </div>
      )}
    </div>
  );
}
