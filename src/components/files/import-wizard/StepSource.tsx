import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Folder, FolderUp, FileUp, Files as FilesIcon, X, ListTree, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readDroppedItems, hasDirectoryEntry } from '@/utils/dropFolderReader';
import type { SourceFile } from './types';

interface StepSourceProps {
  files: SourceFile[];
  onFilesChange: (files: SourceFile[]) => void;
  preserveStructure: boolean;
  onPreserveStructureChange: (value: boolean) => void;
}

interface TreeNode {
  name: string;
  files: number;
  children: Map<string, TreeNode>;
}

const SYSTEM_FILE_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

function isSystemSourceFile(path: string): boolean {
  return path
    .split('/')
    .filter(Boolean)
    .some((part) => part.toLowerCase() === '__macosx' || SYSTEM_FILE_NAMES.has(part.toLowerCase()));
}

function fromFileList(list: FileList): SourceFile[] {
  return Array.from(list)
    .map((f) => ({
      file: f,
      relativePath: (f as any).webkitRelativePath || f.name,
    }))
    .filter((f) => !isSystemSourceFile(f.relativePath));
}

export function StepSource({
  files,
  onFilesChange,
  preserveStructure,
  onPreserveStructureChange,
}: StepSourceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const items = e.dataTransfer.items;
      if (items && hasDirectoryEntry(items)) {
        const dropped = (await readDroppedItems(items)).filter((f) => !isSystemSourceFile(f.relativePath));
        onFilesChange([...files, ...dropped]);
        return;
      }
      if (e.dataTransfer.files?.length) {
        onFilesChange([...files, ...fromFileList(e.dataTransfer.files)]);
      }
    },
    [files, onFilesChange]
  );

  const folderCount = useMemo(() => {
    const set = new Set<string>();
    for (const f of files) {
      const idx = f.relativePath.indexOf('/');
      if (idx > 0) set.add(f.relativePath.slice(0, idx));
    }
    return set.size;
  }, [files]);

  const totalBytes = useMemo(
    () => files.reduce((acc, f) => acc + f.file.size, 0),
    [files]
  );

  const treeRows = useMemo(() => {
    const root = new Map<string, TreeNode>();
    const ensure = (map: Map<string, TreeNode>, name: string) => {
      if (!map.has(name)) map.set(name, { name, files: 0, children: new Map() });
      return map.get(name)!;
    };

    for (const f of files) {
      const parts = f.relativePath.split('/').filter(Boolean);
      let level = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const node = ensure(level, parts[i]);
        node.files += 1;
        level = node.children;
      }
    }

    const rows: { path: string; name: string; depth: number; files: number }[] = [];
    const walk = (nodes: Map<string, TreeNode>, depth: number, parent = '') => {
      [...nodes.values()]
        .sort((a, b) => a.name.localeCompare(b.name, 'el', { numeric: true }))
        .forEach((node) => {
          const path = parent ? `${parent}/${node.name}` : node.name;
          rows.push({ path, name: node.name, depth, files: node.files });
          if (depth < 2) walk(node.children, depth + 1, path);
        });
    };
    walk(root, 0);
    return rows;
  }, [files]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40'
        )}
      >
        <FolderUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">
          Σύρε εδώ αρχεία ή ολόκληρους φακέλους
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Διατηρείται η δομή των υποφακέλων
        </p>

        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-4 w-4 mr-1.5" />
            Επιλογή αρχείων
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => folderInputRef.current?.click()}
          >
            <Folder className="h-4 w-4 mr-1.5" />
            Επιλογή φακέλου
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onFilesChange([...files, ...fromFileList(e.target.files)]);
              e.target.value = '';
            }
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error - non-standard attribute supported by Chromium/Safari
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onFilesChange([...files, ...fromFileList(e.target.files)]);
              e.target.value = '';
            }
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="border rounded-lg overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b text-xs min-w-0">
            <div className="flex items-center gap-3 text-muted-foreground min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <FilesIcon className="h-3.5 w-3.5" />
                {files.length} αρχεία
              </span>
              {folderCount > 0 && (
                <span className="flex items-center gap-1">
                  <Folder className="h-3.5 w-3.5" />
                  {folderCount} top-level φάκελοι
                </span>
              )}
              <span className="shrink-0">{(totalBytes / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button type="button" variant="ghost" size="sm" className="h-6 w-7 p-0" onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}>
                {viewMode === 'tree' ? <List className="h-3.5 w-3.5" /> : <ListTree className="h-3.5 w-3.5" />}
              </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onFilesChange([])}
            >
              Καθαρισμός
            </Button>
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2 border-b bg-background/60">
            <Checkbox id="source-preserve" checked={preserveStructure} onCheckedChange={(v) => onPreserveStructureChange(!!v)} />
            <Label htmlFor="source-preserve" className="text-xs leading-4 cursor-pointer">
              Διατήρηση δομής υποφακέλων
            </Label>
          </div>
          {viewMode === 'tree' && treeRows.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto text-xs divide-y">
              {treeRows.slice(0, 80).map((row) => (
                <li key={row.path} className="flex items-center justify-between gap-2 px-3 py-1.5 min-w-0">
                  <span className="flex items-center gap-1.5 flex-1 min-w-0" style={{ paddingLeft: row.depth * 14 }}>
                    <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate font-mono text-[11px]">{row.name}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{row.files}</span>
                </li>
              ))}
              {treeRows.length > 80 && <li className="px-3 py-1.5 text-muted-foreground italic">…και άλλοι {treeRows.length - 80} φάκελοι</li>}
            </ul>
          ) : (
          <ul className="max-h-56 overflow-y-auto text-xs divide-y">
            {files.slice(0, 50).map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 min-w-0">
                <span className="flex-1 min-w-0 truncate font-mono text-[11px]" dir="rtl" title={f.relativePath}>{f.relativePath}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                  onClick={() =>
                    onFilesChange(files.filter((_, idx) => idx !== i))
                  }
                  aria-label="Αφαίρεση"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
            {files.length > 50 && (
              <li className="px-3 py-1.5 text-muted-foreground italic">
                …και άλλα {files.length - 50} αρχεία
              </li>
            )}
          </ul>
          )}
        </div>
      )}
    </div>
  );
}
