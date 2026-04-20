// Reads dropped items (files and folders) from a DataTransferItemList
// using the webkitGetAsEntry API. Recursively traverses directories
// and returns a flat list of files paired with their relative paths.

export interface DroppedFileEntry {
  file: File;
  relativePath: string; // e.g. "MyFolder/sub/file.png" or just "file.png"
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (cb: (file: File) => void, errCb?: (e: any) => void) => void;
  createReader?: () => {
    readEntries: (
      cb: (entries: FileSystemEntryLike[]) => void,
      errCb?: (e: any) => void
    ) => void;
  };
}

function readAllEntries(
  reader: NonNullable<FileSystemEntryLike['createReader']> extends () => infer R ? R : never
): Promise<FileSystemEntryLike[]> {
  // readEntries() may return entries in batches; keep calling until empty.
  return new Promise((resolve, reject) => {
    const all: FileSystemEntryLike[] = [];
    const readBatch = () => {
      (reader as any).readEntries((entries: FileSystemEntryLike[]) => {
        if (!entries || entries.length === 0) {
          resolve(all);
        } else {
          all.push(...entries);
          readBatch();
        }
      }, reject);
    };
    readBatch();
  });
}

async function traverseEntry(
  entry: FileSystemEntryLike,
  pathPrefix: string
): Promise<DroppedFileEntry[]> {
  if (entry.isFile && entry.file) {
    return new Promise<DroppedFileEntry[]>((resolve, reject) => {
      entry.file!(
        (file) => {
          const relativePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
          resolve([{ file, relativePath }]);
        },
        (err) => reject(err)
      );
    });
  }
  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const childEntries = await readAllEntries(reader as any);
    const childPrefix = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
    const results = await Promise.all(
      childEntries.map((child) => traverseEntry(child, childPrefix))
    );
    return results.flat();
  }
  return [];
}

export async function readDroppedItems(
  items: DataTransferItemList
): Promise<DroppedFileEntry[]> {
  const entries: FileSystemEntryLike[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== 'file') continue;
    const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntryLike | null;
    if (entry) entries.push(entry);
  }

  const results = await Promise.all(entries.map((entry) => traverseEntry(entry, '')));
  return results.flat();
}

export function hasDirectoryEntry(items: DataTransferItemList): boolean {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== 'file') continue;
    const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntryLike | null;
    if (entry?.isDirectory) return true;
  }
  return false;
}
