import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { User, FolderKanban, CheckSquare, FileText, Send, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import QuickActionsMenu from "./QuickActionsMenu";

interface MentionResult {
  id: string;
  name: string;
  type: "person" | "project" | "task" | "file";
}

const typeConfig = {
  person: { icon: User, label: "Άτομα", color: "text-blue-500" },
  project: { icon: FolderKanban, label: "Projects", color: "text-emerald-500" },
  task: { icon: CheckSquare, label: "Tasks", color: "text-amber-500" },
  file: { icon: FileText, label: "Αρχεία", color: "text-purple-500" },
};

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  onSendMessage?: (text: string) => void;
  onFileUpload?: (file: File) => void;
}

export default function MentionInput({ value, onChange, onSend, disabled, placeholder, onSendMessage, onFileUpload }: MentionInputProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<MentionResult[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchMentions = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setMentionResults([]);
      return;
    }
    setMentionLoading(true);
    try {
      const term = `%${query}%`;
      const [profiles, projects, tasks, files] = await Promise.all([
        supabase.from("profiles").select("id, full_name").ilike("full_name", term).limit(5),
        supabase.from("projects").select("id, name").ilike("name", term).limit(5),
        supabase.from("tasks").select("id, title").ilike("title", term).limit(5),
        supabase.from("file_attachments").select("id, file_name").ilike("file_name", term).limit(5),
      ]);
      const results: MentionResult[] = [
        ...(profiles.data || []).map((p) => ({ id: p.id, name: p.full_name || p.id, type: "person" as const })),
        ...(projects.data || []).map((p) => ({ id: p.id, name: p.name, type: "project" as const })),
        ...(tasks.data || []).map((t) => ({ id: t.id, name: t.title, type: "task" as const })),
        ...(files.data || []).map((f) => ({ id: f.id, name: f.file_name, type: "file" as const })),
      ];
      setMentionResults(results);
      setSelectedIndex(0);
    } catch (err) {
      console.error("Mention search error:", err);
    } finally {
      setMentionLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Detect @ trigger
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only trigger if @ is at start or preceded by whitespace, and no space in query
      const charBefore = lastAtIndex > 0 ? val[lastAtIndex - 1] : " ";
      if ((charBefore === " " || charBefore === "\n" || lastAtIndex === 0) && !textAfterAt.includes(" ")) {
        setMentionOpen(true);
        setMentionStart(lastAtIndex);
        setMentionQuery(textAfterAt);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchMentions(textAfterAt), 200);
        return;
      }
    }
    setMentionOpen(false);
  };

  const selectMention = (result: MentionResult) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1);
    const mention = `@[${result.name}](${result.type}:${result.id})`;
    onChange(before + mention + " " + after);
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionOpen && mentionResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, mentionResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(mentionResults[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Auto-resize textarea
  const autoResize = () => {
    const t = textareaRef.current;
    if (t) {
      t.style.height = "auto";
      t.style.height = Math.min(t.scrollHeight, 128) + "px";
    }
  };

  useEffect(() => {
    autoResize();
  }, [value]);

  return (
    <div className="flex gap-2 items-end relative">
      <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
        <PopoverAnchor asChild>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Γράψε μήνυμα... (@ για mention)"}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 max-h-32 min-h-[44px] disabled:opacity-50"
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-72 p-1 max-h-64 overflow-y-auto"
          align="start"
          side="top"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {mentionLoading && (
            <div className="py-3 text-center text-sm text-muted-foreground">Αναζήτηση...</div>
          )}
          {!mentionLoading && mentionResults.length === 0 && mentionQuery.length > 0 && (
            <div className="py-3 text-center text-sm text-muted-foreground">Δεν βρέθηκαν αποτελέσματα</div>
          )}
          {mentionResults.map((result, i) => {
            const config = typeConfig[result.type];
            const Icon = config.icon;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => selectMention(result)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors",
                  i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
                <span className="truncate">{result.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{config.label}</span>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      <VoiceMicButton
        disabled={disabled}
        onTranscript={(text) => onChange(value ? value + " " + text : text)}
      />
      <Button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        size="icon"
        className="h-11 w-11 rounded-xl flex-shrink-0"
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function VoiceMicButton({ disabled, onTranscript }: { disabled?: boolean; onTranscript: (text: string) => void }) {
  const { isListening, fullTranscript, isSupported, start, stop } = useVoiceRecognition();
  const prevTranscriptRef = useRef("");

  useEffect(() => {
    if (!isListening && fullTranscript && fullTranscript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = fullTranscript;
      onTranscript(fullTranscript);
    }
  }, [isListening, fullTranscript, onTranscript]);

  if (!isSupported) return null;

  const toggle = () => {
    if (isListening) stop();
    else { prevTranscriptRef.current = ""; start(); }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "h-11 w-11 rounded-xl flex-shrink-0 relative",
        isListening && "text-destructive"
      )}
      title={isListening ? "Σταμάτα ηχογράφηση" : "Φωνητική εντολή"}
    >
      {isListening && <span className="absolute inset-0 rounded-xl bg-destructive/10 animate-pulse" />}
      {isListening ? <MicOff className="h-4 w-4 relative z-10" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
