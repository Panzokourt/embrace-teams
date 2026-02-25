import { useState, useMemo } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KBCategoryTree } from '@/components/knowledge/KBCategoryTree';
import { KBArticleCard } from '@/components/knowledge/KBArticleCard';
import { KBArticleEditor } from '@/components/knowledge/KBArticleEditor';
import { KBSearchBar } from '@/components/knowledge/KBSearchBar';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function KnowledgePlaybook() {
  const navigate = useNavigate();
  const { categories, articles, createArticle } = useKnowledgeBase();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Only company-level categories
  const companyRoot = categories.find(c => c.slug === 'company' && c.level === 1);
  const companyCats = useMemo(() => {
    if (!companyRoot) return categories;
    const ids = new Set([companyRoot.id, ...categories.filter(c => c.parent_id === companyRoot.id).map(c => c.id)]);
    return categories.filter(c => ids.has(c.id));
  }, [categories, companyRoot]);

  const companyArticles = useMemo(() => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Company Playbook
        </h1>
        <Button onClick={() => setEditorOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Νέο Άρθρο
        </Button>
      </div>

      <KBSearchBar value={search} onChange={setSearch} />

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <KBCategoryTree categories={companyCats} selectedId={selectedCategory} onSelect={setSelectedCategory} />
        <div className="grid sm:grid-cols-2 gap-3">
          {companyArticles.map(article => (
            <KBArticleCard key={article.id} article={article} onClick={() => navigate(`/knowledge/articles/${article.id}`)} />
          ))}
          {companyArticles.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 col-span-2 text-center">Δεν βρέθηκαν άρθρα στο playbook.</p>
          )}
        </div>
      </div>

      <KBArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categories={companyCats}
        article={{ category_id: companyRoot?.id }}
        onSave={(data) => createArticle.mutate(data)}
      />
    </div>
  );
}
