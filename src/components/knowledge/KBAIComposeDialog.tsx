import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { KBCategory } from '@/hooks/useKnowledgeBase';

interface KBAIComposeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: KBCategory[];
  defaultCategoryId?: string | null;
  defaultTitle?: string;
  defaultBrief?: string;
  defaultType?: string;
  /** Καλείται με το τελικό draft. Ο parent αναλαμβάνει την αποθήκευση. */
  onAccept: (data: { title: string; body: string; categoryId: string | null; articleType: string; tags: string[] }) => void;
}

export function KBAIComposeDialog({
  open, onOpenChange, categories, defaultCategoryId, defaultTitle, defaultBrief, defaultType, onAccept,
}: KBAIComposeDialogProps) {
  const { companyRole } = useAuth();
  const companyId = companyRole?.company_id;

  const [title, setTitle] = useState(defaultTitle || '');
  const [topic, setTopic] = useState(defaultBrief || '');
  const [articleType, setArticleType] = useState(defaultType || 'article');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId || '__none__');
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);

  const reset = () => {
    setDraft('');
    setStreaming(false);
  };

  const generate = useCallback(async () => {
    if (!topic.trim()) { toast.error('Δώσε ένα brief'); return; }
    setDraft('');
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kb-ai-compose`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          title, topic, articleType, tone, length,
          categoryId: categoryId !== '__none__' ? categoryId : null,
          companyId,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error('Πολλά αιτήματα. Δοκίμασε σε λίγο.');
        else if (resp.status === 402) toast.error('Χρειάζεται top-up στο workspace.');
        else toast.error(err.error || 'Σφάλμα generation');
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { acc += c; setDraft(acc); }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα');
    } finally {
      setStreaming(false);
    }
  }, [title, topic, articleType, tone, length, categoryId, companyId]);

  const handleAccept = () => {
    if (!draft.trim()) { toast.error('Δεν υπάρχει draft'); return; }

    // Extract tags από "## Tags" section αν υπάρχει
    const tagsMatch = draft.match(/##\s*Tags\s*\n([^\n]+)/i);
    const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/[`*]/g, '')).filter(Boolean).slice(0, 6) : [];
    const cleanedBody = draft.replace(/##\s*Tags[\s\S]*$/i, '').trim();

    // Extract title από H1 αν δεν δόθηκε
    const h1Match = cleanedBody.match(/^#\s+(.+)$/m);
    const finalTitle = title.trim() || h1Match?.[1] || topic.substring(0, 60);
    const finalBody = h1Match ? cleanedBody.replace(/^#\s+.+\n+/m, '') : cleanedBody;

    onAccept({
      title: finalTitle,
      body: finalBody,
      categoryId: categoryId !== '__none__' ? categoryId : null,
      articleType,
      tags,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Σύνταξη Άρθρου
          </DialogTitle>
          <DialogDescription>
            Περίγραψε το θέμα και η AI θα γράψει draft βάσει των δεδομένων της εταιρείας σου.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Τίτλος (προαιρετικό)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Αν κενό, παράγεται αυτόματα" />
            </div>
            <div>
              <Label>Κατηγορία</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Καμία —</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{'─'.repeat(c.level - 1)} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Τύπος</Label>
              <Select value={articleType} onValueChange={setArticleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Άρθρο</SelectItem>
                  <SelectItem value="sop">SOP</SelectItem>
                  <SelectItem value="guide">Οδηγός</SelectItem>
                  <SelectItem value="policy">Πολιτική</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Επαγγελματικό</SelectItem>
                  <SelectItem value="friendly">Φιλικό</SelectItem>
                  <SelectItem value="formal">Επίσημο</SelectItem>
                  <SelectItem value="concise">Συνοπτικό</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Μήκος</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Σύντομο</SelectItem>
                  <SelectItem value="medium">Μεσαίο</SelectItem>
                  <SelectItem value="long">Εκτενές</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Brief / Θέμα</Label>
            <Textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              rows={4}
              placeholder="Περίγραψε τι θέλεις να καλύπτει το άρθρο. Π.χ. 'Onboarding διαδικασία νέου πελάτη Performance — βήματα, υπεύθυνοι, deliverables'"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={generate} disabled={streaming || !topic.trim()} className="gap-1">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {draft ? 'Δημιουργία ξανά' : 'Δημιουργία'}
            </Button>
            {draft && !streaming && (
              <Button variant="outline" onClick={generate} className="gap-1">
                <RotateCw className="h-4 w-4" /> Άλλη εκδοχή
              </Button>
            )}
          </div>

          {(draft || streaming) && (
            <div className="space-y-2">
              <Label>Draft (επεξεργάσιμο)</Label>
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={16}
                className="font-mono text-xs"
                placeholder={streaming ? 'Γράφει η AI…' : ''}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button onClick={handleAccept} disabled={!draft.trim() || streaming}>
              Αποδοχή & Άνοιγμα στον Editor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
