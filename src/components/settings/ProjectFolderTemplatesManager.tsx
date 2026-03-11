import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FolderTree, Plus, Trash2, GripVertical, Loader2, RotateCcw } from 'lucide-react';
import { DOCUMENT_TYPES } from '@/components/files/FileUploadDialog';

interface FolderTemplate {
  id: string;
  name: string;
  document_type: string | null;
  sort_order: number;
}

const DEFAULT_FOLDERS = [
  { name: 'Προτάσεις', document_type: 'proposal' },
  { name: 'Παρουσιάσεις', document_type: 'presentation' },
  { name: 'Προσφορές', document_type: 'proposal' },
  { name: 'Συμβόλαια & Συμβάσεις', document_type: 'contract' },
  { name: 'Briefs', document_type: 'brief' },
  { name: 'Αναφορές', document_type: 'report' },
  { name: 'Δημιουργικά', document_type: 'creative' },
  { name: 'Τιμολόγια & Παραστατικά', document_type: 'invoice' },
  { name: 'Προμηθευτές', document_type: 'vendor_doc' },
  { name: 'Αλληλογραφία', document_type: 'correspondence' },
];

export function ProjectFolderTemplatesManager() {
  const { company, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<FolderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDocType, setNewDocType] = useState<string>('other');

  useEffect(() => {
    if (company?.id) fetchTemplates();
  }, [company?.id]);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('project_folder_templates')
      .select('*')
      .eq('company_id', company!.id)
      .order('sort_order');
    if (!error) setTemplates((data || []) as any);
    setLoading(false);
  };

  const addTemplate = async () => {
    if (!newName.trim() || !company?.id) return;
    setSaving(true);
    const { error } = await supabase.from('project_folder_templates').insert({
      company_id: company.id,
      name: newName.trim(),
      document_type: newDocType,
      sort_order: templates.length,
    } as any);
    if (error) toast.error('Σφάλμα');
    else {
      toast.success('Φάκελος προστέθηκε');
      setNewName('');
      await fetchTemplates();
    }
    setSaving(false);
  };

  const removeTemplate = async (id: string) => {
    const { error } = await supabase.from('project_folder_templates').delete().eq('id', id);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Διαγράφηκε');
    }
  };

  const resetToDefaults = async () => {
    if (!company?.id) return;
    setSaving(true);
    await supabase.from('project_folder_templates').delete().eq('company_id', company.id);
    const inserts = DEFAULT_FOLDERS.map((f, i) => ({
      company_id: company.id,
      name: f.name,
      document_type: f.document_type,
      sort_order: i,
    }));
    await supabase.from('project_folder_templates').insert(inserts as any);
    await fetchTemplates();
    toast.success('Επαναφορά στα προεπιλεγμένα');
    setSaving(false);
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          <CardTitle>Δομή Φακέλων Έργων</CardTitle>
        </div>
        <CardDescription>
          Προσαρμόστε τους φακέλους που δημιουργούνται αυτόματα σε κάθε νέο έργο
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {/* Info about defaults */}
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Χρησιμοποιούνται οι προεπιλεγμένοι φάκελοι. Προσθέστε custom φακέλους ή πατήστε "Επαναφορά" για να τους εισάγετε ως βάση.
              </p>
            )}

            {/* Template list */}
            <div className="space-y-1.5">
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm font-medium">{t.name}</span>
                  {t.document_type && (
                    <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {DOCUMENT_TYPES.find(d => d.value === t.document_type)?.label || t.document_type}
                    </span>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTemplate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="flex gap-2">
              <Input
                placeholder="Όνομα φακέλου..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && addTemplate()}
              />
              <Select value={newDocType} onValueChange={setNewDocType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addTemplate} disabled={!newName.trim() || saving} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Επαναφορά Προεπιλεγμένων
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
