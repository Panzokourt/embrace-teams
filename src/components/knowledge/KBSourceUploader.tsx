import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Link as LinkIcon, FileText, StickyNote } from 'lucide-react';

interface Props {
  onSubmit: (data: { title: string; content: string; source_type: string; url?: string }) => void;
  isLoading?: boolean;
}

export function KBSourceUploader({ onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceType, setSourceType] = useState('note');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim(), source_type: sourceType, url: url.trim() || undefined });
    setTitle('');
    setContent('');
    setUrl('');
  };

  const typeIcons: Record<string, any> = {
    note: StickyNote,
    article: FileText,
    url: LinkIcon,
    pdf: Upload,
  };
  const Icon = typeIcons[sourceType] || FileText;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" /> Προσθήκη Πηγής
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Τίτλος</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="π.χ. Brand Guidelines" />
          </div>
          <div>
            <Label className="text-xs">Τύπος</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Σημείωση</SelectItem>
                <SelectItem value="article">Άρθρο</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="pdf">PDF / Αρχείο</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(sourceType === 'url') && (
          <div>
            <Label className="text-xs">URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}
        <div>
          <Label className="text-xs">Περιεχόμενο</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Επικολλήστε ή γράψτε το περιεχόμενο..." />
        </div>
        <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim() || isLoading} className="w-full">
          <Upload className="h-4 w-4 mr-1" /> Προσθήκη Πηγής
        </Button>
      </CardContent>
    </Card>
  );
}
