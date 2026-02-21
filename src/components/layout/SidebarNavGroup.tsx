import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarNavGroupProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  isActive: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const STORAGE_KEY = 'sidebar-expanded-groups';

function getExpandedGroups(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function setExpandedGroup(id: string, open: boolean) {
  const groups = getExpandedGroups();
  groups[id] = open;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

export function SidebarNavGroup({ id, icon, label, collapsed, isActive, children, defaultOpen = true }: SidebarNavGroupProps) {
  const [open, setOpen] = useState(() => {
    const stored = getExpandedGroups();
    return stored[id] ?? defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setExpandedGroup(id, next);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center">
        <button
          onClick={toggle}
          className={cn(
            "flex items-center justify-center w-full rounded-xl px-2 py-2.5 transition-all duration-200",
            isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary-foreground hover:bg-primary"
          )}
        >
          {icon}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={toggle}
        className={cn(
          "group flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all duration-200 ease-apple",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
      >
        <span className="transition-transform duration-200">{icon}</span>
        <span className="text-sm font-medium flex-1 text-left">{label}</span>
        <ChevronRight className={cn(
          "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground/50",
          open && "rotate-90"
        )} />
      </button>
      {open && (
        <div className="ml-3 pl-3 border-l border-border/30 mt-1 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

export function SidebarSubLink({
  to,
  icon,
  label,
  active,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  // Using an anchor-like approach with navigate
  return (
    <a
      href={to}
      onClick={e => {
        e.preventDefault();
        onClick?.();
      }}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-200 ease-apple text-sm cursor-pointer",
        active
          ? "bg-primary text-primary-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <span className="transition-transform duration-200">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
