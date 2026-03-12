import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ExternalLink, Check, X, Send, FileText, Image as ImageIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  data: string;
}

interface InputBlockData {
  type: "text" | "number";
  label: string;
  field: string;
  placeholder?: string;
}

interface TableBlockData {
  headers: string[];
  rows: (string | number)[][];
}

interface ChartBlockData {
  type: "bar" | "line" | "pie";
  title?: string;
  data: { name: string; value: number }[];
}

interface ProgressBlockData {
  label: string;
  value: number;
  max?: number;
}

interface ImageBlockData {
  url: string;
  alt?: string;
}

interface FileBlockData {
  name: string;
  url: string;
  size?: number;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(180, 50%, 45%)",
];

export function parseAndRenderContent(
  content: string,
  onSendMessage: (msg: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /:::(actions|download|input|table|chart|progress|image|file)\n([\s\S]*?):::/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const blockType = match[1];
    const blockContent = match[2].trim();

    try {
      switch (blockType) {
        case "actions": {
          const actions: ActionItem[] = JSON.parse(blockContent);
          parts.push(<ActionsBlock key={match.index} actions={actions} onSendMessage={onSendMessage} />);
          break;
        }
        case "download": {
          const dl: DownloadItem = JSON.parse(blockContent);
          parts.push(<DownloadBlock key={match.index} item={dl} />);
          break;
        }
        case "input": {
          const inputData: InputBlockData = JSON.parse(blockContent);
          parts.push(<InputBlock key={match.index} data={inputData} onSendMessage={onSendMessage} />);
          break;
        }
        case "table": {
          const tableData: TableBlockData = JSON.parse(blockContent);
          parts.push(<TableBlock key={match.index} data={tableData} />);
          break;
        }
        case "chart": {
          const chartData: ChartBlockData = JSON.parse(blockContent);
          parts.push(<ChartBlock key={match.index} data={chartData} />);
          break;
        }
        case "progress": {
          const progressData: ProgressBlockData = JSON.parse(blockContent);
          parts.push(<ProgressBlock key={match.index} data={progressData} />);
          break;
        }
        case "image": {
          const imageData: ImageBlockData = JSON.parse(blockContent);
          parts.push(<ImagePreviewBlock key={match.index} data={imageData} />);
          break;
        }
        case "file": {
          const fileData: FileBlockData = JSON.parse(blockContent);
          parts.push(<FileCardBlock key={match.index} data={fileData} />);
          break;
        }
        default:
          parts.push(blockContent);
      }
    } catch {
      parts.push(blockContent);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

// ── Actions Block ──
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
              <Button variant="default" size="sm" className="rounded-lg gap-1" onClick={() => onSendMessage("Ναι, προχώρα")}>
                <Check className="h-3 w-3" /> Ναι
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg gap-1" onClick={() => onSendMessage("Όχι, ακύρωσε")}>
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
              onClick={() => {
                // Dispatch custom event so AppLayout keeps the panel open
                window.dispatchEvent(new CustomEvent("secretary-navigate", { detail: { path: action.href } }));
              }}
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

// ── Input Block ──
function InputBlock({ data, onSendMessage }: { data: InputBlockData; onSendMessage: (msg: string) => void }) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSendMessage(`${data.field}: ${value.trim()}`);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="my-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
        <Check className="h-3.5 w-3.5" />
        {data.label}: <span className="text-foreground font-medium">{value}</span>
      </div>
    );
  }

  return (
    <div className="my-2 flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{data.label}</label>
        <Input
          type={data.type || "text"}
          placeholder={data.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="h-9"
        />
      </div>
      <Button size="sm" onClick={handleSubmit} disabled={!value.trim()} className="h-9 rounded-lg">
        <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Table Block ──
function TableBlock({ data }: { data: TableBlockData }) {
  return (
    <div className="my-3 rounded-lg border border-border/60 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {data.headers.map((h, i) => (
                <TableHead key={i} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row, ri) => (
              <TableRow key={ri}>
                {row.map((cell, ci) => (
                  <TableCell key={ci} className="text-xs py-2 whitespace-nowrap">{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.rows.length > 10 && (
        <div className="text-xs text-muted-foreground text-center py-1.5 bg-muted/20">
          {data.rows.length} γραμμές
        </div>
      )}
    </div>
  );
}

// ── Chart Block ──
function ChartBlock({ data }: { data: ChartBlockData }) {
  return (
    <div className="my-3 rounded-lg border border-border/60 p-3 bg-card">
      {data.title && <p className="text-xs font-semibold text-foreground mb-2">{data.title}</p>}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          {data.type === "bar" ? (
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : data.type === "line" ? (
            <LineChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data.data} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {data.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Progress Block ──
function ProgressBlock({ data }: { data: ProgressBlockData }) {
  const max = data.max || 100;
  const pct = Math.round((data.value / max) * 100);
  return (
    <div className="my-2 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{data.label}</span>
        <span className="font-medium text-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

// ── Image Block ──
function ImagePreviewBlock({ data }: { data: ImageBlockData }) {
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border/60">
      <img src={data.url} alt={data.alt || "Image"} className="max-w-full h-auto max-h-64 object-contain bg-muted/20" loading="lazy" />
      {data.alt && <p className="text-xs text-muted-foreground px-3 py-1.5">{data.alt}</p>}
    </div>
  );
}

// ── File Card Block ──
function FileCardBlock({ data }: { data: FileBlockData }) {
  const sizeStr = data.size
    ? data.size > 1024 * 1024
      ? `${(data.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(data.size / 1024).toFixed(0)} KB`
    : "";

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/30 transition-colors cursor-pointer"
    >
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{data.name}</p>
        {sizeStr && <p className="text-xs text-muted-foreground">{sizeStr}</p>}
      </div>
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
    </a>
  );
}

// ── Download Block ──
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
