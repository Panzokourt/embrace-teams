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
import { KBSourceUploader } from '@/components/knowledge/KBSourceUploader';
import { KBSourceList } from '@/components/knowledge/KBSourceList';
import { KBAskChat } from '@/components/knowledge/KBAskChat';
import { KBHealthCheck } from '@/components/knowledge/KBHealthCheck';
import { EmbeddingsBackfillButton } from '@/components/knowledge/EmbeddingsBackfillButton';
import { ProjectTemplatesManager } from '@/components/settings/ProjectTemplatesManager';
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
import { Plus, BookOpen, FileText, AlertTriangle, Download, FileStack, MessageCircleQuestion, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { KBArticle } from '@/hooks/useKnowledgeBase';
import type { HealthReport } from '@/hooks/useKBCompiler';

type ManageSection = 'reviews' | 'sources' | 'health';

export default function Knowledge() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'wiki';

  // Migrate old tab values
  useEffect(() => {
    const oldTabs: Record<string, string> = { articles: 'wiki', playbook: 'wiki', templates: 'blueprints', reviews: 'manage', sources: 'manage', health: 'manage' };
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
    sources, createSource, deleteSource, compileSource,
    askWiki, askAnswer, askLoading,
    healthCheck,
  } = useKBCompiler();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<KBArticle | null>(null);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [manageSection, setManageSection] = useState<ManageSection>('reviews');

  // Blueprints sub-section
  const [blueprintSection, setBlueprintSection] = useState<'briefs' | 'projects' | 'documents'>('briefs');

  // Template creation
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
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [articles, selectedCategory, search, categories]);

  const filteredTemplates = useMemo(() => {
    let list = templates.filter(t => t.status !== 'deprecated');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [templates, search]);

  const recentArticles = useMemo(() =>
    [...articles].filter(a => a.status !== 'deprecated').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6),
    [articles]);

  const stats = useMemo(() => ({
    total: articles.length,
    drafts: articles.filter(a => a.status === 'draft').length,
    pendingReview: articles.filter(a => a.next_review_date && new Date(a.next_review_date) <= new Date() && a.status !== 'deprecated').length,
    sources: sources.length,
  }), [articles, sources]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
    setSelectedCategory(null);
    setSearch('');
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

  // Dynamic header actions
  const headerActions = () => {
    if (activeTab === 'wiki') {
      return (
        <div className="flex gap-2">
          <KBCategoryManager categories={categories} onCreate={(d) => createCategory.mutate(d)} onDelete={() => {}} />
          <Button onClick={() => setEditorOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Νέο Άρθρο
          </Button>
        </div>
      );
    }
    if (activeTab === 'blueprints' && blueprintSection === 'documents') {
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 wide:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Σύνολο Άρθρων</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Badge variant="warning" className="mb-1">Draft</Badge>
          <p className="text-2xl font-bold">{stats.drafts}</p>
          <p className="text-xs text-muted-foreground">Πρόχειρα</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-warning mb-1" />
          <p className="text-2xl font-bold">{stats.pendingReview}</p>
          <p className="text-xs text-muted-foreground">Pending Review</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Download className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{stats.sources}</p>
          <p className="text-xs text-muted-foreground">Πηγές</p>
        </CardContent></Card>
      </div>

      {/* Tabs — 4 clean tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="wiki" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Wiki
          </TabsTrigger>
          <TabsTrigger value="blueprints" className="gap-1.5">
            <FileStack className="h-3.5 w-3.5" /> Blueprints
          </TabsTrigger>
          <TabsTrigger value="ask" className="gap-1.5">
            <MessageCircleQuestion className="h-3.5 w-3.5" /> Ask AI
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Manage
          </TabsTrigger>
        </TabsList>

        {/* ===== Wiki Tab (merged Articles + Playbook) ===== */}
        <TabsContent value="wiki" className="space-y-4 mt-4">
          <KBSearchBar value={search} onChange={setSearch} />
          <div className="grid narrow:grid-cols-[240px_1fr] gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Κατηγορίες</h3>
              <KBCategoryTree categories={categories} selectedId={selectedCategory} onSelect={setSelectedCategory} />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-3">
                {search || selectedCategory ? `Αποτελέσματα (${filteredArticles.length})` : 'Πρόσφατα Άρθρα'}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(search || selectedCategory ? filteredArticles : recentArticles).map(article => (
                  <KBArticleCard key={article.id} article={article} onClick={() => navigate(`/knowledge/articles/${article.id}`)} />
                ))}
              </div>
              {filteredArticles.length === 0 && (search || selectedCategory) && (
                <p className="text-sm text-muted-foreground py-8 text-center">Δεν βρέθηκαν άρθρα.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== Blueprints Tab (merged Blueprints page + KB Templates) ===== */}
        <TabsContent value="blueprints" className="space-y-4 mt-4">
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={blueprintSection === 'briefs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBlueprintSection('briefs')}
            >
              Προ-φόρμες
            </Button>
            <Button
              variant={blueprintSection === 'projects' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBlueprintSection('projects')}
            >
              Project Templates
            </Button>
            <Button
              variant={blueprintSection === 'documents' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBlueprintSection('documents')}
            >
              Document Templates
            </Button>
          </div>

          {blueprintSection === 'briefs' && <BriefsList />}

          {blueprintSection === 'projects' && <ProjectTemplatesManager />}

          {blueprintSection === 'documents' && (
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

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4 mt-4">
          <KBReviewQueue
            articles={articles}
            onApprove={(id) => updateArticle.mutate({ id, status: 'approved' })}
            onDeprecate={(id) => deleteArticle.mutate(id)}
            onSelect={(article) => setEditArticle(article)}
          />
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">
            <KBSourceList
              sources={sources}
              onCompile={(id) => compileSource.mutate(id)}
              onDelete={(id) => deleteSource.mutate(id)}
              compilingId={compileSource.isPending ? (compileSource.variables as string) : undefined}
            />
            <KBSourceUploader
              onSubmit={(data) => createSource.mutate(data)}
              isLoading={createSource.isPending}
            />
          </div>
        </TabsContent>

        {/* Ask Wiki Tab */}
        <TabsContent value="ask" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <KBAskChat onAsk={askWiki} answer={askAnswer} isLoading={askLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Manage Tab (Reviews + Sources + Health) ===== */}
        <TabsContent value="manage" className="space-y-4 mt-4">
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={manageSection === 'reviews' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setManageSection('reviews')}
            >
              Reviews
            </Button>
            <Button
              variant={manageSection === 'sources' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setManageSection('sources')}
            >
              Πηγές
            </Button>
            <Button
              variant={manageSection === 'health' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setManageSection('health')}
            >
              Health Check
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
            <div className="grid lg:grid-cols-[1fr_350px] gap-6">
              <KBSourceList
                sources={sources}
                onCompile={(id) => compileSource.mutate(id)}
                onDelete={(id) => deleteSource.mutate(id)}
                compilingId={compileSource.isPending ? (compileSource.variables as string) : undefined}
              />
              <KBSourceUploader
                onSubmit={(data) => createSource.mutate(data)}
                isLoading={createSource.isPending}
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

      {/* Template Creation Dialog */}
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
