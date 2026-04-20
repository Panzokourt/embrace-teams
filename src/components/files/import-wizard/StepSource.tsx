import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Folder, FolderUp, FileUp, Files as FilesIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readDroppedItems, hasDirectoryEntry } from '@/utils/dropFolderReader';
import type { SourceFile } from './types';

interface StepSourceProps {
  files: SourceFile[];
  onFilesChange: (files: SourceFile[]) => void;
}

function fromFileList(list: FileList): SourceFile[] {
  return Array.from(list).map((f) => ({
    file: f,
    relativePath: (f as any).webkitRelativePath || f.name,
  }));
}

export function StepSource({ files, onFilesChange }: StepSourceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const items = e.dataTransfer.items;
      if (items && hasDirectoryEntry(items)) {
        const dropped = await readDroppedItems(items);
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
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b text-xs">
            <div className="flex items-center gap-3 text-muted-foreground">
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
              <span>{(totalBytes / 1024 / 1024).toFixed(1)} MB</span>
            </div>
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
          <ul className="max-h-56 overflow-y-auto text-xs divide-y">
            {files.slice(0, 50).map((f, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-1.5">
                <span className="truncate font-mono text-[11px]">{f.relativePath}</span>
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
        </div>
      )}
    </div>
  );
}
