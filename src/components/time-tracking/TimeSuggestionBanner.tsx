import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TimeSuggestion {
  task_id: string;
  task_title: string;
  project_name?: string;
  suggested_minutes: number;
  description: string;
}

export function TimeSuggestionBanner() {
  const { user } = useAuth();
  const { addManualEntry } = useTimeTracking();
  const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-time-suggest');
      if (error) throw error;
      setSuggestions(data.suggestions || []);
      setSummary(data.summary || '');
      setFetched(true);
    } catch (err) {
      console.error(err);
      toast.error('Αποτυχία φόρτωσης προτάσεων');
    } finally {
      setLoading(false);
    }
  };

  const approveSuggestion = async (s: TimeSuggestion) => {
    setApproving(prev => ({ ...prev, [s.task_id]: true }));
    try {
      // Get project_id from the task
      const { data: task } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('id', s.task_id)
        .single();

      if (!task) throw new Error('Task not found');

      const now = new Date();
      const start = new Date(now.getTime() - s.suggested_minutes * 60000);

      await addManualEntry({
        task_id: s.task_id,
        project_id: task.project_id,
        start_time: start.toISOString(),
        end_time: now.toISOString(),
        description: s.description,
      });

      setDismissed(prev => new Set(prev).add(s.task_id));
      toast.success(`Καταχωρήθηκαν ${s.suggested_minutes} λεπτά για "${s.task_title}"`);
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα καταχώρησης');
    } finally {
      setApproving(prev => ({ ...prev, [s.task_id]: false }));
    }
  };

  const dismissSuggestion = (taskId: string) => {
    setDismissed(prev => new Set(prev).add(taskId));
  };

  const activeSuggestions = suggestions.filter(s => !dismissed.has(s.task_id));

  if (!fetched) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Προτάσεις χρόνου</span>
            <span className="text-xs text-muted-foreground">— Πάτα για να δεις τι προτείνει η AI για σήμερα</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchSuggestions} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Ανάλυση
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (activeSuggestions.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Προτάσεις Χρόνου
        </CardTitle>
        {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {activeSuggestions.map((s) => (
          <div key={s.task_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/80 border border-border/40">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.task_title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {s.project_name && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{s.project_name}</Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {s.suggested_minutes >= 60
                    ? `${Math.floor(s.suggested_minutes / 60)}ω ${s.suggested_minutes % 60 > 0 ? `${s.suggested_minutes % 60}λ` : ''}`
                    : `${s.suggested_minutes}λ`
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => approveSuggestion(s)}
                disabled={approving[s.task_id]}
              >
                {approving[s.task_id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => dismissSuggestion(s.task_id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
