import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PermissionType } from '@/contexts/AuthContext';
import { Users, Briefcase, FolderKanban, ListChecks, Package, DollarSign, BarChart3, FileText, Files, MessageSquare, Settings, Eye } from 'lucide-react';

interface PermissionModule {
  key: string;
  label: string;
  icon: React.ElementType;
  viewPermissions: string[];
  managePermissions: string[];
}

const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'clients',
    label: 'Πελάτες',
    icon: Briefcase,
    viewPermissions: ['clients.view'],
    managePermissions: ['clients.create', 'clients.edit', 'clients.delete'],
  },
  {
    key: 'projects',
    label: 'Έργα',
    icon: FolderKanban,
    viewPermissions: ['projects.view'],
    managePermissions: ['projects.create', 'projects.edit', 'projects.delete'],
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: ListChecks,
    viewPermissions: ['tasks.view'],
    managePermissions: ['tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign'],
  },
  {
    key: 'deliverables',
    label: 'Παραδοτέα',
    icon: Package,
    viewPermissions: ['deliverables.view'],
    managePermissions: ['deliverables.create', 'deliverables.edit', 'deliverables.delete', 'deliverables.approve'],
  },
  {
    key: 'financials',
    label: 'Οικονομικά',
    icon: DollarSign,
    viewPermissions: ['financials.view'],
    managePermissions: ['financials.create', 'financials.edit', 'financials.delete'],
  },
  {
    key: 'reports',
    label: 'Αναφορές',
    icon: BarChart3,
    viewPermissions: ['reports.view'],
    managePermissions: ['reports.export'],
  },
  {
    key: 'tenders',
    label: 'Διαγωνισμοί',
    icon: FileText,
    viewPermissions: ['tenders.view'],
    managePermissions: ['tenders.create', 'tenders.edit', 'tenders.delete'],
  },
  {
    key: 'files',
    label: 'Αρχεία',
    icon: Files,
    viewPermissions: ['files.view'],
    managePermissions: ['files.upload', 'files.delete'],
  },
  {
    key: 'comments',
    label: 'Σχόλια',
    icon: MessageSquare,
    viewPermissions: ['comments.view'],
    managePermissions: ['comments.create', 'comments.edit', 'comments.delete'],
  },
  {
    key: 'users',
    label: 'Χρήστες',
    icon: Users,
    viewPermissions: ['users.view'],
    managePermissions: ['users.invite', 'users.edit', 'users.suspend', 'users.delete'],
  },
  {
    key: 'settings',
    label: 'Ρυθμίσεις',
    icon: Settings,
    viewPermissions: [],
    managePermissions: ['settings.company', 'settings.billing', 'settings.security', 'settings.integrations'],
  },
  {
    key: 'audit',
    label: 'Audit Log',
    icon: Eye,
    viewPermissions: ['audit.view'],
    managePermissions: [],
  },
];

interface PermissionModuleSelectorProps {
  selectedPermissions: PermissionType[];
  onChange: (permissions: PermissionType[]) => void;
  disabled?: boolean;
}

export function PermissionModuleSelector({ selectedPermissions, onChange, disabled }: PermissionModuleSelectorProps) {
  const hasAll = (perms: string[]) => perms.length > 0 && perms.every(p => selectedPermissions.includes(p as PermissionType));
  const hasAny = (perms: string[]) => perms.some(p => selectedPermissions.includes(p as PermissionType));

  const toggleGroup = (perms: string[], enable: boolean) => {
    if (enable) {
      onChange([...new Set([...selectedPermissions, ...perms.map(p => p as PermissionType)])]);
    } else {
      onChange(selectedPermissions.filter(p => !perms.includes(p)));
    }
  };

  const handleViewToggle = (mod: PermissionModule, checked: boolean) => {
    if (!checked) {
      // Turning off view also turns off manage
      toggleGroup([...mod.viewPermissions, ...mod.managePermissions], false);
    } else {
      toggleGroup(mod.viewPermissions, true);
    }
  };

  const handleManageToggle = (mod: PermissionModule, checked: boolean) => {
    if (checked) {
      // Turning on manage also turns on view
      toggleGroup([...mod.viewPermissions, ...mod.managePermissions], true);
    } else {
      toggleGroup(mod.managePermissions, false);
    }
  };

  const totalSelected = selectedPermissions.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Δικαιώματα Modules</Label>
        <Badge variant="secondary" className="text-xs">{totalSelected} ενεργά</Badge>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
          <span>Module</span>
          <span className="text-center">Προβολή</span>
          <span className="text-center">Διαχ/ση</span>
        </div>

        {/* Rows */}
        {PERMISSION_MODULES.map((mod) => {
          const hasView = mod.viewPermissions.length === 0 || hasAll(mod.viewPermissions);
          const hasManage = mod.managePermissions.length > 0 && hasAll(mod.managePermissions);
          const Icon = mod.icon;

          return (
            <div
              key={mod.key}
              className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{mod.label}</span>
              </div>

              <div className="flex justify-center items-center">
                {mod.viewPermissions.length > 0 ? (
                  <Switch
                    checked={hasView}
                    onCheckedChange={(checked) => handleViewToggle(mod, checked)}
                    disabled={disabled}
                    className="scale-90"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              <div className="flex justify-center items-center">
                {mod.managePermissions.length > 0 ? (
                  <Switch
                    checked={hasManage}
                    onCheckedChange={(checked) => handleManageToggle(mod, checked)}
                    disabled={disabled}
                    className="scale-90"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
