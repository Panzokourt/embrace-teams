import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { briefDefinitions } from '@/components/blueprints/briefDefinitions';
import type { IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';

const STAGE_TYPES = [
  { value: 'request', label: 'Αίτημα' },
  { value: 'review', label: 'Αξιολόγηση' },
  { value: 'approval', label: 'Έγκριση' },
  { value: 'kickoff', label: 'Εκκίνηση' },
  { value: 'internal', label: 'Εσωτερικό βήμα' },
];

const AVAILABLE_FIELDS = [
  { id: 'title', label: 'Τίτλος' },
  { id: 'description', label: 'Περιγραφή' },
  { id: 'client', label: 'Πελάτης' },
  { id: 'budget', label: 'Προϋπολογισμός' },
  { id: 'deadline', label: 'Προθεσμία' },
  { id: 'channel', label: 'Κανάλι' },
  { id: 'goal', label: 'Στόχος' },
  { id: 'attachments', label: 'Αρχεία' },
  { id: 'category', label: 'Κατηγορία' },
  { id: 'urgency', label: 'Επείγον' },
];

const RESPONSIBLE_ROLES = [
  'Account Manager',
  'Creative Director',
  'Art Director',
  'Copywriter',
  'Media Planner',
  'Project Manager',
  'Director',
  'Legal',
  'Finance',
  'Strategy',
];

interface CustomField {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

interface WorkflowStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: IntakeWorkflowStage | null;
  onSave: (data: Partial<IntakeWorkflowStage>) => void;
  nextSortOrder: number;
}

export function WorkflowStageDialog({ open, onOpenChange, stage, onSave, nextSortOrder }: WorkflowStageDialogProps) {
  // General tab
  const [name, setName] = useState('');
  const [stageType, setStageType] = useState('review');
  const [slaValue, setSlaValue] = useState('');
  const [slaUnit, setSlaUnit] = useState('hours');
  const [slaReason, setSlaReason] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(false);

  // Fields tab
  const [fieldSetType, setFieldSetType] = useState<string>('');
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [optionalFields, setOptionalFields] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  // Owners tab
  const [responsibleRoles, setResponsibleRoles] = useState<string[]>([]);
  const [minApprovals, setMinApprovals] = useState(1);

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setStageType(stage.stage_type);
      setSlaValue(stage.sla_hours?.toString() || '');
      setSlaUnit((stage as any).sla_unit || 'hours');
      setSlaReason((stage as any).sla_reason || '');
      setAutoAdvance(stage.auto_advance);
      setFieldSetType((stage as any).field_set_type || '');
      setRequiredFields((stage.required_fields as string[]) || []);
      setOptionalFields([]);
      setCustomFields(((stage as any).custom_fields as CustomField[]) || []);
      setResponsibleRoles(((stage as any).responsible_roles as string[]) || []);
      setMinApprovals((stage as any).min_approvals || 1);
    } else {
      setName('');
      setStageType('review');
      setSlaValue('');
      setSlaUnit('hours');
      setSlaReason('');
      setAutoAdvance(false);
      setFieldSetType('');
      setRequiredFields([]);
      setOptionalFields([]);
      setCustomFields([]);
      setResponsibleRoles([]);
      setMinApprovals(1);
    }
  }, [stage, open]);

  const applyFieldSet = (type: string) => {
    setFieldSetType(type);
    if (!type) return;
    const def = briefDefinitions.find(d => d.type === type);
    if (!def) return;
    // Map brief fields to our field IDs where possible
    const mappedRequired: string[] = [];
    const fieldMapping: Record<string, string> = {
      project_name: 'title',
      campaign_name: 'title',
      event_name: 'title',
      objective: 'goal',
      target_audience: 'description',
      budget: 'budget',
      budget_range: 'budget',
      timeline: 'deadline',
      start_date: 'deadline',
    };
    def.fields.forEach(f => {
      const mapped = fieldMapping[f.key];
      if (mapped && f.required && !mappedRequired.includes(mapped)) {
        mappedRequired.push(mapped);
      }
    });
    setRequiredFields(prev => [...new Set([...prev, ...mappedRequired])]);
  };

  const toggleField = (id: string, type: 'required' | 'optional') => {
    if (type === 'required') {
      if (requiredFields.includes(id)) {
        setRequiredFields(prev => prev.filter(f => f !== id));
      } else {
        setRequiredFields(prev => [...prev, id]);
        setOptionalFields(prev => prev.filter(f => f !== id));
      }
    } else {
      if (optionalFields.includes(id)) {
        setOptionalFields(prev => prev.filter(f => f !== id));
      } else {
        setOptionalFields(prev => [...prev, id]);
        setRequiredFields(prev => prev.filter(f => f !== id));
      }
    }
  };

  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    setCustomFields(prev => [...prev, {
      id: `custom_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: false,
    }]);
    setNewFieldLabel('');
    setNewFieldType('text');
  };

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const toggleRole = (role: string) => {
    setResponsibleRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...(stage ? { id: stage.id } : {}),
      name: name.trim(),
      stage_type: stageType,
      sla_hours: slaValue ? parseInt(slaValue) : null,
      auto_advance: autoAdvance,
      required_fields: requiredFields,
      sort_order: stage?.sort_order ?? nextSortOrder,
      // Extended fields
      sla_unit: slaUnit,
      sla_reason: slaReason || null,
      field_set_type: fieldSetType || null,
      custom_fields: customFields,
      responsible_roles: responsibleRoles,
      min_approvals: minApprovals,
    } as any);
    onOpenChange(false);
  };

  const isApproval = stageType === 'approval';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{stage ? 'Επεξεργασία Κόμβου' : 'Νέος Κόμβος'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">Γενικά</TabsTrigger>
            <TabsTrigger value="fields" className="flex-1">Πεδία</TabsTrigger>
            <TabsTrigger value="owners" className="flex-1">Υπεύθυνοι</TabsTrigger>
          </TabsList>

          {/* ── Tab: Γενικά ── */}
          <TabsContent value="general" className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
            <div className="space-y-1.5">
              <Label>Όνομα</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="π.χ. Αξιολόγηση Διευθυντή" />
            </div>
            <div className="space-y-1.5">
              <Label>Τύπος κόμβου</Label>
              <Select value={stageType} onValueChange={setStageType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SLA</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={slaValue}
                  onChange={e => setSlaValue(e.target.value)}
                  placeholder="Αριθμός"
                  className="flex-1"
                />
                <Select value={slaUnit} onValueChange={setSlaUnit}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Ώρες</SelectItem>
                    <SelectItem value="days">Ημέρες</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={slaReason}
                onChange={e => setSlaReason(e.target.value)}
                placeholder="Αιτιολογία SLA (προαιρετικό)"
                className="mt-1.5"
              />
            </div>
            {!isApproval && (
              <div className="flex items-center justify-between">
                <Label>Αυτόματη προώθηση</Label>
                <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Πεδία & Φόρμα ── */}
          <TabsContent value="fields" className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
            <div className="space-y-1.5">
              <Label>Field Set (Πρότυπο)</Label>
            <Select value={fieldSetType || '__none__'} onValueChange={v => applyFieldSet(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε πρότυπο πεδίων..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Κανένα</SelectItem>
                  {briefDefinitions.map(d => (
                    <SelectItem key={d.type} value={d.type}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Εφαρμόζει preset πεδία από τις Προ-φόρμες
              </p>
            </div>

            <div className="space-y-2">
              <Label>Πεδία κόμβου</Label>
              <div className="border border-border/50 rounded-lg divide-y divide-border/30">
                {AVAILABLE_FIELDS.map(f => {
                  const isReq = requiredFields.includes(f.id);
                  const isOpt = optionalFields.includes(f.id);
                  return (
                    <div key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{f.label}</span>
                      <div className="flex gap-1">
                        <Badge
                          variant={isReq ? 'default' : 'outline'}
                          className="cursor-pointer text-[10px] px-2 py-0"
                          onClick={() => toggleField(f.id, 'required')}
                        >
                          Υποχρ.
                        </Badge>
                        <Badge
                          variant={isOpt ? 'secondary' : 'outline'}
                          className="cursor-pointer text-[10px] px-2 py-0"
                          onClick={() => toggleField(f.id, 'optional')}
                        >
                          Προαιρ.
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Custom πεδία</Label>
                <div className="space-y-1">
                  {customFields.map(cf => (
                    <div key={cf.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1 text-sm">
                      <span>{cf.label} <span className="text-muted-foreground text-xs">({cf.type})</span></span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeCustomField(cf.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Προσθήκη custom πεδίου</Label>
              <div className="flex gap-2">
                <Input
                  value={newFieldLabel}
                  onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="Ετικέτα πεδίου"
                  className="flex-1"
                />
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Κείμενο</SelectItem>
                    <SelectItem value="number">Αριθμός</SelectItem>
                    <SelectItem value="date">Ημ/νία</SelectItem>
                    <SelectItem value="select">Επιλογή</SelectItem>
                    <SelectItem value="textarea">Κείμενο πολ.</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={addCustomField} disabled={!newFieldLabel.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Υπεύθυνοι ── */}
          <TabsContent value="owners" className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
            <div className="space-y-2">
              <Label>Υπεύθυνοι ρόλοι</Label>
              <div className="flex flex-wrap gap-1.5">
                {RESPONSIBLE_ROLES.map(role => (
                  <Badge
                    key={role}
                    variant={responsibleRoles.includes(role) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleRole(role)}
                  >
                    {role}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Ποιοι ρόλοι είναι υπεύθυνοι για αυτό το στάδιο
              </p>
            </div>

            {isApproval && (
              <>
                <div className="space-y-1.5">
                  <Label>Ελάχιστες εγκρίσεις</Label>
                  <Input
                    type="number"
                    min={1}
                    value={minApprovals}
                    onChange={e => setMinApprovals(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Πόσες εγκρίσεις χρειάζονται για να προχωρήσει
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Ποιοι μπορούν να εγκρίνουν</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {RESPONSIBLE_ROLES.map(role => (
                      <Badge
                        key={role}
                        variant={responsibleRoles.includes(role) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Αποθήκευση</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
