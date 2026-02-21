import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActionItem {
  type: "button" | "select" | "confirm" | "link";
  label: string;
  action?: string;
  data?: Record<string, any>;
  options?: { label: string; value: string }[];
  href?: string;
}

interface DownloadItem {
  filename: string;
  content_type: string;
  data: string; // base64
}

interface ActionRendererProps {
  onSendMessage: (message: string) => void;
}

export function parseAndRenderContent(
  content: string,
  onSendMessage: (msg: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /:::(actions|download)\n([\s\S]*?):::/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Text before this block
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const blockType = match[1];
    const blockContent = match[2].trim();

    if (blockType === "actions") {
      try {
        const actions: ActionItem[] = JSON.parse(blockContent);
        parts.push(
          <ActionsBlock key={match.index} actions={actions} onSendMessage={onSendMessage} />
        );
      } catch {
        parts.push(blockContent);
      }
    } else if (blockType === "download") {
      try {
        const dl: DownloadItem = JSON.parse(blockContent);
        parts.push(<DownloadBlock key={match.index} item={dl} />);
      } catch {
        parts.push(blockContent);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

function ActionsBlock({ actions, onSendMessage }: { actions: ActionItem[]; onSendMessage: (msg: string) => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {actions.map((action, i) => {
        if (action.type === "button") {
          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => {
                const msg = action.data
                  ? `Επέλεξα: ${action.label} ${JSON.stringify(action.data)}`
                  : action.label;
                onSendMessage(msg);
              }}
            >
              {action.label}
            </Button>
          );
        }

        if (action.type === "confirm") {
          return (
            <div key={i} className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="rounded-lg gap-1"
                onClick={() => onSendMessage("Ναι, προχώρα")}
              >
                <Check className="h-3 w-3" /> Ναι
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1"
                onClick={() => onSendMessage("Όχι, ακύρωσε")}
              >
                <X className="h-3 w-3" /> Όχι
              </Button>
            </div>
          );
        }

        if (action.type === "link" && action.href) {
          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="rounded-lg gap-1"
              onClick={() => navigate(action.href!)}
            >
              <ExternalLink className="h-3 w-3" />
              {action.label}
            </Button>
          );
        }

        if (action.type === "select" && action.options) {
          return (
            <Select
              key={i}
              onValueChange={(val) => {
                const selected = action.options?.find((o) => o.value === val);
                onSendMessage(`Επέλεξα: ${selected?.label || val} (${val})`);
              }}
            >
              <SelectTrigger className="w-48 h-8 rounded-lg text-sm">
                <SelectValue placeholder={action.label} />
              </SelectTrigger>
              <SelectContent>
                {action.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        return null;
      })}
    </div>
  );
}

function DownloadBlock({ item }: { item: DownloadItem }) {
  const handleDownload = () => {
    try {
      const byteChars = atob(item.data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: item.content_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: treat data as text
      const blob = new Blob([item.data], { type: item.content_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="my-2">
      <Button variant="outline" size="sm" className="rounded-lg gap-2" onClick={handleDownload}>
        <Download className="h-4 w-4" />
        Κατέβασε: {item.filename}
      </Button>
    </div>
  );
}
