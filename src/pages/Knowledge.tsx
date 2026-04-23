import { useState, useEffect, useMemo } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useKBCompiler } from '@/hooks/useKBCompiler';
import { KBSearchBar } from '@/components/knowledge/KBSearchBar';
import { KBCategoryTree } from '@/components/knowledge/KBCategoryTree';
import { KBArticleCard } from '@/components/knowledge/KBArticleCard';
import { KBArticleEditor } from '@/components/knowledge/KBArticleEditor';
import { KBCategoryManager } from '@/components/knowledge/KBCategoryManager';
import { KBReviewQueue } from '@/components/knowledge/KBReviewQueue';
import { KBTemplateCard } from '@/components/knowledge/KBTemplateCard';
import { KBSourceList } from '@/components/knowledge/KBSourceList';
import { KBHealthCheck } from '@/components/knowledge/KBHealthCheck';
import { KBPendingSourcesStrip } from '@/components/knowledge/KBPendingSourcesStrip';
import { KBImportDialog } from '@/components/knowledge/KBImportDialog';
import { AskExploreView } from '@/components/knowledge/AskExploreView';
import { KBSuggestionsPanel } from '@/components/knowledge/KBSuggestionsPanel';
import { KBAIComposeDialog } from '@/components/knowledge/KBAIComposeDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { KBSuggestion } from '@/hooks/useKBSuggestions';
import { EmbeddingsBackfillButton } from '@/components/knowledge/EmbeddingsBackfillButton';
import { BriefsList } from '@/components/blueprints/BriefsList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Plus, BookOpen, FileText, AlertTriangle, Activity, FileStack,
  MessageCircleQuestion, Settings2, Upload, ArrowRight, Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { KBArticle } from '@/hooks/useKnowledgeBase';
import type { HealthReport } from '@/hooks/useKBCompiler';

type ManageSection = 'reviews' | 'sources' | 'health';
type TemplateSection = 'briefs' | 'documents';

