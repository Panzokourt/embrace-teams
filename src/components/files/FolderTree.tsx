import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface FileFolder {
  id: string;
  name: string;
  color: string | null;
  parent_folder_id: string | null;
  tender_id?: string | null;
  project_id?: string | null;
  created_at: string;
}

interface FolderTreeProps {
  folders: FileFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onDropFile?: (fileId: string, folderId: string | null) => Promise<void>;
  canManage: boolean;
}

interface FolderNodeProps {
  folder: FileFolder;
  folders: FileFolder[];
  level: number;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateSubfolder: (parentId: string) => void;
  onRenameFolder: (folder: FileFolder) => void;
  onDeleteFolder: (folder: FileFolder) => void;
  canManage: boolean;
}

function FolderNode({
  folder,
  folders,
  level,
  selectedFolderId,
  expandedFolders,
  onToggleExpand,
  onSelectFolder,
  onCreateSubfolder,
  onRenameFolder,
  onDeleteFolder,
  canManage
}: FolderNodeProps) {
  const children = folders.filter(f => f.parent_folder_id === folder.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => onSelectFolder(folder.id)}
      >
        <button
          className="p-0.5 hover:bg-muted rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </button>
        
        {isExpanded ? (
          <FolderOpen 
            className="h-4 w-4 shrink-0" 
            style={{ color: folder.color || undefined }}
          />
        ) : (
          <Folder 
            className="h-4 w-4 shrink-0" 
            style={{ color: folder.color || undefined }}
          />
        )}
        
        <span className="text-sm truncate flex-1">{folder.name}</span>
        
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateSubfolder(folder.id)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Νέος υποφάκελος
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                <Pencil className="h-4 w-4 mr-2" />
                Μετονομασία
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteFolder(folder)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Διαγραφή
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {children.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              folders={folders}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onCreateSubfolder={onCreateSubfolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  canManage
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<FileFolder | null>(null);
  const [saving, setSaving] = useState(false);

  const rootFolders = folders.filter(f => !f.parent_folder_id);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateSubfolder = (parentId: string) => {
    setParentFolderId(parentId);
    setNewFolderName('');
    setCreateDialogOpen(true);
    // Expand the parent folder
    setExpandedFolders(prev => new Set(prev).add(parentId));
  };

  const handleRenameClick = (folder: FileFolder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setRenameDialogOpen(true);
  };

  const handleDeleteClick = (folder: FileFolder) => {
    setEditingFolder(folder);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!newFolderName.trim()) return;
    setSaving(true);
    try {
      await onCreateFolder(newFolderName.trim(), parentFolderId);
      setCreateDialogOpen(false);
      setNewFolderName('');
      setParentFolderId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleRenameSubmit = async () => {
    if (!editingFolder || !newFolderName.trim()) return;
    setSaving(true);
    try {
      await onRenameFolder(editingFolder.id, newFolderName.trim());
      setRenameDialogOpen(false);
      setEditingFolder(null);
      setNewFolderName('');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!editingFolder) return;
    setSaving(true);
    try {
      await onDeleteFolder(editingFolder.id);
      setDeleteDialogOpen(false);
      setEditingFolder(null);
      if (selectedFolderId === editingFolder.id) {
        onSelectFolder(null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Φάκελοι
        </span>
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setParentFolderId(null);
              setNewFolderName('');
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* All Files option */}
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
          selectedFolderId === null && "bg-primary/10 text-primary"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">Όλα τα αρχεία</span>
      </div>

      {/* Folder tree */}
      {rootFolders.map(folder => (
        <FolderNode
          key={folder.id}
          folder={folder}
          folders={folders}
          level={0}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
          onToggleExpand={handleToggleExpand}
          onSelectFolder={onSelectFolder}
          onCreateSubfolder={handleCreateSubfolder}
          onRenameFolder={handleRenameClick}
          onDeleteFolder={handleDeleteClick}
          canManage={canManage}
        />
      ))}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parentFolderId ? 'Νέος υποφάκελος' : 'Νέος φάκελος'}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Όνομα φακέλου"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleCreateSubmit} disabled={saving || !newFolderName.trim()}>
              Δημιουργία
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Μετονομασία φακέλου</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Νέο όνομα"
            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleRenameSubmit} disabled={saving || !newFolderName.trim()}>
              Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Διαγραφή φακέλου</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Είστε σίγουροι ότι θέλετε να διαγράψετε τον φάκελο "{editingFolder?.name}";
            Τα αρχεία μέσα θα μετακινηθούν στον γονικό φάκελο.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={saving}>
              Διαγραφή
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
