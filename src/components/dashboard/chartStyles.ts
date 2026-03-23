// Shared chart styling — Apple-inspired Design System Phase 4

export const chartTooltipStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  backdropFilter: 'blur(16px)',
  fontSize: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
];

/** Consistent widget card classes */
export const WIDGET_CARD_CLASS = 'rounded-[16px] border border-border/30 bg-card p-5 animate-fade-in shadow-sm h-full';

/** Consistent widget icon box classes */
export const WIDGET_ICON_CLASS = 'h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center';

/** Consistent widget title classes */
export const WIDGET_TITLE_CLASS = 'text-[13px] font-semibold tracking-tight flex items-center gap-2 mb-4 text-foreground';
