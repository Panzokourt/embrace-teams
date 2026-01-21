import { CentralFileExplorer } from '@/components/files/CentralFileExplorer';
import { FileArchive, FolderTree } from 'lucide-react';

export default function FilesPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileArchive className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Κεντρικό Αρχείο</h1>
          <p className="text-muted-foreground text-sm">
            Διαχείριση και αναζήτηση όλων των αρχείων της εταιρείας
          </p>
        </div>
      </div>

      {/* File Explorer */}
      <CentralFileExplorer />
    </div>
  );
}
