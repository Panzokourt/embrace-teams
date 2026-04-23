import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Link as LinkIcon, ClipboardPaste, Loader2, X, FileUp, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useKBCompiler } from "@/hooks/useKBCompiler";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional callback after import completes successfully */
  onImported?: () => void;
}

interface FileQueueItem {
  id: string;
  file: File;
  status: "queued" | "parsing" | "saving" | "done" | "error";
  error?: string;
  textLength?: number;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ".pdf,.docx,.doc,.txt,.md,.csv,.png,.jpg,.jpeg,.webp";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function KBImportDialog({ open, onOpenChange, onImported }: Props) {
  const { createSource, compileSource } = useKBCompiler();
  const [tab, setTab] = useState<"files" | "paste" | "url">("files");
  const [autoCompile, setAutoCompile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Files
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Paste
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");

  // URL
  const [urlValue, setUrlValue] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlContent, setUrlContent] = useState("");

  const reset = () => {
    setQueue([]);
    setPasteTitle("");
    setPasteContent("");
    setUrlValue("");
    setUrlTitle("");
    setUrlContent("");
    setProcessing(false);
  };

  const handleClose = (v: boolean) => {
    if (!v && processing) return;
    if (!v) reset();
    onOpenChange(v);
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: FileQueueItem[] = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: υπερβαίνει τα 20MB`);
        continue;
      }
      valid.push({ id: crypto.randomUUID(), file: f, status: "queued" });
    }
    setQueue((q) => [...q, ...valid]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, []);

  const removeQueued = (id: string) => setQueue((q) => q.filter((x) => x.id !== id));

  const processFiles = async () => {
    if (queue.length === 0) return;
    setProcessing(true);
    const sourceIds: string[] = [];
    for (const item of queue) {
      if (item.status === "done") continue;
      setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "parsing" } : x)));
      try {
        const base64 = await fileToBase64(item.file);
        const { data, error } = await supabase.functions.invoke("parse-document", {
          body: {
            base64Files: [{
              data: base64,
              fileName: item.file.name,
              contentType: item.file.type || "application/octet-stream",
            }],
          },
        });
        if (error) throw error;
        const result = data?.results?.[0];
        const text: string = result?.text || "";
        if (!text.trim()) throw new Error("Δεν εξάχθηκε κείμενο");

        setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "saving", textLength: text.length } : x)));

        const sourceTypeMap: Record<string, string> = {
          pdf: "pdf", docx: "doc", doc: "doc", text: "note", image: "image",
        };
        const sourceType = sourceTypeMap[result?.metadata?.fileType] || "article";

        const titleBase = item.file.name.replace(/\.[^.]+$/, "");
        const created = await createSource.mutateAsync({
          title: titleBase,
          content: text,
          source_type: sourceType,
        });
        sourceIds.push((created as any).id);
        setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "done" } : x)));
      } catch (e: any) {
        setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "error", error: e.message || "Σφάλμα" } : x)));
      }
    }

    if (autoCompile && sourceIds.length > 0) {
      toast.info(`Compilation σε εξέλιξη για ${sourceIds.length} πηγή/ές...`);
      for (const id of sourceIds) {
        try { await compileSource.mutateAsync(id); } catch { /* user βλέπει ξεχωριστά toasts */ }
      }
    }
    setProcessing(false);
    onImported?.();
  };

  const submitPaste = async () => {
    if (!pasteTitle.trim() || !pasteContent.trim()) return;
    setProcessing(true);
    try {
      const created = await createSource.mutateAsync({
        title: pasteTitle.trim(),
        content: pasteContent.trim(),
        source_type: "note",
      });
      if (autoCompile) await compileSource.mutateAsync((created as any).id);
      setPasteTitle("");
      setPasteContent("");
      onImported?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Σφάλμα");
    } finally {
      setProcessing(false);
    }
  };

  const submitUrl = async () => {
    if (!urlValue.trim() || !urlContent.trim()) return;
    setProcessing(true);
    try {
      const created = await createSource.mutateAsync({
        title: urlTitle.trim() || urlValue.trim(),
        content: urlContent.trim(),
        source_type: "url",
        url: urlValue.trim(),
      });
      if (autoCompile) await compileSource.mutateAsync((created as any).id);
      setUrlValue("");
      setUrlTitle("");
      setUrlContent("");
      onImported?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Σφάλμα");
    } finally {
      setProcessing(false);
    }
  };

  const allDone = queue.length > 0 && queue.every((x) => x.status === "done");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" /> Εισαγωγή στο Knowledge Base
          </DialogTitle>
          <DialogDescription>
            Ανέβασε αρχεία, επικόλλησε κείμενο ή πρόσθεσε URL. Το AI θα τα μετατρέψει σε άρθρα Wiki.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="files" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Αρχεία</TabsTrigger>
            <TabsTrigger value="paste" className="gap-1.5"><ClipboardPaste className="h-3.5 w-3.5" /> Κείμενο</TabsTrigger>
            <TabsTrigger value="url" className="gap-1.5"><LinkIcon className="h-3.5 w-3.5" /> URL</TabsTrigger>
          </TabsList>

          {/* ── Files ── */}
          <TabsContent value="files" className="space-y-3 mt-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Σύρε αρχεία εδώ ή κάνε κλικ για επιλογή</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, TXT, MD, CSV, PNG, JPG · έως 20MB ανά αρχείο
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {queue.length > 0 && (
              <Card>
                <CardContent className="p-2 space-y-1 max-h-64 overflow-y-auto">
                  {queue.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item.file.size / 1024).toFixed(0)} KB
                          {item.textLength != null && ` · ${item.textLength.toLocaleString()} χαρακτ.`}
                          {item.error && ` · ${item.error}`}
                        </p>
                      </div>
                      {item.status === "queued" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeQueued(item.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(item.status === "parsing" || item.status === "saving") && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {item.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={autoCompile} onCheckedChange={(v) => setAutoCompile(!!v)} />
                Αυτόματο compile σε άρθρα Wiki
              </label>
              <div className="flex gap-2">
                {allDone ? (
                  <Button onClick={() => onOpenChange(false)} variant="default">Κλείσιμο</Button>
                ) : (
                  <Button onClick={processFiles} disabled={queue.length === 0 || processing} className="gap-1">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Επεξεργασία ({queue.length})
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Paste ── */}
          <TabsContent value="paste" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Τίτλος</Label>
              <Input value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="π.χ. Brand Guidelines 2026" />
            </div>
            <div>
              <Label className="text-xs">Περιεχόμενο</Label>
              <Textarea value={pasteContent} onChange={(e) => setPasteContent(e.target.value)} rows={10} placeholder="Επικόλλησε ή γράψε εδώ..." />
              <p className="text-[11px] text-muted-foreground mt-1">{pasteContent.length.toLocaleString()} χαρακτήρες</p>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={autoCompile} onCheckedChange={(v) => setAutoCompile(!!v)} />
                Αυτόματο compile
              </label>
              <Button onClick={submitPaste} disabled={!pasteTitle.trim() || !pasteContent.trim() || processing} className="gap-1">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Προσθήκη
              </Button>
            </div>
          </TabsContent>

          {/* ── URL ── */}
          <TabsContent value="url" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Τίτλος (προαιρετικό)</Label>
              <Input value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)} placeholder="π.χ. Source - Documentation" />
            </div>
            <div>
              <Label className="text-xs">Περιεχόμενο / Σημειώσεις</Label>
              <Textarea
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
                rows={6}
                placeholder="Επικόλλησε εδώ το περιεχόμενο της σελίδας ή γράψε σημειώσεις..."
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Tip: Άνοιξε το URL, copy-paste το κείμενο εδώ.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={autoCompile} onCheckedChange={(v) => setAutoCompile(!!v)} />
                Αυτόματο compile
              </label>
              <Button onClick={submitUrl} disabled={!urlValue.trim() || !urlContent.trim() || processing} className="gap-1">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Προσθήκη
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {queue.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {queue.filter((x) => x.status === "done").length} / {queue.length} ολοκληρώθηκαν
            {autoCompile && " · με αυτόματο compile σε άρθρα Wiki"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
