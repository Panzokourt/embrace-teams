import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FolderTree, Plus, Trash2, GripVertical, Loader2, RotateCcw, Save, Undo2 } from 'lucide-react';
import { DOCUMENT_TYPES } from '@/components/files/FileUploadWizard';

interface FolderTemplate {
  id: string;
  name: string;
  document_type: string | null;
  sort_order: number;
}

// Local-only items use a temp id prefix
interface LocalFolderItem {
  id: string;
  name: string;
  document_type: string | null;
  sort_order: number;
  _isNew?: boolean;
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
  const [savedTemplates, setSavedTemplates] = useState<FolderTemplate[]>([]);
  const [localItems, setLocalItems] = useState<LocalFolderItem[]>([]);
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
    if (!error) {
      const items = (data || []) as FolderTemplate[];
      setSavedTemplates(items);
      setLocalItems(items.map(t => ({ ...t })));
    }
    setLoading(false);
  };

  const isDirty = useMemo(() => {
    if (localItems.length !== savedTemplates.length) return true;
    return localItems.some((item, i) => {
      const saved = savedTemplates[i];
      return !saved || item.id !== saved.id || item.name !== saved.name || item.document_type !== saved.document_type || item.sort_order !== saved.sort_order;
    });
  }, [localItems, savedTemplates]);

  const addLocal = () => {
    if (!newName.trim()) return;
    setLocalItems(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: newName.trim(),
        document_type: newDocType,
        sort_order: prev.length,
        _isNew: true,
      },
    ]);
    setNewName('');
  };

  const removeLocal = (id: string) => {
    setLocalItems(prev => prev.filter(t => t.id !== id).map((t, i) => ({ ...t, sort_order: i })));
  };

  const cancelChanges = () => {
    setLocalItems(savedTemplates.map(t => ({ ...t })));
  };

  const loadDefaults = () => {
    setLocalItems(
      DEFAULT_FOLDERS.map((f, i) => ({
        id: `temp-${Date.now()}-${i}`,
        name: f.name,
        document_type: f.document_type,
        sort_order: i,
        _isNew: true,
      }))
    );
  };

  const saveAll = async () => {
    if (!company?.id) return;
    setSaving(true);

    // Delete all existing, then insert all local items
    await supabase.from('project_folder_templates').delete().eq('company_id', company.id);

    if (localItems.length > 0) {
      const inserts = localItems.map((f, i) => ({
        company_id: company.id,
        name: f.name,
        document_type: f.document_type,
        sort_order: i,
      }));
      const { error } = await supabase.from('project_folder_templates').insert(inserts as any);
      if (error) {
        toast.error('Σφάλμα αποθήκευσης');
        setSaving(false);
        return;
      }
    }

    toast.success('Η δομή φακέλων αποθηκεύτηκε');
    await fetchTemplates();
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
            {localItems.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Δεν υπάρχουν φάκελοι. Προσθέστε custom φακέλους ή πατήστε "Επαναφορά Προεπιλεγμένων".
              </p>
            )}

            <div className="space-y-1.5">
              {localItems.map(t => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm font-medium">{t.name}</span>
                  {t.document_type && (
                    <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {DOCUMENT_TYPES.find(d => d.value === t.document_type)?.label || t.document_type}
                    </span>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLocal(t.id)}>
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
                onKeyDown={e => e.key === 'Enter' && addLocal()}
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
              <Button onClick={addLocal} disabled={!newName.trim()} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Button onClick={saveAll} disabled={!isDirty || saving} size="sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Αποθήκευση
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelChanges} disabled={!isDirty || saving}>
                <Undo2 className="h-3.5 w-3.5 mr-1" />
                Ακύρωση
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={loadDefaults} disabled={saving}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Επαναφορά Προεπιλεγμένων
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
