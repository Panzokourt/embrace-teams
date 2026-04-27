import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

const groups: ShortcutGroup[] = [
  {
    title: 'Γενικά',
    items: [
      { keys: ['⌘', 'K'], label: 'Άνοιγμα command palette' },
      { keys: ['⌘', 'I'], label: 'Quick AI chat' },
      { keys: ['⌘', 'J'], label: 'Εναλλαγή Secretary panel' },
      { keys: ['⌘', '/'], label: 'Άνοιγμα αυτής της λίστας' },
    ],
  },
  {
    title: 'Πλοήγηση',
    items: [
      { keys: ['G', 'D'], label: 'Πήγαινε στο Dashboard' },
      { keys: ['G', 'M'], label: 'Πήγαινε στο My Work' },
      { keys: ['G', 'C'], label: 'Πήγαινε στο Calendar' },
      { keys: ['G', 'P'], label: 'Πήγαινε στα Projects' },
    ],
  },
  {
    title: 'Δημιουργία',
    items: [
      { keys: ['T'], label: 'Νέο task' },
      { keys: ['N'], label: 'Νέα σημείωση' },
      { keys: ['R'], label: 'Νέα υπενθύμιση' },
    ],
  },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Συντομεύσεις πληκτρολογίου</DialogTitle>
          <DialogDescription>
            Επιτάχυνε τη ροή εργασίας σου με αυτές τις συντομεύσεις.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                {group.title}
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 text-sm"
                  >
                    <span>{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border/60 bg-muted/40 text-xs font-mono text-foreground/80"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
