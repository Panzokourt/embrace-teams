import { useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Paperclip,
  CheckSquare,
  FolderKanban,
  Calendar,
  FileText,
  Clock,
  Brain,
  ShieldAlert,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  prompt?: string;
  isUpload?: boolean;
  color: string;
}

const quickActions: QuickAction[] = [
  { icon: Paperclip, label: "Ανέβασε αρχείο", isUpload: true, color: "text-muted-foreground" },
  { icon: CheckSquare, label: "Νέο Task", prompt: "Θέλω να δημιουργήσω ένα νέο task", color: "text-amber-500" },
  { icon: FolderKanban, label: "Νέο Project", prompt: "Θέλω να δημιουργήσω ένα νέο project", color: "text-emerald-500" },
  { icon: Calendar, label: "Νέο Meeting", prompt: "Θέλω να δημιουργήσω ένα νέο meeting", color: "text-blue-500" },
  { icon: FileText, label: "Νέο Brief", prompt: "Θέλω να δημιουργήσω ένα νέο brief", color: "text-purple-500" },
  { icon: Clock, label: "Log Time", prompt: "Θέλω να καταχωρήσω χρόνο εργασίας", color: "text-orange-500" },
  { icon: Brain, label: "Brain Analysis", prompt: "Τρέξε ανάλυση Brain", color: "text-pink-500" },
  { icon: ShieldAlert, label: "Risk Radar", prompt: "Τρέξε Risk Radar analysis", color: "text-red-500" },
  { icon: GitBranch, label: "New Request", prompt: "Θέλω να υποβάλω ένα νέο intake request", color: "text-cyan-500" },
];

interface QuickActionsMenuProps {
  disabled?: boolean;
  onSendMessage: (text: string) => void;
  onFileUpload: (file: File) => void;
}

export default function QuickActionsMenu({ disabled, onSendMessage, onFileUpload }: QuickActionsMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAction = (action: QuickAction) => {
    if (action.isUpload) {
      fileInputRef.current?.click();
    } else if (action.prompt) {
      onSendMessage(action.prompt);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Support multiple file uploads
      Array.from(files).forEach(file => onFileUpload(file));
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
        multiple
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-11 w-11 rounded-xl flex-shrink-0"
            title="Γρήγορες ενέργειες"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-64 p-2"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="grid grid-cols-1 gap-0.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-colors hover:bg-accent/50"
                >
                  <Icon className={cn("h-4 w-4 shrink-0", action.color)} />
                  <span className="text-foreground">{action.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
