import { useState, useEffect, useMemo } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KBSearchBar } from '@/components/knowledge/KBSearchBar';
import { KBCategoryTree } from '@/components/knowledge/KBCategoryTree';
import { KBArticleCard } from '@/components/knowledge/KBArticleCard';
import { KBArticleEditor } from '@/components/knowledge/KBArticleEditor';
import { KBCategoryManager } from '@/components/knowledge/KBCategoryManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, FileText, AlertTriangle, Archive } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useNavigate } from 'react-router-dom';

export default function Knowledge() {
  const navigate = useNavigate();
  const {
    categories, articles, templates, categoriesLoading, articlesLoading,
    createArticle, createCategory, seedCategories,
  } = useKnowledgeBase();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Seed categories on first visit
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

  const stats = useMemo(() => ({
    total: articles.length,
    drafts: articles.filter(a => a.status === 'draft').length,
    pendingReview: articles.filter(a => a.next_review_date && new Date(a.next_review_date) <= new Date() && a.status !== 'deprecated').length,
    deprecated: articles.filter(a => a.status === 'deprecated').length,
  }), [articles]);

  const recentArticles = useMemo(() =>
    [...articles].filter(a => a.status !== 'deprecated').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6),
    [articles]);

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
            <Button onClick={() => setEditorOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Νέο Άρθρο
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 wide:grid-cols-4 gap-4">
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

      {/* Search */}
      <KBSearchBar value={search} onChange={setSearch} />

      <div className="grid narrow:grid-cols-[240px_1fr] gap-6">
        {/* Category Tree */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Κατηγορίες</h3>
          <KBCategoryTree categories={categories} selectedId={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {/* Articles Grid */}
        <div>
          <h3 className="text-sm font-medium mb-3">
            {search ? `Αποτελέσματα (${filteredArticles.length})` : 'Πρόσφατα Άρθρα'}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(search ? filteredArticles : recentArticles).map(article => (
              <KBArticleCard
                key={article.id}
                article={article}
                onClick={() => navigate(`/knowledge/articles/${article.id}`)}
              />
            ))}
          </div>
          {filteredArticles.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Δεν βρέθηκαν άρθρα.</p>
          )}
        </div>
      </div>

      <KBArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categories={categories}
        onSave={(data) => createArticle.mutate(data)}
      />
    </div>
  );
}
