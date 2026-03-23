import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  StickyNote, Plus, Search, Trash2, ChevronDown, ChevronRight,
  Sparkles, CheckSquare, Package, FolderKanban, CalendarDays, MoreHorizontal, Loader2,
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { el } from 'date-fns/locale';

interface QuickNote {
  id: string;
  title: string;
  content: string;
  date: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export function QuickNotes() {
  const { profile, companyRole } = useAuth();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<QuickNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const titleRef = useRef<HTMLInputElement>(null);

  const companyId = companyRole?.company_id;

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('quick_notes')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data as unknown as QuickNote[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Create note
  const createNote = async () => {
    if (!companyId || !profile?.id) return;
    const { data, error } = await supabase
      .from('quick_notes')
      .insert({
        user_id: profile.id,
        company_id: companyId,
        title: 'Νέα Σημείωση',
        content: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      })
      .select()
      .single();

    if (!error && data) {
      const note = data as unknown as QuickNote;
      setNotes(prev => [note, ...prev]);
      setSelectedNote(note);
      setTimeout(() => titleRef.current?.select(), 100);
    }
  };

  // Auto-save with debounce
  const saveNote = useCallback(async (note: QuickNote) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('quick_notes')
        .update({ title: note.title, content: note.content, updated_at: new Date().toISOString() })
        .eq('id', note.id);
    }, 500);
  }, []);

  const updateSelectedNote = (field: 'title' | 'content', value: string) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote, [field]: value };
    setSelectedNote(updated);
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    saveNote(updated);
  };

  // Delete note
  const deleteNote = async (id: string) => {
    await supabase.from('quick_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
    setDeleteNoteId(null);
    toast.success('Η σημείωση διαγράφηκε');
  };

  // AI action
  const handleAiAction = async (action: string) => {
    if (!selectedNote || !selectedNote.content.trim()) {
      toast.error('Γράψε κάτι στη σημείωση πρώτα');
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('notes-ai-action', {
        body: {
          action,
          noteContent: selectedNote.content,
          noteTitle: selectedNote.title,
          companyId,
        },
      });
      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || `Η ενέργεια "${action}" ολοκληρώθηκε`);
        // Link the note to the created entity
        if (data.entityId && data.entityType) {
          const updated = { ...selectedNote, linked_entity_type: data.entityType, linked_entity_id: data.entityId };
          setSelectedNote(updated);
          setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
          await supabase.from('quick_notes').update({
            linked_entity_type: data.entityType,
            linked_entity_id: data.entityId,
          }).eq('id', selectedNote.id);
        }
      } else {
        toast.error(data?.error || 'Κάτι πήγε στραβά');
      }
    } catch (e: any) {
      toast.error(e.message || 'Σφάλμα AI');
    } finally {
      setAiLoading(false);
    }
  };

  // Group notes by date
  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = filteredNotes.reduce<Record<string, QuickNote[]>>((acc, note) => {
    const d = startOfDay(new Date(note.updated_at));
    let label: string;
    if (isToday(d)) label = 'Σήμερα';
    else if (isYesterday(d)) label = 'Χθες';
    else label = format(d, 'd MMMM yyyy', { locale: el });
    if (!acc[label]) acc[label] = [];
    acc[label].push(note);
    return acc;
  }, {});

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/30 shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/20 transition-colors py-3 px-5">
            <CardTitle className="text-[13px] font-semibold tracking-tight flex items-center gap-2.5">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center">
                <StickyNote className="h-3.5 w-3.5 text-primary" />
              </span>
              Quick Notes
              <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">{notes.length}</Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            <div className="flex h-[340px] border-t border-border/30">
              {/* Left: Note List */}
              <div className="w-[240px] border-r border-border/30 flex flex-col">
                <div className="p-2 flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Αναζήτηση..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-7 pl-7 text-xs"
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={createNote}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="px-1.5 pb-2">
                    {loading && notes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Φόρτωση...</p>
                    )}
                    {!loading && filteredNotes.length === 0 && (
                      <div className="text-center py-6">
                        <StickyNote className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">Δεν υπάρχουν σημειώσεις</p>
                        <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={createNote}>
                          <Plus className="h-3 w-3 mr-1" /> Νέα σημείωση
                        </Button>
                      </div>
                    )}
                    {Object.entries(grouped).map(([label, items]) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2 pb-1">{label}</p>
                        {items.map(note => (
                          <button
                            key={note.id}
                            onClick={() => setSelectedNote(note)}
                            className={`w-full text-left rounded-[10px] px-2.5 py-2 mb-0.5 transition-colors text-xs group ${
                              selectedNote?.id === note.id ? 'bg-accent text-foreground' : 'hover:bg-accent/30 text-muted-foreground'
                            }`}
                          >
                            <p className="font-medium truncate text-foreground">{note.title || 'Χωρίς τίτλο'}</p>
                            <p className="truncate text-[10px] mt-0.5 opacity-70">
                              {note.content ? note.content.substring(0, 60) : 'Κενή σημείωση'}
                            </p>
                            {note.linked_entity_type && (
                              <Badge variant="outline" className="mt-1 text-[9px] h-4 px-1">
                                {note.linked_entity_type === 'task' ? 'Task' : note.linked_entity_type === 'project' ? 'Project' : note.linked_entity_type}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Editor */}
              <div className="flex-1 flex flex-col min-w-0">
                {selectedNote ? (
                  <>
                    {/* Toolbar */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={aiLoading}>
                            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-amber-500" />}
                            AI Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={() => handleAiAction('create_task')} className="text-xs gap-2">
                            <CheckSquare className="h-3.5 w-3.5" /> Μετατροπή σε Task
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAiAction('create_deliverable')} className="text-xs gap-2">
                            <Package className="h-3.5 w-3.5" /> Μετατροπή σε Παραδοτέο
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAiAction('create_meeting')} className="text-xs gap-2">
                            <CalendarDays className="h-3.5 w-3.5" /> Δημιουργία Meeting
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAiAction('link_project')} className="text-xs gap-2">
                            <FolderKanban className="h-3.5 w-3.5" /> Σύνδεση με Έργο
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="flex-1" />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDeleteNoteId(selectedNote.id)}
                            className="text-destructive focus:text-destructive text-xs gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Διαγραφή
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Title + Content */}
                    <div className="flex-1 flex flex-col overflow-hidden px-3 py-2">
                      <Input
                        ref={titleRef}
                        value={selectedNote.title}
                        onChange={e => updateSelectedNote('title', e.target.value)}
                        className="border-0 bg-transparent text-base font-semibold px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 mb-1"
                        placeholder="Τίτλος σημείωσης..."
                      />
                      <Textarea
                        value={selectedNote.content}
                        onChange={e => updateSelectedNote('content', e.target.value)}
                        placeholder="Γράψε εδώ τις σημειώσεις σου..."
                        className="flex-1 border-0 bg-transparent resize-none px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-0"
                      />
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-1.5 border-t border-border/30 shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        Τελ. ενημέρωση: {format(new Date(selectedNote.updated_at), 'd MMM, HH:mm', { locale: el })}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <StickyNote className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">Επέλεξε ή δημιούργησε μια σημείωση</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή σημείωσης</AlertDialogTitle>
            <AlertDialogDescription>Θέλεις σίγουρα να διαγράψεις αυτήν τη σημείωση;</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteNoteId && deleteNote(deleteNoteId)}>Διαγραφή</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}
