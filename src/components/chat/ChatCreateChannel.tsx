import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatCreateChannelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (params: { name: string; type: 'public' | 'private' | 'group'; description?: string }) => void;
}

export default function ChatCreateChannel({ open, onOpenChange, onCreate }: ChatCreateChannelProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private' | 'group'>('public');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name: name.trim(), type, description: description.trim() || undefined });
      setName('');
      setType('public');
      setDescription('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Νέο Κανάλι</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Όνομα</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="π.χ. general, marketing"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label>Τύπος</Label>
            <Select value={type} onValueChange={v => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Δημόσιο</SelectItem>
                <SelectItem value="private">Ιδιωτικό</SelectItem>
                <SelectItem value="group">Ομαδικό</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Περιγραφή (προαιρετική)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Σκοπός του καναλιού..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading ? 'Δημιουργία...' : 'Δημιουργία'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
