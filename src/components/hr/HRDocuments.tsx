import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { FileText, Upload, Trash2, Download, Loader2, Plus } from 'lucide-react';

interface HRDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  notes: string | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

const DOC_TYPES: Record<string, string> = {
  contract: 'Σύμβαση',
  nda: 'NDA',
  payroll: 'Μισθοδοσία',
  evaluation: 'Αξιολόγηση',
  termination: 'Αποχώρηση',
  other: 'Άλλο',
};

interface HRDocumentsProps {
  userId: string;
}

export function HRDocuments({ userId }: HRDocumentsProps) {
  const { user, company, isAdmin, isManager } = useAuth();
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('other');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const canManage = isAdmin || isManager;

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('hr_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setDocuments((data || []) as HRDocument[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async () => {
    if (!file || !user || !company) return;
    setUploading(true);

    const filePath = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    
    const { error: storageError } = await supabase.storage
      .from('hr-documents')
      .upload(filePath, file);

    if (storageError) {
      toast.error('Σφάλμα ανεβάσματος αρχείου');
      setUploading(false);
      return;
    }

    const { error } = await supabase.from('hr_documents').insert({
      user_id: userId,
      company_id: company.id,
      document_type: docType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      uploaded_by: user.id,
      notes: notes || null,
    });

    if (error) {
      toast.error('Σφάλμα αποθήκευσης');
    } else {
      toast.success('Το έγγραφο ανέβηκε');
      setUploadOpen(false);
      setFile(null);
      setNotes('');
      setDocType('other');
      fetchDocuments();
    }
    setUploading(false);
  };

  const handleDelete = async (doc: HRDocument) => {
    await supabase.storage.from('hr-documents').remove([doc.file_path]);
    await supabase.from('hr_documents').delete().eq('id', doc.id);
    toast.success('Το έγγραφο διαγράφηκε');
    fetchDocuments();
  };

  const handleDownload = async (doc: HRDocument) => {
    const { data } = await supabase.storage.from('hr-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ανέβασμα Εγγράφου
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Δεν υπάρχουν έγγραφα</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Τύπος</TableHead>
                  <TableHead>Αρχείο</TableHead>
                  <TableHead>Ημερομηνία</TableHead>
                  <TableHead>Σημειώσεις</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="outline">{DOC_TYPES[doc.document_type] || doc.document_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{doc.file_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.created_at), 'd MMM yyyy', { locale: el })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {doc.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(doc)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ανέβασμα Εγγράφου HR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Τύπος Εγγράφου</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Αρχείο *</Label>
              <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Σημειώσεις</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Προαιρετικές σημειώσεις..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Ανέβασμα
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
