import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BrainPulse } from '@/components/brain/BrainPulse';
import { BrainCategoryFilter } from '@/components/brain/BrainCategoryFilter';
import { BrainInsightCard, type BrainInsight } from '@/components/brain/BrainInsightCard';
import { BrainDeepDiveDialog, type DeepDiveResult } from '@/components/brain/BrainDeepDiveDialog';
import { BrainCreateActionDialog } from '@/components/brain/BrainCreateActionDialog';
import { Brain, RefreshCw, Sparkles, TrendingUp, AlertTriangle, Clock, Archive } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SavedDeepDive {
  id: string;
  insight_title: string;
  insight_category: string | null;
  extended_analysis: string;
  action_plan: any[];
  suggested_project: any;
  suggested_task: any;
  created_at: string;
}

export default function BrainPage() {
  const { user, companyRole } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<BrainInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [mainTab, setMainTab] = useState('insights');

  // Deep dive state
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveResult, setDeepDiveResult] = useState<DeepDiveResult | null>(null);
  const [deepDiveInsight, setDeepDiveInsight] = useState<BrainInsight | null>(null);
  const [deepDiveSaved, setDeepDiveSaved] = useState(false);

  // Create action state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<'project' | 'task'>('project');
  const [createInsight, setCreateInsight] = useState<BrainInsight | null>(null);
  const [suggestedProject, setSuggestedProject] = useState<any>(null);
  const [suggestedTask, setSuggestedTask] = useState<any>(null);

  // Saved deep dives
  const [savedDives, setSavedDives] = useState<SavedDeepDive[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

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

  const loadSavedDives = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('brain_deep_dives' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setSavedDives((data as any[]) || []);
    } catch (e) {
      console.error('Error loading saved dives:', e);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);
  useEffect(() => { if (mainTab === 'saved') loadSavedDives(); }, [mainTab, loadSavedDives]);

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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({}),
        }
      );
      if (response.status === 429) { toast({ title: "Rate limit", description: "Δοκιμάστε ξανά αργότερα", variant: "destructive" }); return; }
      if (response.status === 402) { toast({ title: "Credits", description: "Χρειάζεται top-up credits", variant: "destructive" }); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Analysis failed');
      toast({ title: "Brain Analysis Complete", description: `Δημιουργήθηκαν ${result.count} νέα insights` });
      setLastAnalyzed(new Date());
      await loadInsights();
    } catch (e: any) {
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

  // Deep Dive
  const handleDeepDive = async (insight: BrainInsight) => {
    setDeepDiveInsight(insight);
    setDeepDiveResult(null);
    setDeepDiveOpen(true);
    setDeepDiveLoading(true);
    setDeepDiveSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-deep-analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ insight }),
        }
      );
      if (response.status === 429) { toast({ title: "Rate limit", description: "Δοκιμάστε ξανά αργότερα", variant: "destructive" }); return; }
      if (response.status === 402) { toast({ title: "Credits", description: "Χρειάζεται top-up credits", variant: "destructive" }); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Deep analysis failed');
      setDeepDiveResult(result);
    } catch (e: any) {
      toast({ title: "Σφάλμα", description: e.message, variant: "destructive" });
      setDeepDiveOpen(false);
    } finally {
      setDeepDiveLoading(false);
    }
  };

  // Save deep dive
  const handleSaveDeepDive = async () => {
    if (!deepDiveResult || !deepDiveInsight) return;
    try {
      if (!user || !companyRole?.company_id) throw new Error('Not authenticated');

      const { error } = await supabase.from('brain_deep_dives' as any).insert({
        insight_id: deepDiveInsight.id || null,
        company_id: companyRole.company_id,
        user_id: user.id,
        insight_title: deepDiveInsight.title,
        insight_category: deepDiveInsight.category,
        extended_analysis: deepDiveResult.extended_analysis,
        action_plan: deepDiveResult.action_plan || [],
        suggested_project: deepDiveResult.suggested_project || null,
        suggested_task: deepDiveResult.suggested_task || null,
      } as any);
      if (error) throw error;
      setDeepDiveSaved(true);
      toast({ title: "✓ Αποθηκεύτηκε", description: "Η ανάλυση αποθηκεύτηκε στο Brain Archive" });
    } catch (e: any) {
      toast({ title: "Σφάλμα", description: e.message, variant: "destructive" });
    }
  };

  // View saved deep dive
  const handleViewSaved = (dive: SavedDeepDive) => {
    setDeepDiveInsight({ title: dive.insight_title, category: dive.insight_category || 'strategic', body: '', evidence: [], priority: 'medium', neuro_tactic: '', neuro_rationale: '' });
    setDeepDiveResult({
      extended_analysis: dive.extended_analysis,
      action_plan: dive.action_plan || [],
      suggested_project: dive.suggested_project,
      suggested_task: dive.suggested_task,
    });
    setDeepDiveSaved(true);
    setDeepDiveOpen(true);
    setDeepDiveLoading(false);
  };

  // Delete saved deep dive
  const handleDeleteSaved = async (id: string) => {
    await supabase.from('brain_deep_dives' as any).delete().eq('id', id);
    setSavedDives(prev => prev.filter(d => d.id !== id));
    toast({ title: "✓ Διαγράφηκε" });
  };

  // Create from insight (direct)
  const handleCreateProject = (insight: BrainInsight) => {
    setCreateInsight(insight);
    const clientEvidence = insight.evidence.find(e => e.type === 'client');
    setSuggestedProject({ name: insight.title, description: insight.body.slice(0, 500), client_id: clientEvidence?.id || '' });
    setSuggestedTask(null);
    setCreateTab('project');
    setCreateOpen(true);
  };

  const handleCreateTask = (insight: BrainInsight) => {
    setCreateInsight(insight);
    setSuggestedTask({ title: insight.title, description: insight.body.slice(0, 500), priority: insight.priority === 'high' ? 'high' : 'medium' });
    setSuggestedProject(null);
    setCreateTab('task');
    setCreateOpen(true);
  };

  // Create from deep dive (with AI suggestions)
  const handleDeepDiveCreateProject = (suggested: any) => {
    setCreateInsight(deepDiveInsight);
    setSuggestedProject(suggested);
    setSuggestedTask(null);
    setCreateTab('project');
    setCreateOpen(true);
  };

  const handleDeepDiveCreateTask = (suggested: any) => {
    setCreateInsight(deepDiveInsight);
    setSuggestedTask(suggested);
    setSuggestedProject(null);
    setCreateTab('task');
    setCreateOpen(true);
  };

  // Filter
  const filtered = useMemo(() => {
    if (activeCategory === 'all') return insights;
    return insights.filter(i => i.category === activeCategory);
  }, [insights, activeCategory]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    insights.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return c;
  }, [insights]);

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
            <p className="text-xs text-muted-foreground">AI Intelligence Hub • NLP & Neuromarketing</p>
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
            {isAnalyzing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Αναλύω...</> : <><Sparkles className="h-4 w-4" /> Analyze Now</>}
          </Button>
        </div>
      </div>

      <BrainPulse
        isAnalyzing={isAnalyzing}
        statusText={isAnalyzing ? "Αναλύω δεδομένα, αγορά & συμπεριφορά..." : insights.length > 0 ? `${insights.length} insights ενεργά` : "Πατήστε Analyze Now για πρώτη ανάλυση"}
      />

      {/* Stats bar */}
      {insights.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10"><Brain className="h-4 w-4" /></div>
            <div><p className="text-lg font-bold">{insights.length}</p><p className="text-[11px] text-muted-foreground">Insights</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
            <div><p className="text-lg font-bold">{highPriority}</p><p className="text-[11px] text-muted-foreground">Υψηλή Προτ.</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
            <div><p className="text-lg font-bold">{salesInsights}</p><p className="text-[11px] text-muted-foreground">Sales Insights</p></div>
          </CardContent></Card>
        </div>
      )}

      {/* Main tabs: Insights / Saved */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="h-8">
          <TabsTrigger value="insights" className="text-xs gap-1.5"><Brain className="h-3 w-3" /> Insights</TabsTrigger>
          <TabsTrigger value="saved" className="text-xs gap-1.5"><Archive className="h-3 w-3" /> Αρχείο Αναλύσεων</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-3 mt-3">
          <BrainCategoryFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} counts={counts} />

          {/* Insights feed */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Φόρτωση insights...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {insights.length === 0 ? "Δεν υπάρχουν insights ακόμα. Πατήστε Analyze Now!" : "Δεν υπάρχουν insights σε αυτή την κατηγορία."}
                </p>
              </div>
            ) : (
              filtered.map((insight, i) => (
                <div key={insight.id || i} className="animate-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <BrainInsightCard
                    insight={insight}
                    onDismiss={handleDismiss}
                    onAction={handleAction}
                    onDeepDive={handleDeepDive}
                    onCreateProject={handleCreateProject}
                    onCreateTask={handleCreateTask}
                  />
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="space-y-3 mt-3">
          {loadingSaved ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Φόρτωση...</div>
          ) : savedDives.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Δεν υπάρχουν αποθηκευμένες αναλύσεις.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Πατήστε "Αποθήκευση" σε ένα Deep Dive για να το κρατήσετε εδώ.</p>
            </div>
          ) : (
            savedDives.map((dive) => (
              <Card key={dive.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewSaved(dive)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold truncate">{dive.insight_title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(dive.created_at).toLocaleString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {dive.insight_category && ` • ${dive.insight_category}`}
                        {dive.action_plan?.length ? ` • ${dive.action_plan.length} βήματα` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dive.extended_analysis.slice(0, 200)}...</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-destructive shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSaved(dive.id); }}
                    >
                      Διαγραφή
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Deep Dive Dialog */}
      <BrainDeepDiveDialog
        open={deepDiveOpen}
        onOpenChange={setDeepDiveOpen}
        isLoading={deepDiveLoading}
        result={deepDiveResult}
        insightTitle={deepDiveInsight?.title || ''}
        onCreateProject={handleDeepDiveCreateProject}
        onCreateTask={handleDeepDiveCreateTask}
        onSave={handleSaveDeepDive}
        isSaved={deepDiveSaved}
      />

      {/* Create Action Dialog */}
      <BrainCreateActionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultTab={createTab}
        suggestedProject={suggestedProject}
        suggestedTask={suggestedTask}
        insightId={createInsight?.id}
      />
    </div>
  );
}
