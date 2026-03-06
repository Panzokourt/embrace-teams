import { useState, useEffect, useMemo } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KBSearchBar } from '@/components/knowledge/KBSearchBar';
import { KBCategoryTree } from '@/components/knowledge/KBCategoryTree';
import { KBArticleCard } from '@/components/knowledge/KBArticleCard';
import { KBArticleEditor } from '@/components/knowledge/KBArticleEditor';
import { KBCategoryManager } from '@/components/knowledge/KBCategoryManager';
import { KBReviewQueue } from '@/components/knowledge/KBReviewQueue';
import { KBTemplateCard } from '@/components/knowledge/KBTemplateCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, BookOpen, FileText, AlertTriangle, Archive, FileStack, ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { KBArticle } from '@/hooks/useKnowledgeBase';

export default function Knowledge() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'articles';

  const {
    categories, articles, templates, categoriesLoading,
    createArticle, updateArticle, deleteArticle, createCategory, seedCategories,
    createTemplate, useTemplate,
  } = useKnowledgeBase();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<KBArticle | null>(null);

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

  // Playbook categories
  const companyRoot = categories.find(c => c.slug === 'company' && c.level === 1);
  const companyCats = useMemo(() => {
    if (!companyRoot) return categories;
    const ids = new Set([companyRoot.id, ...categories.filter(c => c.parent_id === companyRoot.id).map(c => c.id)]);
    return categories.filter(c => ids.has(c.id));
  }, [categories, companyRoot]);

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

  const playbookArticles = useMemo(() => {
    const catIds = new Set(companyCats.map(c => c.id));
    let list = articles.filter(a => a.status !== 'deprecated' && a.category_id && catIds.has(a.category_id));
    if (selectedCategory) {
      const subIds = new Set([selectedCategory, ...categories.filter(c => c.parent_id === selectedCategory).map(c => c.id)]);
      list = list.filter(a => a.category_id && subIds.has(a.category_id));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
    }
    return list;
  }, [articles, companyCats, selectedCategory, search, categories]);

  const filteredTemplates = useMemo(() => {
    let list = templates.filter(t => t.status !== 'deprecated');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [templates, search]);

  const stats = useMemo(() => ({
    total: articles.length,
    drafts: articles.filter(a => a.status === 'draft').length,
    pendingReview: articles.filter(a => a.next_review_date && new Date(a.next_review_date) <= new Date() && a.status !== 'deprecated').length,
    deprecated: articles.filter(a => a.status === 'deprecated').length,
  }), [articles]);

  const recentArticles = useMemo(() =>
    [...articles].filter(a => a.status !== 'deprecated').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6),
    [articles]);

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

  return (
    <div className="page-shell">
      <PageHeader
        icon={BookOpen}
        title="Knowledge Base"
        subtitle="Κεντρική βάση γνώσης της εταιρείας"
        breadcrumbs={[{ label: 'Knowledge Base' }]}
        actions={
          <div className="flex gap-2">
            <KBCategoryManager categories={categories} onCreate={(d) => createCategory.mutate(d)} onDelete={() => {}} />
            {activeTab === 'templates' ? (
              <Button onClick={() => setTplCreateOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Νέο Template
              </Button>
            ) : (
              <Button onClick={() => setEditorOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Νέο Άρθρο
              </Button>
            )}
          </div>
        }
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
          <Archive className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{stats.deprecated}</p>
          <p className="text-xs text-muted-foreground">Αρχειοθετημένα</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="articles" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Άρθρα
          </TabsTrigger>
          <TabsTrigger value="playbook" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Playbook
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileStack className="h-3.5 w-3.5" /> Templates & SOPs
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> Review Queue
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4 mt-4">
          <KBSearchBar value={search} onChange={setSearch} />
          <div className="grid narrow:grid-cols-[240px_1fr] gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Κατηγορίες</h3>
              <KBCategoryTree categories={categories} selectedId={selectedCategory} onSelect={setSelectedCategory} />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-3">
                {search ? `Αποτελέσματα (${filteredArticles.length})` : 'Πρόσφατα Άρθρα'}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(search ? filteredArticles : recentArticles).map(article => (
                  <KBArticleCard key={article.id} article={article} onClick={() => navigate(`/knowledge/articles/${article.id}`)} />
                ))}
              </div>
              {filteredArticles.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">Δεν βρέθηκαν άρθρα.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Playbook Tab */}
        <TabsContent value="playbook" className="space-y-4 mt-4">
          <KBSearchBar value={search} onChange={setSearch} />
          <div className="grid narrow:grid-cols-[240px_1fr] gap-6">
            <KBCategoryTree categories={companyCats} selectedId={selectedCategory} onSelect={setSelectedCategory} />
            <div className="grid sm:grid-cols-2 gap-3">
              {playbookArticles.map(article => (
                <KBArticleCard key={article.id} article={article} onClick={() => navigate(`/knowledge/articles/${article.id}`)} />
              ))}
              {playbookArticles.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 col-span-2 text-center">Δεν βρέθηκαν άρθρα στο playbook.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 mt-4">
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
      </Tabs>

      {/* Article Editor */}
      <KBArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categories={activeTab === 'playbook' ? companyCats : categories}
        article={activeTab === 'playbook' ? { category_id: companyRoot?.id } : undefined}
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
