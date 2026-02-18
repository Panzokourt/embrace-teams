import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { briefDefinitions, getBriefDefinition } from './briefDefinitions';
import { BriefFormDialog } from './BriefFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Palette,
  Monitor,
  FileText,
  Globe,
  Calendar,
  MessageSquare,
  Loader2,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette, Monitor, FileText, Globe, Calendar, MessageSquare,
};

export function BriefsList() {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editBrief, setEditBrief] = useState<any | null>(null);

  const fetchBriefs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching briefs:', error);
    } else {
      setBriefs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBriefs(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('briefs').delete().eq('id', id);
    if (error) {
      toast.error('Σφάλμα κατά τη διαγραφή');
    } else {
      toast.success('Διαγράφηκε');
      fetchBriefs();
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : <FileText className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Brief type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {briefDefinitions.map(def => (
          <Card
            key={def.type}
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => setSelectedType(def.type)}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                {getIcon(def.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{def.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved briefs */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Αποθηκευμένα Briefs</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : briefs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Δεν υπάρχουν αποθηκευμένα briefs. Επιλέξτε μια προ-φόρμα για να ξεκινήσετε.
          </p>
        ) : (
          <div className="space-y-2">
            {briefs.map(brief => {
              const def = getBriefDefinition(brief.brief_type);
              return (
                <div
                  key={brief.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                      {def ? getIcon(def.icon) : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{brief.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {def?.label} • {format(new Date(brief.created_at), 'd MMM yyyy', { locale: el })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={brief.status === 'final' ? 'default' : 'secondary'} className="text-xs">
                      {brief.status === 'final' ? 'Τελικό' : 'Draft'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditBrief(brief)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Επεξεργασία
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(brief.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Διαγραφή
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New brief dialog */}
      {selectedType && (() => {
        const def = getBriefDefinition(selectedType);
        if (!def) return null;
        return (
          <BriefFormDialog
            open={true}
            onOpenChange={() => setSelectedType(null)}
            definition={def}
            onSaved={fetchBriefs}
          />
        );
      })()}

      {/* Edit brief dialog */}
      {editBrief && (() => {
        const def = getBriefDefinition(editBrief.brief_type);
        if (!def) return null;
        return (
          <BriefFormDialog
            open={true}
            onOpenChange={() => setEditBrief(null)}
            definition={def}
            initialData={editBrief.data as Record<string, any>}
            briefId={editBrief.id}
            onSaved={fetchBriefs}
          />
        );
      })()}
    </div>
  );
}
