import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bold, Italic, Strikethrough, List, ListOrdered, CheckSquare,
  Table, Link, Heading1, Heading2, Heading3, Type, Highlighter, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

interface NoteEditorToolbarProps {
  editor: Editor | null;
}

export function NoteEditorToolbar({ editor }: NoteEditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `h-7 w-7 rounded-lg transition-colors ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`;

  const addLink = () => {
    const url = window.prompt('URL:', 'https://');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/20 shrink-0 flex-wrap">
      {/* Heading dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-auto px-1.5 gap-0.5 text-muted-foreground hover:bg-accent/50 rounded-lg">
            <Type className="h-3.5 w-3.5" />
            <ChevronDown className="h-2.5 w-2.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className="text-xs gap-2">
            <Type className="h-3.5 w-3.5" /> Κείμενο
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="text-xs gap-2">
            <Heading1 className="h-3.5 w-3.5" /> Επικεφαλίδα 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="text-xs gap-2">
            <Heading2 className="h-3.5 w-3.5" /> Επικεφαλίδα 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="text-xs gap-2">
            <Heading3 className="h-3.5 w-3.5" /> Επικεφαλίδα 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-border/30 mx-0.5" />

      {/* Text formatting */}
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}>
        <Bold className="h-3.5 w-3.5 mx-auto" />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}>
        <Italic className="h-3.5 w-3.5 mx-auto" />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))}>
        <Strikethrough className="h-3.5 w-3.5 mx-auto" />
      </button>
      <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btnClass(editor.isActive('highlight'))}>
        <Highlighter className="h-3.5 w-3.5 mx-auto" />
      </button>

      <div className="w-px h-4 bg-border/30 mx-0.5" />

      {/* Lists */}
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}>
        <List className="h-3.5 w-3.5 mx-auto" />
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))}>
        <ListOrdered className="h-3.5 w-3.5 mx-auto" />
      </button>
      <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnClass(editor.isActive('taskList'))}>
        <CheckSquare className="h-3.5 w-3.5 mx-auto" />
      </button>

      <div className="w-px h-4 bg-border/30 mx-0.5" />

      {/* Table & Link */}
      <button onClick={addTable} className={btnClass(false)}>
        <Table className="h-3.5 w-3.5 mx-auto" />
      </button>
      <button onClick={addLink} className={btnClass(editor.isActive('link'))}>
        <Link className="h-3.5 w-3.5 mx-auto" />
      </button>
    </div>
  );
}
