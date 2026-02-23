import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useXPEngine } from '@/hooks/useXPEngine';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KudosDialogProps {
  recipientId: string;
  recipientName: string;
  trigger?: React.ReactNode;
}

const DEFAULT_SKILLS = [
  { name: 'Leadership', icon: '👑', color: '#f59e0b' },
  { name: 'Creativity', icon: '🎨', color: '#8b5cf6' },
  { name: 'Speed', icon: '⚡', color: '#3b82f6' },
  { name: 'Quality', icon: '💎', color: '#06b6d4' },
  { name: 'Teamwork', icon: '🤝', color: '#10b981' },
  { name: 'Communication', icon: '💬', color: '#ec4899' },
];

export function KudosDialog({ recipientId, recipientName, trigger }: KudosDialogProps) {
  const { user, company } = useAuth();
  const { awardKudos } = useXPEngine();
  const [open, setOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [skills, setSkills] = useState(DEFAULT_SKILLS);

  useEffect(() => {
    if (!company?.id || !open) return;
    supabase.from('skill_tags').select('*').eq('company_id', company.id).then(({ data }) => {
      if (data?.length) {
        setSkills(data.map(s => ({ name: s.name, icon: s.icon || '⭐', color: s.color || '#3b82f6' })));
      }
    });
  }, [company?.id, open]);

  if (!user || user.id === recipientId) return null;

  const handleSend = async () => {
    if (!selectedSkill) { toast.error('Επίλεξε skill'); return; }
    setSending(true);
    try {
      await awardKudos(recipientId, selectedSkill);
      toast.success(`Kudos στέλθηκε στον/ην ${recipientName}! 🎉`);
      setOpen(false);
      setSelectedSkill(null);
    } catch {
      toast.error('Σφάλμα αποστολής');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Heart className="h-4 w-4 text-pink-500" />
            Kudos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Kudos στον/ην {recipientName}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Επίλεξε το skill που ξεχωρίζει:</p>
        <div className="grid grid-cols-2 gap-2">
          {skills.map(skill => (
            <button
              key={skill.name}
              onClick={() => setSelectedSkill(skill.name)}
              className={cn(
                'flex items-center gap-2 rounded-xl border p-3 transition-all text-left',
                selectedSkill === skill.name
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/30 hover:bg-muted/50'
              )}
            >
              <span className="text-lg">{skill.icon}</span>
              <span className="text-sm font-medium">{skill.name}</span>
            </button>
          ))}
        </div>
        <Button onClick={handleSend} disabled={!selectedSkill || sending} className="w-full gap-2">
          <Heart className="h-4 w-4" />
          {sending ? 'Αποστολή...' : 'Στείλε Kudos (+5 XP)'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
