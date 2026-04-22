import { useEffect, useState } from 'react';

const TIME_FMT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
const DATE_FMT: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' };

export default function TopBarDateTime() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('el-GR', TIME_FMT);
  const date = now.toLocaleDateString('el-GR', DATE_FMT);

  return (
    <div className="hidden md:flex items-center gap-2 px-2.5 h-8 rounded-lg bg-muted/60 border border-border/50 text-xs shrink-0">
      <span className="font-mono font-semibold text-foreground tabular-nums">{time}</span>
      <span className="h-3 w-px bg-border" />
      <span className="text-muted-foreground capitalize">{date}</span>
    </div>
  );
}
