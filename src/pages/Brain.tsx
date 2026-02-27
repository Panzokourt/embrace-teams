import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BrainPulse } from '@/components/brain/BrainPulse';
import { BrainCategoryFilter } from '@/components/brain/BrainCategoryFilter';
import { BrainInsightCard, type BrainInsight } from '@/components/brain/BrainInsightCard';
import { Brain, RefreshCw, Sparkles, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BrainPage() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<BrainInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  // Load existing insights
  const loadInsights = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('brain_insights' as any)
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInsights((data as any[]) || []);
      if (data && data.length > 0) {
        setLastAnalyzed(new Date((data as any[])[0].created_at));
      }
    } catch (e) {
      console.error('Error loading insights:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  // Run analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Πρέπει να είστε συνδεδεμένος", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (response.status === 429) {
        toast({ title: "Rate limit", description: "Παρακαλώ δοκιμάστε ξανά αργότερα", variant: "destructive" });
        return;
      }
      if (response.status === 402) {
        toast({ title: "Credits", description: "Χρειάζεται top-up credits", variant: "destructive" });
        return;
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Analysis failed');

      toast({ title: "Brain Analysis Complete", description: `Δημιουργήθηκαν ${result.count} νέα insights` });
      setLastAnalyzed(new Date());
      await loadInsights();
    } catch (e: any) {
      console.error('Analysis error:', e);
      toast({ title: "Σφάλμα", description: e.message || "Η ανάλυση απέτυχε", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Dismiss / Action
  const handleDismiss = async (id: string) => {
    await supabase.from('brain_insights' as any).update({ is_dismissed: true } as any).eq('id', id);
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const handleAction = async (id: string) => {
    await supabase.from('brain_insights' as any).update({ is_actioned: true } as any).eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_actioned: true } : i));
    toast({ title: "✓ Marked as actioned" });
  };

  // Filter
  const filtered = useMemo(() => {
    if (activeCategory === 'all') return insights;
    return insights.filter(i => i.category === activeCategory);
  }, [insights, activeCategory]);

  // Category counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    insights.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return c;
  }, [insights]);

  // Stats
  const highPriority = insights.filter(i => i.priority === 'high').length;
  const salesInsights = insights.filter(i => i.category === 'sales').length;

  return (
    <div className="page-shell max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brain</h1>
            <p className="text-xs text-muted-foreground">
              AI Intelligence Hub • NLP & Neuromarketing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastAnalyzed && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastAnalyzed.toLocaleString('el-GR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
            </span>
          )}
          <Button onClick={runAnalysis} disabled={isAnalyzing} size="sm" className="gap-2">
            {isAnalyzing ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Αναλύω...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Analyze Now</>
            )}
          </Button>
        </div>
      </div>

      {/* Brain Pulse */}
      <BrainPulse
        isAnalyzing={isAnalyzing}
        statusText={isAnalyzing ? "Αναλύω δεδομένα, αγορά & συμπεριφορά..." : insights.length > 0 ? `${insights.length} insights ενεργά` : "Πατήστε Analyze Now για πρώτη ανάλυση"}
      />

      {/* Stats bar */}
      {insights.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold">{insights.length}</p>
                <p className="text-[11px] text-muted-foreground">Insights</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{highPriority}</p>
                <p className="text-[11px] text-muted-foreground">Υψηλή Προτ.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{salesInsights}</p>
                <p className="text-[11px] text-muted-foreground">Sales Insights</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category filter */}
      <BrainCategoryFilter
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        counts={counts}
      />

      {/* Insights feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Φόρτωση insights...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {insights.length === 0
                ? "Δεν υπάρχουν insights ακόμα. Πατήστε Analyze Now!"
                : "Δεν υπάρχουν insights σε αυτή την κατηγορία."}
            </p>
          </div>
        ) : (
          filtered.map((insight, i) => (
            <div key={insight.id || i} className="animate-in" style={{ animationDelay: `${i * 50}ms` }}>
              <BrainInsightCard
                insight={insight}
                onDismiss={handleDismiss}
                onAction={handleAction}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
