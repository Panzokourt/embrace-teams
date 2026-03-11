import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, FileText } from 'lucide-react';

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

// Map document types to folder names for auto-placement
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

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: FileList, folderId: string | null, documentType: DocumentType, analyze: boolean) => Promise<void>;
  folders: { id: string; name: string }[];
  uploading: boolean;
  currentFolderId?: string | null;
}

export function FileUploadDialog({ open, onOpenChange, onUpload, folders, uploading, currentFolderId }: FileUploadDialogProps) {
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [runAnalysis, setRunAnalysis] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!selectedFiles) return;

    // Find matching folder for document type
    const mappedFolderName = DOCTYPE_FOLDER_MAP[documentType];
    let targetFolderId = currentFolderId || null;
    if (mappedFolderName && !currentFolderId) {
      const matchingFolder = folders.find(f => f.name === mappedFolderName);
      if (matchingFolder) targetFolderId = matchingFolder.id;
    }

    await onUpload(selectedFiles, targetFolderId, documentType, runAnalysis);
    setSelectedFiles(null);
    setDocumentType('other');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Ανέβασμα Αρχείων
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File selector */}
          <div>
            <Label>Αρχεία</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full mt-1 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              {selectedFiles ? `${selectedFiles.length} αρχείο/α επιλεγμένα` : 'Επιλέξτε αρχεία'}
            </Button>
          </div>

          {/* Document type */}
          <div>
            <Label>Τύπος Εγγράφου</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Analysis toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="run-analysis"
              checked={runAnalysis}
              onChange={e => setRunAnalysis(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="run-analysis" className="text-sm cursor-pointer">
              Αυτόματη AI ανάλυση εγγράφου
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button onClick={handleSubmit} disabled={!selectedFiles || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Ανέβασμα
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
