import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AIModel {
  id: string;
  name: string;
  provider: "auto" | "anthropic" | "google" | "openai";
  description?: string;
}

export const AI_MODELS: AIModel[] = [
  { id: "auto", name: "Auto", provider: "auto", description: "Gemini 2.5 Pro" },
  // Claude
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 3.5", provider: "anthropic" },
  // Gemini
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google" },
  // OpenAI
  { id: "openai/gpt-5", name: "GPT-5", provider: "openai" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "openai" },
];

const PROVIDER_LABELS: Record<string, string> = {
  auto: "Προτεινόμενο",
  anthropic: "Claude",
  google: "Gemini",
  openai: "OpenAI",
};

const PROVIDER_ORDER = ["auto", "anthropic", "google", "openai"];

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = AI_MODELS.find((m) => m.id === value) || AI_MODELS[0];

  const grouped = PROVIDER_ORDER.map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider],
    models: AI_MODELS.filter((m) => m.provider === provider),
  })).filter((g) => g.models.length > 0);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
          title="Επιλογή μοντέλου AI"
        >
          <span className="max-w-[100px] truncate">{selected.name}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => { onChange(v); setOpen(false); }}>
          {grouped.map((group, gi) => (
            <div key={group.provider}>
              {gi > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.models.map((model) => (
                <DropdownMenuRadioItem key={model.id} value={model.id} className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-sm">{model.name}</span>
                    {model.description && (
                      <span className="text-[10px] text-muted-foreground">{model.description}</span>
                    )}
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