export default function Knowledge() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'library';

  // Migrate old tab values to new structure
  useEffect(() => {
    const oldTabs: Record<string, string> = {
      articles: 'library',
      playbook: 'library',
      wiki: 'library',
      templates: 'templates',
      blueprints: 'templates',
      reviews: 'admin',
      sources: 'admin',
      health: 'admin',
      manage: 'admin',
      ask: 'discover',
      graph: 'discover',
    };
    if (oldTabs[activeTab]) {
      setSearchParams({ tab: oldTabs[activeTab] }, { replace: true });
    }
  }, [activeTab]);

  const {
    categories, articles, templates, categoriesLoading,
    createArticle, updateArticle, deleteArticle, createCategory, seedCategories,
    createTemplate, useTemplate,
  } = useKnowledgeBase();

  const {
    sources, deleteSource, compileSource,
    askWiki, askAnswer, askLoading,
    healthCheck,
  } = useKBCompiler();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'review'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<KBArticle | null>(null);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [manageSection, setManageSection] = useState<ManageSection>('reviews');
  const [templateSection, setTemplateSection] = useState<TemplateSection>('briefs');

  // AI Compose από suggestion / button
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSeed, setComposeSeed] = useState<{ title?: string; brief?: string; type?: string } | null>(null);

  // Document Template creation
  const [tplCreateOpen, setTplCreateOpen] = useState(false);
  const [tplTitle, setTplTitle] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplType, setTplType] = useState('sop');

  useEffect(() => {
    if (!categoriesLoading && categories.length === 0) {
      seedCategories.mutate();
    }
  }, [categoriesLoading, categories.length]);

  const filteredArticles = useMemo(() => {
    let list = articles.filter(a => a.status !== 'deprecated');
    if (selectedCategory) {
      const catIds = new Set([selectedCategory, ...categories.filter(c => c.parent_id === selectedCategory).map(c => c.id)]);
      list = list.filter(a => a.category_id && catIds.has(a.category_id));
    }
    if (statusFilter === 'draft') list = list.filter(a => a.status === 'draft');
    else if (statusFilter === 'approved') list = list.filter(a => a.status === 'approved');
    else if (statusFilter === 'review') {
      list = list.filter(a => a.next_review_date && new Date(a.next_review_date) <= new Date());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [articles, selectedCategory, search, categories, statusFilter]);

  const filteredTemplates = useMemo(() => {
    let list = templates.filter(t => t.status !== 'deprecated');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [templates, search]);

  const recentArticles = useMemo(() =>
    [...articles].filter(a => a.status !== 'deprecated').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 9),
    [articles]);

  const stats = useMemo(() => {
    const myPending = articles.filter(a => {
      if (a.status === 'deprecated') return false;
      if (a.review_status === 'pending' && a.reviewer_id === profile?.id) return true;
      return false;
    }).length;
    const allPending = articles.filter(a => {
      if (a.status === 'deprecated') return false;
      if (a.review_status === 'pending') return true;
      if (a.status === 'draft') return true;
      if (a.next_review_date && new Date(a.next_review_date) <= new Date()) return true;
      return false;
    }).length;
    return {
      total: articles.length,
      sourcesPending: sources.filter(s => !s.compiled).length,
      pendingReview: myPending > 0 ? myPending : allPending,
      pendingReviewMine: myPending,
      healthScore: healthReport?.overall_score ?? null,
    };
  }, [articles, sources, healthReport, profile?.id]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
    setSelectedCategory(null);
    setSearch('');
    setStatusFilter('all');
  };

  const handleCreateTemplate = () => {
    createTemplate.mutate({ title: tplTitle, description: tplDesc, template_type: tplType });
    setTplTitle(''); setTplDesc(''); setTplType('sop');
    setTplCreateOpen(false);
  };

  const handleRunHealth = async () => {
    const result = await healthCheck.mutateAsync();
    setHealthReport(result);
  };

  const handleComposeFromSuggestion = (s: KBSuggestion) => {
    setComposeSeed({ title: s.title, brief: s.topic_brief || s.reasoning, type: s.type });
    setComposeOpen(true);
  };

  const handleComposeAccept = (data: { title: string; body: string; categoryId: string | null; articleType: string; tags: string[] }) => {
    createArticle.mutate({
      title: data.title,
      body: data.body,
      article_type: data.articleType,
      category_id: data.categoryId,
      status: 'draft',
      visibility: 'internal',
      tags: data.tags,
    } as Partial<KBArticle>);
  };

  // Dynamic header actions
  const headerActions = () => {
    if (activeTab === 'library') {
      return (
        <div className="flex gap-2">
          <KBCategoryManager categories={categories} onCreate={(d) => createCategory.mutate(d)} onDelete={() => {}} />
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1">
            <Upload className="h-4 w-4" /> Εισαγωγή
          </Button>
          <Button variant="outline" onClick={() => { setComposeSeed(null); setComposeOpen(true); }} className="gap-1">
            <Sparkles className="h-4 w-4" /> AI Σύνταξη
          </Button>
          <Button onClick={() => setEditorOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Νέο Άρθρο
          </Button>
        </div>
      );
    }
    if (activeTab === 'templates' && templateSection === 'documents') {
      return (
        <Button onClick={() => setTplCreateOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Νέο Template
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="page-shell">
      <PageHeader
        icon={BookOpen}
        title="Knowledge Base"
        subtitle="Κεντρική βάση γνώσης της εταιρείας"
        breadcrumbs={[{ label: 'Knowledge Base' }]}
        actions={headerActions()}
      />

      {/* KPI Cards — actionable */}
      <div className="grid grid-cols-2 wide:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setTab('library'); setStatusFilter('all'); }}>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Άρθρα Wiki</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-warning/50 transition-colors" onClick={() => { setTab('admin'); setManageSection('sources'); }}>
          <CardContent className="p-4 text-center">
            <Upload className="h-5 w-5 mx-auto text-warning mb-1" />
            <p className="text-2xl font-bold">{stats.sourcesPending}</p>
            <p className="text-xs text-muted-foreground">Πηγές Pending</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-warning/50 transition-colors" onClick={() => { setTab('admin'); setManageSection('reviews'); }}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-warning mb-1" />
            <p className="text-2xl font-bold">{stats.pendingReview}</p>
            <p className="text-xs text-muted-foreground">Εκκρεμή Reviews</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setTab('admin'); setManageSection('health'); }}>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">
              {stats.healthScore != null ? `${stats.healthScore}` : '—'}
              {stats.healthScore != null && <span className="text-sm text-muted-foreground">/100</span>}
            </p>
            <p className="text-xs text-muted-foreground">Health Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs — 4 clean tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="library" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Βιβλιοθήκη
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileStack className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-1.5">
            <MessageCircleQuestion className="h-3.5 w-3.5" /> Ρώτα & Εξερεύνησε
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Διαχείριση
          </TabsTrigger>
        </TabsList>

        {/* ===== LIBRARY ===== */}
        <TabsContent value="library" className="space-y-4 mt-4">
          <KBPendingSourcesStrip onImport={() => setImportOpen(true)} />
          <KBSuggestionsPanel onCompose={handleComposeFromSuggestion} />
          <KBSearchBar value={search} onChange={setSearch} />
          <div className="grid narrow:grid-cols-[240px_1fr] gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Κατηγορίες</h3>
              <KBCategoryTree categories={categories} selectedId={selectedCategory} onSelect={setSelectedCategory} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h3 className="text-sm font-medium">
                  {search || selectedCategory || statusFilter !== 'all'
                    ? `Αποτελέσματα (${filteredArticles.length})`
                    : 'Πρόσφατα Άρθρα'}
                </h3>
                <div className="inline-flex bg-muted rounded-md p-0.5 text-xs">
                  {(['all', 'draft', 'approved', 'review'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        statusFilter === f ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f === 'all' ? 'Όλα' : f === 'draft' ? 'Drafts' : f === 'approved' ? 'Approved' : 'Needs review'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(search || selectedCategory || statusFilter !== 'all' ? filteredArticles : recentArticles).map(article => (
                  <KBArticleCard key={article.id} article={article} onClick={() => navigate(`/knowledge/articles/${article.id}`)} />
                ))}
              </div>
              {filteredArticles.length === 0 && (search || selectedCategory || statusFilter !== 'all') && (
                <div className="text-sm text-muted-foreground py-12 text-center space-y-3">
                  <p>Δεν βρέθηκαν άρθρα.</p>
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1">
                    <Upload className="h-3.5 w-3.5" /> Εισαγωγή νέας πηγής
                  </Button>
                </div>
              )}
              {recentArticles.length === 0 && !search && !selectedCategory && statusFilter === 'all' && (
                <Card>
                  <CardContent className="py-10 text-center space-y-3">
                    <BookOpen className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">Δεν υπάρχουν άρθρα ακόμη. Ξεκίνα ανεβάζοντας έγγραφα ή γράφοντας το πρώτο σου άρθρο.</p>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1">
                        <Upload className="h-4 w-4" /> Ανέβασμα εγγράφων
                      </Button>
                      <Button onClick={() => setEditorOpen(true)} className="gap-1">
                        <Plus className="h-4 w-4" /> Νέο άρθρο
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== TEMPLATES ===== */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={templateSection === 'briefs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTemplateSection('briefs')}
            >
              Briefs
            </Button>
            <Button
              variant={templateSection === 'documents' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTemplateSection('documents')}
            >
              Document Templates
            </Button>
            <div className="ml-auto text-xs text-muted-foreground self-center hidden md:flex items-center gap-1">
              <span>Project Templates →</span>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs gap-0.5" onClick={() => navigate('/settings?tab=templates')}>
                Ρυθμίσεις <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {templateSection === 'briefs' && <BriefsList />}

          {templateSection === 'documents' && (
            <div className="space-y-4">
              <KBSearchBar value={search} onChange={setSearch} placeholder="Αναζήτηση templates..." />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(tpl => (
                  <KBTemplateCard
                    key={tpl.id}
                    template={tpl}
                    onUse={() => useTemplate.mutate({ templateId: tpl.id })}
                    onEdit={() => {}}
                  />
                ))}
              </div>
              {filteredTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Δεν βρέθηκαν templates.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== DISCOVER (Ask + Graph) ===== */}
        <TabsContent value="discover" className="mt-4">
          <AskExploreView onAsk={askWiki} answer={askAnswer} isLoading={askLoading} />
        </TabsContent>

        {/* ===== ADMIN ===== */}
        <TabsContent value="admin" className="space-y-4 mt-4">
          <div className="flex gap-2 border-b pb-2 flex-wrap">
            <Button
              variant={manageSection === 'reviews' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setManageSection('reviews')}
            >
              Reviews
              {stats.pendingReview > 0 && (
                <Badge variant="warning" className="ml-1.5 h-5 px-1.5 text-[10px]">{stats.pendingReview}</Badge>
              )}
            </Button>
            <Button
              variant={manageSection === 'sources' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setManageSection('sources')}
            >
              Πηγές
              {stats.sourcesPending > 0 && (
                <Badge variant="warning" className="ml-1.5 h-5 px-1.5 text-[10px]">{stats.sourcesPending}</Badge>
              )}
            </Button>
            <Button
              variant={manageSection === 'health' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setManageSection('health')}
            >
              Health & Embeddings
            </Button>
            <div className="ml-auto">
              <EmbeddingsBackfillButton />
            </div>
          </div>

          {manageSection === 'reviews' && (
            <KBReviewQueue
              articles={articles}
              onApprove={(id) => updateArticle.mutate({ id, status: 'approved' })}
              onDeprecate={(id) => deleteArticle.mutate(id)}
              onSelect={(article) => setEditArticle(article)}
            />
          )}

          {manageSection === 'sources' && (
            <div className="space-y-3">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Εισαγωγή νέας πηγής</p>
                    <p className="text-xs text-muted-foreground">Ανέβασε αρχεία (PDF/DOCX), επικόλλησε κείμενο ή πρόσθεσε URL.</p>
                  </div>
                  <Button onClick={() => setImportOpen(true)} className="gap-1">
                    <Upload className="h-4 w-4" /> Εισαγωγή
                  </Button>
                </CardContent>
              </Card>
              <KBSourceList
                sources={sources}
                onCompile={(id) => compileSource.mutate(id)}
                onDelete={(id) => deleteSource.mutate(id)}
                compilingId={compileSource.isPending ? (compileSource.variables as string) : undefined}
              />
            </div>
          )}

          {manageSection === 'health' && (
            <KBHealthCheck
              report={healthReport}
              onRun={handleRunHealth}
              isLoading={healthCheck.isPending}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Article Editor */}
      <KBArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categories={categories}
        onSave={(data) => createArticle.mutate(data)}
      />

      {/* Edit article from review queue */}
      {editArticle && (
        <KBArticleEditor
          open={!!editArticle}
          onOpenChange={(v) => !v && setEditArticle(null)}
          article={editArticle}
          categories={categories}
          onSave={(data) => {
            updateArticle.mutate({ id: editArticle.id, ...data });
            setEditArticle(null);
          }}
        />
      )}

      {/* Unified Import Dialog */}
      <KBImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Document Template Creation Dialog */}
      <Dialog open={tplCreateOpen} onOpenChange={setTplCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Νέο Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Τίτλος</Label><Input value={tplTitle} onChange={e => setTplTitle(e.target.value)} /></div>
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
            <div><Label>Περιγραφή</Label><Textarea value={tplDesc} onChange={e => setTplDesc(e.target.value)} rows={4} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTplCreateOpen(false)}>Ακύρωση</Button>
              <Button onClick={handleCreateTemplate} disabled={!tplTitle.trim()}>Δημιουργία</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
