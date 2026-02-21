import { useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import SecretaryChat from "./SecretaryChat";

interface SecretaryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SecretaryPanel({ open, onOpenChange }: SecretaryPanelProps) {
  // Keyboard shortcut: Cmd+J
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 w-[420px] sm:w-[480px] sm:max-w-[50vw] border-l border-border/40"
      >
        <div className="h-full">
          <SecretaryChat mode="panel" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
