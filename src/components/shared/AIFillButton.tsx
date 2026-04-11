import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIFillButtonProps {
  formType: 'project' | 'task' | 'client' | 'invoice';
  onFill: (data: Record<string, any>) => void;
  context?: Record<string, any>;
  placeholder?: string;
  className?: string;
}

export function AIFillButton({ formType, onFill, context, placeholder, className }: AIFillButtonProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const placeholders: Record<string, string> = {
    project: 'Περίγραψε το project, π.χ. "Website redesign για e-shop, budget 5000€"',
    task: 'Περίγραψε το task, π.χ. "Δημιουργία landing page για Black Friday"',
    client: 'Paste website URL ή περίγραψε τον πελάτη',
    invoice: 'Περίγραψε τι τιμολογείται, π.χ. "Τελική πληρωμή project"',
  };

  const handleFill = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-fill-form', {
        body: { formType, userInput: input, context },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.data) {
        onFill(data.data);
        toast.success('Τα πεδία συμπληρώθηκαν με AI');
        setOpen(false);
        setInput('');
      }
    } catch (err) {
      console.error('AI fill error:', err);
      toast.error('Σφάλμα κατά τη συμπλήρωση με AI');
    } finally {
      setLoading(false);
    }
  }, [input, formType, context, onFill]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn('gap-1.5 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600', className)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Fill
      </Button>
    );
  }

  return (
    <div className={cn('flex gap-2 p-2 rounded-lg border border-amber-500/30 bg-amber-500/5', className)}>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder || placeholders[formType]}
        className="text-sm h-8 flex-1"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFill(); } }}
        autoFocus
        disabled={loading}
      />
      <Button
        type="button"
        size="sm"
        onClick={handleFill}
        disabled={loading || !input.trim()}
        className="h-8 bg-amber-500 hover:bg-amber-600 text-white"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => { setOpen(false); setInput(''); }}
        className="h-8 w-8 p-0"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
