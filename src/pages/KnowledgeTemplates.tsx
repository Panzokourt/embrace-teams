import { useState, useMemo } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KBTemplateCard } from '@/components/knowledge/KBTemplateCard';
import { KBSearchBar } from '@/components/knowledge/KBSearchBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileStack } from 'lucide-react';

const typeOptions = [
  { value: 'all', label: 'Όλα' },
  { value: 'brief', label: 'Briefs' },
  { value: 'media-plan', label: 'Media Plans' },
  { value: 'report', label: 'Reports' },
  { value: 'checklist', label: 'Checklists' },
  { value: 'sop', label: 'SOPs' },
];

export default function KnowledgeTemplates() {
  const { templates, createTemplate, useTemplate } = useKnowledgeBase();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [tplType, setTplType] = useState('sop');

  const filtered = useMemo(() => {
    let list = templates.filter(t => t.status !== 'deprecated');
    if (typeFilter !== 'all') list = list.filter(t => t.template_type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [templates, typeFilter, search]);

  const handleCreate = () => {
    createTemplate.mutate({ title, description: desc, template_type: tplType });
    setTitle(''); setDesc(''); setTplType('sop');
    setCreateOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileStack className="h-6 w-6" /> Templates & SOPs
        </h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Νέο Template
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <KBSearchBar value={search} onChange={setSearch} placeholder="Αναζήτηση templates..." />
        </div>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            {typeOptions.map(o => (
              <TabsTrigger key={o.value} value={o.value} className="text-xs">{o.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(tpl => (
          <KBTemplateCard
            key={tpl.id}
            template={tpl}
            onUse={() => useTemplate.mutate({ templateId: tpl.id })}
            onEdit={() => {}}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Δεν βρέθηκαν templates.</p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Νέο Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Τίτλος</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><Label>Τύπος</Label>
              <Select value={tplType} onValueChange={setTplType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="media-plan">Media Plan</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="sop">SOP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Περιγραφή</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Ακύρωση</Button>
              <Button onClick={handleCreate} disabled={!title.trim()}>Δημιουργία</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
