import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  CheckSquare,
  GripVertical,
  Copy,
} from 'lucide-react';

const PROJECT_TYPES = [
  { value: 'digital_campaign', label: 'Digital Campaign' },
  { value: 'event', label: 'Event' },
  { value: 'pr', label: 'PR / Δημόσιες Σχέσεις' },
  { value: 'branding', label: 'Branding' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'production', label: 'Production' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Άλλο' },
];

interface TemplateDeliverable {
  id?: string;
  name: string;
  description: string;
  default_budget: number;
  sort_order: number;
}

interface TemplateTask {
  id?: string;
  title: string;
  description: string;
  priority: string;
  task_type: string;
  task_category: string;
  estimated_hours: number;
  sort_order: number;
  deliverable_ref_order: number | null;
  days_offset_start: number;
  days_offset_due: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  default_budget: number;
  default_agency_fee_percentage: number;
  is_active: boolean;
  sort_order: number;
  deliverables?: TemplateDeliverable[];
  tasks?: TemplateTask[];
}

export function ProjectTemplatesManager() {
  const { user, company } = useAuth();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_type: 'digital_campaign',
    is_active: true,
  });
  const [deliverables, setDeliverables] = useState<TemplateDeliverable[]>([]);
  const [tasks, setTasks] = useState<TemplateTask[]>([]);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const fetchTemplateDetails = async (templateId: string) => {
    const [{ data: dels }, { data: tsks }] = await Promise.all([
      supabase.from('project_template_deliverables').select('*').eq('template_id', templateId).order('sort_order'),
      supabase.from('project_template_tasks').select('*').eq('template_id', templateId).order('sort_order'),
    ]);
    return { deliverables: dels || [], tasks: tsks || [] };
  };

  const handleEdit = async (template: ProjectTemplate) => {
    const details = await fetchTemplateDetails(template.id);
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      project_type: template.project_type,
      is_active: template.is_active,
    });
    setDeliverables(details.deliverables);
    setTasks(details.tasks);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('project_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Το template διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleDuplicate = async (template: ProjectTemplate) => {
    try {
      const details = await fetchTemplateDetails(template.id);
      const dupData: any = {
        name: `${template.name} (αντίγραφο)`,
        description: template.description,
        project_type: template.project_type,
        default_budget: template.default_budget,
        default_agency_fee_percentage: template.default_agency_fee_percentage,
        is_active: false,
        sort_order: templates.length,
      };
      if (company) dupData.company_id = company.id;
      const { data: newTemplate, error } = await supabase
        .from('project_templates')
        .insert(dupData)
        .select()
        .single();

      if (error) throw error;

      // Copy deliverables
      if (details.deliverables.length > 0) {
        await supabase.from('project_template_deliverables').insert(
          details.deliverables.map(d => ({
            template_id: newTemplate.id,
            name: d.name,
            description: d.description,
            default_budget: d.default_budget,
            sort_order: d.sort_order,
          }))
        );
      }

      // Copy tasks
      if (details.tasks.length > 0) {
        await supabase.from('project_template_tasks').insert(
          details.tasks.map(t => ({
            template_id: newTemplate.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            task_type: t.task_type,
            task_category: t.task_category,
            estimated_hours: t.estimated_hours,
            sort_order: t.sort_order,
            deliverable_ref_order: t.deliverable_ref_order,
            days_offset_start: t.days_offset_start,
            days_offset_due: t.days_offset_due,
          }))
        );
      }

      fetchTemplates();
      toast.success('Το template αντιγράφηκε!');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Σφάλμα κατά την αντιγραφή');
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      project_type: 'digital_campaign',
      is_active: true,
    });
    setDeliverables([]);
    setTasks([]);
  };

  const addDeliverable = () => {
    setDeliverables(prev => [...prev, {
      name: '',
      description: '',
      default_budget: 0,
      sort_order: prev.length,
    }]);
  };

  const addTask = () => {
    setTasks(prev => [...prev, {
      title: '',
      description: '',
      priority: 'medium',
      task_type: 'task',
      task_category: '',
      estimated_hours: 0,
      sort_order: prev.length,
      deliverable_ref_order: null,
      days_offset_start: 0,
      days_offset_due: 7,
    }]);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Το όνομα είναι υποχρεωτικό');
      return;
    }

    setSaving(true);
    try {
      const templateData: any = {
        name: formData.name,
        description: formData.description || null,
        project_type: formData.project_type,
        is_active: formData.is_active,
      };
      if (!editingTemplate && company) {
        templateData.company_id = company.id;
      }

      let templateId: string;

      if (editingTemplate) {
        const { error } = await supabase
          .from('project_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        templateId = editingTemplate.id;

        // Delete existing children and re-insert
        await Promise.all([
          supabase.from('project_template_deliverables').delete().eq('template_id', templateId),
          supabase.from('project_template_tasks').delete().eq('template_id', templateId),
        ]);
      } else {
        const { data, error } = await supabase
          .from('project_templates')
          .insert({ ...templateData, sort_order: templates.length })
          .select()
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      // Insert deliverables
      const validDeliverables = deliverables.filter(d => d.name.trim());
      if (validDeliverables.length > 0) {
        await supabase.from('project_template_deliverables').insert(
          validDeliverables.map((d, i) => ({
            template_id: templateId,
            name: d.name,
            description: d.description || null,
            default_budget: d.default_budget || 0,
            sort_order: i,
          }))
        );
      }

      // Insert tasks
      const validTasks = tasks.filter(t => t.title.trim());
      if (validTasks.length > 0) {
        await supabase.from('project_template_tasks').insert(
          validTasks.map((t, i) => ({
            template_id: templateId,
            title: t.title,
            description: t.description || null,
            priority: t.priority,
            task_type: t.task_type,
            task_category: t.task_category || null,
            estimated_hours: t.estimated_hours || 0,
            sort_order: i,
            deliverable_ref_order: t.deliverable_ref_order,
            days_offset_start: t.days_offset_start,
            days_offset_due: t.days_offset_due,
          }))
        );
      }

      toast.success(editingTemplate ? 'Το template ενημερώθηκε!' : 'Το template δημιουργήθηκε!');
      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (type: string) => PROJECT_TYPES.find(t => t.value === type)?.label || type;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            <CardTitle>Project Templates</CardTitle>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Νέο Template
          </Button>
        </div>
        <CardDescription>
          Προκαθορισμένοι τύποι έργων με default παραδοτέα και tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            Δεν υπάρχουν templates. Δημιουργήστε το πρώτο!
          </p>
        ) : (
          <div className="space-y-3">
            {templates.map(template => {
              const isGlobal = !(template as any).company_id;
              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        <Badge variant="secondary" className="text-xs">{getTypeLabel(template.project_type)}</Badge>
                        {isGlobal && (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20">System</Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Ανενεργό</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(template)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {!isGlobal && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(template)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(template.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Template Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Επεξεργασία Template' : 'Νέο Project Template'}</DialogTitle>
            <DialogDescription>
              Ορίστε τύπο έργου, default παραδοτέα και tasks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Όνομα Template *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="π.χ. Digital Campaign"
                />
              </div>
              <div className="space-y-2">
                <Label>Τύπος Έργου</Label>
                <Select value={formData.project_type} onValueChange={(v) => setFormData(prev => ({ ...prev, project_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Περιγραφή</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Σύντομη περιγραφή του τύπου έργου..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
              />
              <Label>Ενεργό</Label>
            </div>

            <Separator />

            {/* Deliverables */}
            <Accordion type="multiple" defaultValue={['deliverables', 'tasks']}>
              <AccordionItem value="deliverables">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Παραδοτέα ({deliverables.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {deliverables.map((del, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                      <span className="text-xs text-muted-foreground mt-2 w-5">#{idx + 1}</span>
                      <div className="flex-1 grid gap-2 sm:grid-cols-3">
                        <Input
                          placeholder="Όνομα παραδοτέου"
                          value={del.name}
                          onChange={(e) => {
                            const updated = [...deliverables];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setDeliverables(updated);
                          }}
                          className="sm:col-span-2"
                        />
                        <Input
                          type="number"
                          placeholder="Budget €"
                          value={del.default_budget || ''}
                          onChange={(e) => {
                            const updated = [...deliverables];
                            updated[idx] = { ...updated[idx], default_budget: parseFloat(e.target.value) || 0 };
                            setDeliverables(updated);
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeliverables(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addDeliverable}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Προσθήκη Παραδοτέου
                  </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tasks">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tasks ({tasks.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {tasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                      <span className="text-xs text-muted-foreground mt-2 w-5">#{idx + 1}</span>
                      <div className="flex-1 grid gap-2 sm:grid-cols-4">
                        <Input
                          placeholder="Τίτλος task"
                          value={task.title}
                          onChange={(e) => {
                            const updated = [...tasks];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setTasks(updated);
                          }}
                          className="sm:col-span-2"
                        />
                        <Select
                          value={task.priority}
                          onValueChange={(v) => {
                            const updated = [...tasks];
                            updated[idx] = { ...updated[idx], priority: v };
                            setTasks(updated);
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Ώρες"
                          value={task.estimated_hours || ''}
                          onChange={(e) => {
                            const updated = [...tasks];
                            updated[idx] = { ...updated[idx], estimated_hours: parseFloat(e.target.value) || 0 };
                            setTasks(updated);
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setTasks(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addTask}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Προσθήκη Task
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Ακύρωση
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingTemplate ? 'Αποθήκευση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
