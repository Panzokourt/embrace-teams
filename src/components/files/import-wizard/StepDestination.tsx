import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, Building2, Folder, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileFolder } from '../FolderTree';
import type { DestinationSelection } from './types';

interface ProjectOption {
  id: string;
  name: string;
  client_id?: string | null;
}
interface ClientOption {
  id: string;
  name: string;
}

interface StepDestinationProps {
  destination: DestinationSelection | null;
  onDestinationChange: (dest: DestinationSelection | null) => void;
  projects: ProjectOption[];
  clients: ClientOption[];
  folders: FileFolder[];
  onCreateClient: (name: string) => Promise<ClientOption | null>;
  onCreateProject: (name: string, clientId: string | null) => Promise<ProjectOption | null>;
}

const NO_FOLDER = '__none__';
const NEW_CLIENT = '__new_client__';

type Tab = 'project' | 'client' | 'company';

export function StepDestination({
  destination,
  onDestinationChange,
  projects,
  clients,
  folders,
  onCreateClient,
  onCreateProject,
}: StepDestinationProps) {
  const [tab, setTab] = useState<Tab>(
    destination?.scope === 'company' ? 'company' : 'project'
  );

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState<string>('');
  const [newClientName, setNewClientName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);

  const companyFolders = useMemo(
    () =>
      folders
        .filter(
          (f) =>
            (f as any).company_id &&
            !(f as any).project_id &&
            !(f as any).tender_id &&
            !f.parent_folder_id
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'el')),
    [folders]
  );

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    let clientId: string | null = null;
    try {
      if (newProjectClient === NEW_CLIENT) {
        if (!newClientName.trim()) return;
        const c = await onCreateClient(newClientName.trim());
        if (!c) return;
        clientId = c.id;
      } else if (newProjectClient) {
        clientId = newProjectClient;
      }
      const p = await onCreateProject(newProjectName.trim(), clientId);
      if (p) {
        onDestinationChange({
          scope: 'project',
          projectId: p.id,
          companyFolderId: null,
        });
        setShowNewProject(false);
        setNewProjectName('');
        setNewClientName('');
        setNewProjectClient('');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    setCreating(true);
    try {
      const c = await onCreateClient(newClientName.trim());
      if (c) {
        // Auto-create a "Γενικά" project so we have somewhere to put files
        const p = await onCreateProject(`${c.name} – Γενικά`, c.id);
        if (p) {
          onDestinationChange({
            scope: 'project',
            projectId: p.id,
            companyFolderId: null,
          });
        }
        setShowNewClient(false);
        setNewClientName('');
      }
    } finally {
      setCreating(false);
    }
  };

  const tabs: { value: Tab; label: string; icon: any; desc: string }[] = [
    { value: 'project', label: 'Σε Έργο', icon: Briefcase, desc: 'Αρχεία πελάτη/project' },
    { value: 'client', label: 'Σε Πελάτη', icon: Users, desc: 'Όλο το φάκελο πελάτη' },
    { value: 'company', label: 'Στην Εταιρία', icon: Building2, desc: 'HR, templates, internal' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTab(t.value);
                onDestinationChange(null);
              }}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors',
                active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{t.label}</span>
              <span className="text-[10px] text-muted-foreground">{t.desc}</span>
            </button>
          );
        })}
      </div>

      {tab === 'project' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Έργο
            </Label>
            <Select
              value={destination?.scope === 'project' ? destination.projectId ?? undefined : undefined}
              onValueChange={(v) =>
                onDestinationChange({ scope: 'project', projectId: v, companyFolderId: null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Επίλεξε έργο..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!showNewProject ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowNewProject(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Νέο έργο
            </Button>
          ) : (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <Label className="text-xs">Όνομα νέου έργου</Label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="π.χ. Καμπάνια Φθινοπώρου"
              />
              <Label className="text-xs">Πελάτης (προαιρετικά)</Label>
              <Select value={newProjectClient} onValueChange={setNewProjectClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Επίλεξε πελάτη..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CLIENT}>+ Νέος πελάτης</SelectItem>
                </SelectContent>
              </Select>
              {newProjectClient === NEW_CLIENT && (
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Όνομα νέου πελάτη"
                />
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewProject(false)}
                >
                  Άκυρο
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={creating || !newProjectName.trim()}
                  onClick={handleCreateProject}
                >
                  Δημιουργία
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'client' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Πελάτης
            </Label>
            <Select
              onValueChange={async (v) => {
                // Pick or auto-create a "Γενικά" project for this client
                const existing = projects.find(
                  (p) => p.client_id === v && /γενικά|general/i.test(p.name)
                );
                if (existing) {
                  onDestinationChange({
                    scope: 'project',
                    projectId: existing.id,
                    companyFolderId: null,
                  });
                  return;
                }
                const client = clients.find((c) => c.id === v);
                if (!client) return;
                const p = await onCreateProject(`${client.name} – Γενικά`, client.id);
                if (p) {
                  onDestinationChange({
                    scope: 'project',
                    projectId: p.id,
                    companyFolderId: null,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επίλεξε πελάτη..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Τα αρχεία θα μπουν στο έργο "{`{Πελάτης} – Γενικά`}" (δημιουργείται αυτόματα αν δεν υπάρχει).
            </p>
          </div>

          {!showNewClient ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowNewClient(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Νέος πελάτης
            </Button>
          ) : (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <Label className="text-xs">Όνομα νέου πελάτη</Label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="π.χ. Acme A.E."
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewClient(false)}
                >
                  Άκυρο
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={creating || !newClientName.trim()}
                  onClick={handleCreateClient}
                >
                  Δημιουργία
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'company' && (
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5" /> Φάκελος εταιρίας
          </Label>
          <Select
            value={
              destination?.scope === 'company'
                ? destination.companyFolderId ?? NO_FOLDER
                : undefined
            }
            onValueChange={(v) =>
              onDestinationChange({
                scope: 'company',
                projectId: null,
                companyFolderId: v === NO_FOLDER ? null : v,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Στη ρίζα της εταιρίας" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_FOLDER}>Στη ρίζα της εταιρίας</SelectItem>
              {companyFolders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
