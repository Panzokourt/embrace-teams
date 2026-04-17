import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MENTION_TYPES, getMentionHref } from './mentionRegistry';
import { splitForRender } from './parseMentions';

interface MentionRendererProps {
  text: string;
  className?: string;
  /** Render mentions as plain @label (no chips). */
  plain?: boolean;
}

/**
 * Renders user-generated content with inline color-coded chips for
 * @[label](type:id) mentions and /[command](payload) slash references.
 *
 * Backwards compatible: text without serialized tokens renders as-is.
 */
export function MentionRenderer({ text, className, plain }: MentionRendererProps) {
  const navigate = useNavigate();
  const segments = splitForRender(text);

  if (plain) {
    return (
      <span className={className}>
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
          if (seg.kind === 'mention') return <span key={i}>@{seg.label}</span>;
          return <span key={i}>/{seg.command}</span>;
        })}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <span className={cn('whitespace-pre-wrap break-words', className)}>
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;

          if (seg.kind === 'slash') {
            return (
              <span
                key={i}
                className="inline-flex items-center rounded px-1 py-0.5 text-xs font-medium bg-primary/10 text-primary"
              >
                /{seg.command}
                {seg.payload && <span className="text-primary/60 ml-0.5">({seg.payload})</span>}
              </span>
            );
          }

          const cfg = MENTION_TYPES[seg.type];
          if (!cfg) return <span key={i}>@{seg.label}</span>;
          const Icon = cfg.icon;
          const href = getMentionHref(seg.type, seg.id);

          const chip = (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs font-medium align-baseline',
                'bg-foreground/10 hover:bg-foreground/20 transition-colors',
                href && 'cursor-pointer'
              )}
              onClick={(e) => {
                if (!href) return;
                e.stopPropagation();
                navigate(href);
              }}
            >
              <Icon className={cn('h-3 w-3', cfg.colorClass)} />
              <span>@{seg.label}</span>
            </span>
          );

          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>{chip}</TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {cfg.label} · {seg.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    </TooltipProvider>
  );
}

export default MentionRenderer;
