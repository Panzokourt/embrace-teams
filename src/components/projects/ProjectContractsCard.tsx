import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface ProjectContract {
  id: string;
  contract_type: string | null;
  parties: any[];
  start_date: string | null;
  end_date: string | null;
  value: number | null;
  status: string | null;
  extracted_data: Record<string, any>;
  file_attachment_id: string | null;
  created_at: string;
}

interface ProjectContractsCardProps {
  projectId: string;
}

export function ProjectContractsCard({ projectId }: ProjectContractsCardProps) {
  const [contracts, setContracts] = useState<ProjectContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [projectId]);

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from('project_contracts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (!error && data) setContracts(data as any);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) return null;

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-700 border-green-500/20',
    expired: 'bg-muted text-muted-foreground',
    draft: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    terminated: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Συμβόλαια ({contracts.length})
        </p>
        <div className="space-y-2">
          {contracts.map(c => (
            <div key={c.id} className="rounded-lg border p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.contract_type || 'Σύμβαση'}</span>
                <Badge variant="outline" className={statusColors[c.status || 'active'] || ''}>
                  {c.status === 'active' ? 'Ενεργό' : c.status === 'expired' ? 'Ληγμένο' : c.status || 'Ενεργό'}
                </Badge>
              </div>

              {c.value && (
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  €{c.value.toLocaleString()}
                </div>
              )}

              {(c.start_date || c.end_date) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {c.start_date && format(new Date(c.start_date), 'd MMM yyyy', { locale: el })}
                  {c.start_date && c.end_date && ' — '}
                  {c.end_date && format(new Date(c.end_date), 'd MMM yyyy', { locale: el })}
                </div>
              )}

              {Array.isArray(c.parties) && c.parties.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {c.parties.map((p: any) => p.name || p).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
