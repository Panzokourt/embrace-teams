import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useKBCompiler } from '@/hooks/useKBCompiler';
import { KBArticleEditor } from '@/components/knowledge/KBArticleEditor';
import { KBVersionHistory } from '@/components/knowledge/KBVersionHistory';
import { KBBacklinks } from '@/components/knowledge/KBBacklinks';
import { KBReviewPanel } from '@/components/knowledge/KBReviewPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Archive, Eye, Calendar, Tag, Link as LinkIcon, Hash } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

export default function KnowledgeArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { articles, categories, updateArticle, deleteArticle, useArticleVersions } = useKnowledgeBase();
  const { useArticleBacklinks } = useKBCompiler();
  const [editorOpen, setEditorOpen] = useState(false);

  const article = useMemo(() => articles.find(a => a.id === id), [articles, id]);
  const versionsQuery = useArticleVersions(id || '');
  const backlinksQuery = useArticleBacklinks(id || '');
  const category = article?.category_id ? categories.find(c => c.id === article.category_id) : null;

  const wordCount = useMemo(() => article?.body?.split(/\s+/).filter(Boolean).length || 0, [article?.body]);

  // Custom markdown renderer for [[wiki-links]]
  const wikiLinkComponents: Components = useMemo(() => ({
    p: ({ children, ...props }) => {
      if (typeof children === 'string') {
        const parts = children.split(/(\[\[.*?\]\])/g);
        return (
          <p {...props}>
            {parts.map((part, i) => {
              const match = part.match(/^\[\[(.*?)\]\]$/);
              if (match) {
                const linkTitle = match[1];
                const linkedArticle = articles.find(a => a.title.toLowerCase() === linkTitle.toLowerCase());
                if (linkedArticle) {
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(`/knowledge/articles/${linkedArticle.id}`)}
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {linkTitle}
                    </button>
                  );
                }
                return <span key={i} className="text-muted-foreground italic">{linkTitle}</span>;
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        );
      }
      return <p {...props}>{children}</p>;
    },
  }), [articles, navigate]);

  if (!article) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Το άρθρο δεν βρέθηκε.</p>
        <Button variant="outline" onClick={() => navigate('/knowledge')} className="mt-4">Επιστροφή</Button>
      </div>
    );
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
    draft: 'warning', approved: 'success', deprecated: 'destructive',
  };

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Πίσω
      </Button>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main Content */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{article.title}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={statusVariant[article.status]}>{article.status}</Badge>
                <Badge variant="outline">{article.visibility === 'internal' ? 'Internal' : 'Client Visible'}</Badge>
                {article.review_status === 'pending' && <Badge variant="warning">Αναμονή review</Badge>}
                {article.review_status === 'changes_requested' && <Badge variant="destructive">Ζητήθηκαν αλλαγές</Badge>}
                <span className="text-xs text-muted-foreground">v{article.version}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)} className="gap-1">
                <Edit className="h-3.5 w-3.5" /> Επεξεργασία
              </Button>
              {article.status !== 'deprecated' && (
                <Button variant="outline" size="sm" onClick={() => deleteArticle.mutate(article.id)} className="gap-1 text-destructive">
                  <Archive className="h-3.5 w-3.5" /> Αρχειοθέτηση
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown components={wikiLinkComponents}>{article.body}</ReactMarkdown>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Πληροφορίες</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{category.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Updated: {format(new Date(article.updated_at), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{wordCount.toLocaleString()} λέξεις</span>
              </div>
              {article.next_review_date && (
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Review: {format(new Date(article.next_review_date), 'dd/MM/yyyy')}</span>
                </div>
              )}
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {article.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}
              {article.source_links?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Links:</p>
                  {article.source_links.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary text-xs hover:underline">
                      <LinkIcon className="h-3 w-3" /> {link}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviewer workflow */}
          <KBReviewPanel article={article} />

          {/* Backlinks */}
          <KBBacklinks backlinks={backlinksQuery.data || []} isLoading={backlinksQuery.isLoading} />

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Ιστορικό Εκδόσεων</CardTitle></CardHeader>
            <CardContent>
              <KBVersionHistory versions={versionsQuery.data || []} />
            </CardContent>
          </Card>
        </div>
      </div>

      <KBArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={article}
        categories={categories}
        onSave={(data) => updateArticle.mutate({ id: article.id, ...data })}
      />
    </div>
  );
}
