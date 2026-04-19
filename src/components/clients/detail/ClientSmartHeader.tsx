import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2, Pencil, Plus, FolderKanban, FileText, UserPlus, BookOpen,
  ArrowLeft, TrendingUp, DollarSign, Percent, Camera, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InlineEditField } from '../InlineEditField';
import { AIEnrichButton } from '../AIEnrichButton';
import { useClientUpdate } from '@/hooks/useClientUpdate';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  client: {
    id: string;
    name: string;
    logo_url: string | null;
    sector: string | null;
    status: string | null;
    website: string | null;
    tax_id: string | null;
    company_id: string;
  };
  revenueThisYear: number;
  monthlyRevenue: number;
  marginPercent: number;
  canEdit: boolean;
  onEdit: () => void;
  onRefresh?: () => void;
  onClientUpdated?: (updated: any) => void;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'risk', label: 'Risk' },
];

const sectorOptions = [
  { value: 'public', label: 'Δημόσιος Τομέας' },
  { value: 'private', label: 'Ιδιωτικός Τομέας' },
  { value: 'non_profit', label: 'Μη Κερδοσκοπικός' },
  { value: 'government', label: 'Κυβερνητικός' },
  { value: 'mixed', label: 'Μικτός' },
];

const statusBadgeClass: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  proposal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  risk: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function ClientSmartHeader({
  client, revenueThisYear, monthlyRevenue, marginPercent, canEdit, onEdit, onRefresh, onClientUpdated,
}: Props) {
  const navigate = useNavigate();
  const update = useClientUpdate(client.id, { onPatched: onClientUpdated });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const save = (field: string) => async (v: string | null) => {
    await update.mutateAsync({ [field]: v });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error('Δεν είσαι συνδεδεμένος');
      const userId = userData.user.id;

      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      // Storage policy requires the first path segment to equal auth.uid().
      const path = `${userId}/client-logos/${client.id}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from('project-files')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error('Σφάλμα δημιουργίας URL');

      await update.mutateAsync({ logo_url: signed.signedUrl });
      toast.success('Λογότυπο ενημερώθηκε');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα ανεβάσματος');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const sectorLabel = sectorOptions.find(o => o.value === client.sector)?.label;
  const statusKey = client.status || 'active';
  const statusLabel = statusOptions.find(o => o.value === statusKey)?.label || 'Active';

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-soft p-6">
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Logo with upload */}
        <div className="relative group shrink-0">
          <button
            type="button"
            onClick={() => canEdit && fileRef.current?.click()}
            disabled={!canEdit || uploading}
            className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden relative"
          >
            {client.logo_url ? (
              <img src={client.logo_url} alt={client.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-muted-foreground" />
            )}
            {canEdit && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>

        {/* Name + Badges */}
        <div className="flex-1 min-w-0">
          <InlineEditField
            value={client.name}
            onSave={save('name')}
            canEdit={canEdit}
            placeholder="Όνομα πελάτη"
            displayClassName="text-2xl font-bold"
            inputClassName="text-2xl font-bold h-10"
          />
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <InlineEditField
              value={client.sector}
              onSave={save('sector')}
              type="select"
              options={sectorOptions}
              canEdit={canEdit}
              emptyLabel="+ τομέας"
              renderDisplay={() => (
                <Badge variant="secondary" className="text-xs">
                  {sectorLabel || '+ τομέας'}
                </Badge>
              )}
            />
            <InlineEditField
              value={statusKey}
              onSave={save('status')}
              type="select"
              options={statusOptions}
              canEdit={canEdit}
              renderDisplay={() => (
                <Badge className={`text-xs border ${statusBadgeClass[statusKey]}`}>{statusLabel}</Badge>
              )}
            />
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
            <AIEnrichButton
              clientId={client.id}
              website={client.website}
              taxId={client.tax_id}
              clientName={client.name}
              size="sm"
              label="AI Enrich"
              onApplied={onRefresh}
            />
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Πλήρης
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
