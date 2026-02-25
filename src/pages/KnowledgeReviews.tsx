import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KBReviewQueue } from '@/components/knowledge/KBReviewQueue';
import { KBArticleEditor } from '@/components/knowledge/KBArticleEditor';
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { KBArticle } from '@/hooks/useKnowledgeBase';

export default function KnowledgeReviews() {
  const { articles, categories, updateArticle, deleteArticle } = useKnowledgeBase();
  const [editArticle, setEditArticle] = useState<KBArticle | null>(null);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6" /> Review Queue
      </h1>
      <p className="text-sm text-muted-foreground">Άρθρα που χρειάζονται review ή έγκριση.</p>

      <KBReviewQueue
        articles={articles}
        onApprove={(id) => updateArticle.mutate({ id, status: 'approved' })}
        onDeprecate={(id) => deleteArticle.mutate(id)}
        onSelect={(article) => setEditArticle(article)}
      />

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
    </div>
  );
}
