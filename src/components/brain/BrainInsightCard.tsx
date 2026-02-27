import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
  TrendingUp, ShoppingCart, Zap, Globe, AlertTriangle, Sparkles,
  Brain, ExternalLink, X, CheckCircle2, Share2, ChevronDown, ChevronUp,
} from 'lucide-react';

const categoryConfig: Record<string, { icon: any; label: string; color: string }> = {
  strategic: { icon: TrendingUp, label: 'Στρατηγικό', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  sales: { icon: ShoppingCart, label: 'Πωλήσεις', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  productivity: { icon: Zap, label: 'Παραγωγικότητα', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  market: { icon: Globe, label: 'Αγορά', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  alert: { icon: AlertTriangle, label: 'Alert', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  neuro: { icon: Sparkles, label: 'Neuro', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
};

const neuroTacticLabels: Record<string, string> = {
  loss_aversion: '🧠 Loss Aversion',
  anchoring: '⚓ Anchoring',
  social_proof: '👥 Social Proof',
  scarcity: '⏰ Scarcity',
  reciprocity: '🤝 Reciprocity',
  peak_end_rule: '🎯 Peak-End Rule',
  decoy_effect: '🎭 Decoy Effect',
};

const priorityColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-emerald-500',
};

export interface BrainInsight {
  id?: string;
  category: string;
  subcategory?: string;
  priority: string;
  title: string;
  body: string;
  evidence: Array<{ type: string; id: string; name: string; url?: string }>;
  nlp_metadata?: { sentiment?: string; sentiment_score?: number; keywords?: string[]; detected_intent?: string };
  neuro_tactic: string;
  neuro_rationale: string;
  market_context?: string;
  citations?: Array<string>;
  is_dismissed?: boolean;
  is_actioned?: boolean;
  created_at?: string;
}

interface BrainInsightCardProps {
  insight: BrainInsight;
  onDismiss?: (id: string) => void;
  onAction?: (id: string) => void;
}

export function BrainInsightCard({ insight, onDismiss, onAction }: BrainInsightCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const cat = categoryConfig[insight.category] || categoryConfig.strategic;
  const CatIcon = cat.icon;

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-200 hover:shadow-md",
      priorityColors[insight.priority] || 'border-l-border',
      insight.is_dismissed && "opacity-50"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: category + neuro tactic + priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border", cat.color)}>
              <CatIcon className="h-3 w-3" />
              {cat.label}
            </span>
            {insight.neuro_tactic && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border/50 bg-muted/50 text-muted-foreground cursor-help">
                    <Brain className="h-3 w-3" />
                    {neuroTacticLabels[insight.neuro_tactic] || insight.neuro_tactic}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs font-medium mb-1">Neuromarketing Rationale</p>
                  <p className="text-xs text-muted-foreground">{insight.neuro_rationale}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {insight.nlp_metadata?.sentiment && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                insight.nlp_metadata.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-600' :
                insight.nlp_metadata.sentiment === 'negative' ? 'bg-red-500/10 text-red-600' :
                'bg-muted text-muted-foreground'
              )}>
                {insight.nlp_metadata.sentiment}
              </span>
            )}
          </div>
          <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'low' ? 'success' : 'warning'} className="text-[10px] shrink-0">
            {insight.priority === 'high' ? 'Υψηλή' : insight.priority === 'low' ? 'Χαμηλή' : 'Μεσαία'}
          </Badge>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold leading-snug">{insight.title}</h4>

        {/* Body (markdown, collapsible) */}
        <div className={cn("text-xs text-muted-foreground leading-relaxed prose prose-xs dark:prose-invert max-w-none", !expanded && "line-clamp-3")}>
          <ReactMarkdown>{insight.body}</ReactMarkdown>
        </div>
        {insight.body.length > 200 && (
          <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            {expanded ? <><ChevronUp className="h-3 w-3" /> Λιγότερα</> : <><ChevronDown className="h-3 w-3" /> Περισσότερα</>}
          </button>
        )}

        {/* Evidence links */}
        {insight.evidence.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {insight.evidence.map((ev, i) => (
              <button
                key={i}
                onClick={() => ev.url && navigate(ev.url)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-accent/50 hover:bg-accent text-foreground transition-colors cursor-pointer border border-border/30"
              >
                <span className="text-muted-foreground">→</span>
                {ev.name}
              </button>
            ))}
          </div>
        )}

        {/* NLP keywords */}
        {insight.nlp_metadata?.keywords && insight.nlp_metadata.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {insight.nlp_metadata.keywords.slice(0, 5).map((kw, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                #{kw}
              </span>
            ))}
          </div>
        )}

        {/* Market context */}
        {insight.market_context && expanded && (
          <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Market Context
            </p>
            <p className="text-[11px] text-muted-foreground">{insight.market_context}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {!insight.is_dismissed && onDismiss && insight.id && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => onDismiss(insight.id!)}>
              <X className="h-3 w-3 mr-1" /> Dismiss
            </Button>
          )}
          {!insight.is_actioned && onAction && insight.id && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => onAction(insight.id!)}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Take Action
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
