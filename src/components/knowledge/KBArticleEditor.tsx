import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { KBArticle, KBCategory } from '@/hooks/useKnowledgeBase';

interface KBArticleEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  article?: Partial<KBArticle>;
  categories: KBCategory[];
  onSave: (data: Partial<KBArticle>) => void;
}

export function KBArticleEditor({ open, onOpenChange, article, categories, onSave }: KBArticleEditorProps) {
  const [title, setTitle] = useState(article?.title || '');
  const [body, setBody] = useState(article?.body || '');
  const [articleType, setArticleType] = useState(article?.article_type || 'article');
  const [categoryId, setCategoryId] = useState(article?.category_id || '');
  const [status, setStatus] = useState(article?.status || 'draft');
  const [visibility, setVisibility] = useState(article?.visibility || 'internal');
  const [tags, setTags] = useState(article?.tags?.join(', ') || '');
  const [nextReview, setNextReview] = useState(article?.next_review_date || '');

  const handleSave = () => {
    onSave({
      ...(article?.id ? { id: article.id } : {}),
      title,
      body,
      article_type: articleType,
      category_id: categoryId || null,
      status,
      visibility,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      next_review_date: nextReview || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article?.id ? 'Επεξεργασία Άρθρου' : 'Νέο Άρθρο'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Τίτλος</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Τίτλος άρθρου" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Τύπος</Label>
              <Select value={articleType} onValueChange={setArticleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Άρθρο</SelectItem>
                  <SelectItem value="meeting_note">Meeting Note</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Κατηγορία</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {'─'.repeat(c.level - 1)} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="client-visible">Client Visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="onboarding, sop, quality" />
          </div>
          <div>
            <Label>Next Review Date</Label>
            <Input type="date" value={nextReview} onChange={e => setNextReview(e.target.value)} />
          </div>
          <div>
            <Label>Περιεχόμενο (Markdown)</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={12} placeholder="Γράψτε το περιεχόμενο εδώ..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>Αποθήκευση</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
