import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2, Pencil, Plus, FolderKanban, FileText, UserPlus, BookOpen,
  ArrowLeft, TrendingUp, DollarSign, Percent,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  client: {
    id: string;
    name: string;
    logo_url: string | null;
    sector: string | null;
    status: string | null;
  };
  revenueThisYear: number;
  monthlyRevenue: number;
  marginPercent: number;
  canEdit: boolean;
  onEdit: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  proposal: { label: 'Proposal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200' },
  risk: { label: 'Risk', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const sectorLabels: Record<string, string> = {
  public: 'Δημόσιος Τομέας',
  private: 'Ιδιωτικός Τομέας',
  non_profit: 'Μη Κερδοσκοπικός',
  government: 'Κυβερνητικός',
  mixed: 'Μικτός',
};

export function ClientSmartHeader({ client, revenueThisYear, monthlyRevenue, marginPercent, canEdit, onEdit }: Props) {
  const navigate = useNavigate();
  const st = statusConfig[client.status || 'active'] || statusConfig.active;

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-soft p-6">
      <div className="flex items-center gap-5">
        {/* Back + Logo */}
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          {client.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        {/* Name + Badges */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {client.sector && (
              <Badge variant="secondary" className="text-xs">
                {sectorLabels[client.sector] || client.sector}
              </Badge>
            )}
            <Badge className={`text-xs border ${st.className}`}>{st.label}</Badge>
          </div>
        </div>

        {/* KPIs */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Έσοδα Έτους
            </div>
            <p className="text-lg font-semibold">€{revenueThisYear.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <DollarSign className="h-3.5 w-3.5" /> Μηνιαία
            </div>
            <p className="text-lg font-semibold">€{monthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Percent className="h-3.5 w-3.5" /> Margin
            </div>
            <p className="text-lg font-semibold">{marginPercent}%</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Επεξεργασία
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Προσθήκη</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/projects?new=true&client=${client.id}`)}>
                <FolderKanban className="h-4 w-4 mr-2" /> Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/blueprints?new=true&client=${client.id}`)}>
                <BookOpen className="h-4 w-4 mr-2" /> Brief
              </DropdownMenuItem>
              <DropdownMenuItem><FileText className="h-4 w-4 mr-2" /> File</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/contacts?new=true&client=${client.id}`)}>
                <UserPlus className="h-4 w-4 mr-2" /> Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
