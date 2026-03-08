import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { briefDefinitions } from '@/components/blueprints/briefDefinitions';
import type { IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';

interface ActionItem {
  type: string;
  params: Record<string, string>;
}

const ACTION_TYPES = [
  { value: 'create_task', label: 'Δημιουργία Task' },
  { value: 'assign_role', label: 'Ανάθεση σε ρόλο' },
  { value: 'notify_group', label: 'Ειδοποίηση ομάδας' },
  { value: 'update_status', label: 'Ενημέρωση status' },
  { value: 'create_project', label: 'Δημιουργία Project' },
  { value: 'link_template', label: 'Σύνδεση με Template' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'in_app', label: 'In-App' },
  { value: 'email', label: 'Email' },
  { value: 'both', label: 'Και τα δύο' },
];

interface WorkflowSidePanelProps {
  stage: IntakeWorkflowStage;
  onUpdate: (updates: Partial<IntakeWorkflowStage>) => void;
  onClose: () => void;
}

export function WorkflowSidePanel({ stage, onUpdate, onClose }: WorkflowSidePanelProps) {
  // Settings tab
  const [notifyOnEnter, setNotifyOnEnter] = useState(stage.notify_on_enter);
  const [notifyOnExit, setNotifyOnExit] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState('in_app');
  const [notifyRoles, setNotifyRoles] = useState<string[]>([]);

  // Actions tab
  const [onEnterActions, setOnEnterActions] = useState<ActionItem[]>([]);
  const [onExitActions, setOnExitActions] = useState<ActionItem[]>([]);

  // Templates tab
  const [linkedTemplateId, setLinkedTemplateId] = useState<string>('');
  const [linkedBriefType, setLinkedBriefType] = useState<string>('');
  const [projectTemplates, setProjectTemplates] = useState<Array<{ id: string; name: string }>>([]);

  const { company } = useAuth();

  useEffect(() => {
    setNotifyOnEnter(stage.notify_on_enter);
    const config = (stage as any).notification_config || {};
    setNotifyOnExit(config.on_exit || false);
    setNotifyChannel(config.channel || 'in_app');
    setNotifyRoles(config.roles || []);
    setOnEnterActions(((stage as any).on_enter_actions as ActionItem[]) || []);
    setOnExitActions(((stage as any).on_exit_actions as ActionItem[]) || []);
    setLinkedTemplateId((stage as any).linked_template_id || '');
    setLinkedBriefType((stage as any).field_set_type || '');
  }, [stage.id]);

  // Fetch project templates
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('project_templates')
        .select('id, name')
        .or(`company_id.is.null,company_id.eq.${company?.id}`)
        .order('name');
      setProjectTemplates(data || []);
    };
    if (company?.id) fetchTemplates();
  }, [company?.id]);

  const handleSave = () => {
    onUpdate({
      notify_on_enter: notifyOnEnter,
      notification_config: {
        on_exit: notifyOnExit,
        channel: notifyChannel,
        roles: notifyRoles,
      },
      on_enter_actions: onEnterActions,
      on_exit_actions: onExitActions,
      linked_template_id: linkedTemplateId || null,
      field_set_type: linkedBriefType || null,
    } as any);
  };

  const addAction = (list: 'enter' | 'exit') => {
    const action: ActionItem = { type: 'create_task', params: {} };
    if (list === 'enter') setOnEnterActions(prev => [...prev, action]);
    else setOnExitActions(prev => [...prev, action]);
  };

  const updateAction = (list: 'enter' | 'exit', idx: number, updates: Partial<ActionItem>) => {
    const setter = list === 'enter' ? setOnEnterActions : setOnExitActions;
    setter(prev => prev.map((a, i) => i === idx ? { ...a, ...updates } : a));
  };

  const removeAction = (list: 'enter' | 'exit', idx: number) => {
    const setter = list === 'enter' ? setOnEnterActions : setOnExitActions;
    setter(prev => prev.filter((_, i) => i !== idx));
  };

  const ROLES = ['Account Manager', 'Creative Director', 'Project Manager', 'Director', 'Legal', 'Finance'];

  const toggleNotifyRole = (role: string) => {
    setNotifyRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  // Required fields summary
  const reqFields = (stage.required_fields as string[]) || [];
  const selectedBrief = briefDefinitions.find(d => d.type === linkedBriefType);
  const selectedTemplate = projectTemplates.find(t => t.id === linkedTemplateId);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[340px] bg-card border-l border-border/50 z-20 flex flex-col shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <h3 className="text-sm font-semibold">Προχωρημένες ρυθμίσεις</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="settings" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="settings" className="flex-1 text-xs">Ρυθμίσεις</TabsTrigger>
          <TabsTrigger value="actions" className="flex-1 text-xs">Actions</TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 text-xs">Templates</TabsTrigger>
        </TabsList>

        {/* ── Tab: Ρυθμίσεις ── */}
        <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Ειδοποίηση εισόδου</Label>
            <Switch checked={notifyOnEnter} onCheckedChange={setNotifyOnEnter} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Ειδοποίηση εξόδου</Label>
            <Switch checked={notifyOnExit} onCheckedChange={setNotifyOnExit} />
          </div>

          {(notifyOnEnter || notifyOnExit) && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Κανάλι ειδοποιήσεων</Label>
                <Select value={notifyChannel} onValueChange={setNotifyChannel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_CHANNELS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ειδοποίηση σε ρόλους</Label>
                <div className="flex flex-wrap gap-1">
                  {ROLES.map(role => (
                    <Badge
                      key={role}
                      variant={notifyRoles.includes(role) ? 'default' : 'outline'}
                      className="cursor-pointer text-[10px]"
                      onClick={() => toggleNotifyRole(role)}
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fields summary */}
          {reqFields.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Υποχρεωτικά πεδία (σύνοψη)</Label>
              <div className="flex flex-wrap gap-1">
                {reqFields.map(f => (
                  <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Actions ── */}
        <TabsContent value="actions" className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* On Enter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">On Enter</Label>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => addAction('enter')}>
                <Plus className="h-3 w-3" /> Προσθήκη
              </Button>
            </div>
            {onEnterActions.length === 0 && (
              <p className="text-xs text-muted-foreground">Καμία ενέργεια εισόδου</p>
            )}
            {onEnterActions.map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                <Select value={action.type} onValueChange={v => updateAction('enter', idx, { type: v })}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAction('enter', idx)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* On Exit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">On Exit</Label>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => addAction('exit')}>
                <Plus className="h-3 w-3" /> Προσθήκη
              </Button>
            </div>
            {onExitActions.length === 0 && (
              <p className="text-xs text-muted-foreground">Καμία ενέργεια εξόδου</p>
            )}
            {onExitActions.map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                <Select value={action.type} onValueChange={v => updateAction('exit', idx, { type: v })}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAction('exit', idx)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {stage.stage_type === 'kickoff' && (
            <div className="border border-dashed border-primary/30 rounded-lg p-3 space-y-2">
              <Label className="text-xs text-primary">Ειδικό: Kickoff Stage</Label>
              <p className="text-[11px] text-muted-foreground">
                Ο κόμβος Εκκίνησης μπορεί να δημιουργεί αυτόματα Project κατά την είσοδο.
                Ρυθμίστε το στο tab «Templates».
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Templates ── */}
        <TabsContent value="templates" className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Project Template</Label>
            <Select value={linkedTemplateId} onValueChange={setLinkedTemplateId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Επιλέξτε template..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Κανένα</SelectItem>
                {projectTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Θα χρησιμοποιηθεί για αυτόματη δημιουργία project σε Kickoff stages
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Brief Type (Προ-φόρμα)</Label>
            <Select value={linkedBriefType} onValueChange={setLinkedBriefType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Επιλέξτε brief type..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Κανένα</SelectItem>
                {briefDefinitions.map(d => (
                  <SelectItem key={d.type} value={d.type}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {(selectedBrief || selectedTemplate) && (
            <div className="border border-border/50 rounded-lg p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              {selectedTemplate && (
                <div className="text-xs">
                  <span className="font-medium">Template:</span> {selectedTemplate.name}
                </div>
              )}
              {selectedBrief && (
                <div className="text-xs">
                  <span className="font-medium">Brief:</span> {selectedBrief.label}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedBrief.fields.filter(f => f.required).map(f => (
                      <Badge key={f.key} variant="secondary" className="text-[10px]">{f.label}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t border-border/40">
        <Button className="w-full" onClick={handleSave}>Αποθήκευση αλλαγών</Button>
      </div>
    </div>
  );
}
