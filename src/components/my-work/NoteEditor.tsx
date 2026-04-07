import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { NoteEditorToolbar } from './NoteEditorToolbar';

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function NoteEditor({ content, onChange, placeholder = 'Γράψε εδώ τις σημειώσεις σου...' }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: false }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'note-editor-content outline-none flex-1 text-sm px-0 py-0 min-h-0 prose prose-sm max-w-none',
      },
    },
  });

  // Sync content from outside (note switch)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <NoteEditorToolbar editor={editor} />
      <div className="flex-1 overflow-auto px-3 py-2">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
