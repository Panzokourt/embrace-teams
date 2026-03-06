import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building2, Users, Code, Megaphone, Headphones,
  ArrowRight, ArrowLeft, Check, Wand2, Loader2, UserCheck, UserX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from './types';

interface TemplatePosition {
  title: string;
  department: string;
  color: string;
  children?: TemplatePosition[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  positions: TemplatePosition[];
}

interface FlatPosition {
  title: string;
  department: string;
  color: string;
  parentIndex: number | null;
  assignedUserId: string | null;
  suggestedUserId: string | null;
}

const TEMPLATES: Template[] = [
  {
    id: 'startup',
    name: 'Startup',
    description: 'Απλή δομή για μικρές ομάδες (5-15 άτομα)',
    icon: <Code className="h-5 w-5" />,
    positions: [
      {
        title: 'CEO / Founder', department: 'Executive', color: '#8B5CF6',
        children: [
          { title: 'CTO', department: 'Technology', color: '#3B82F6',
            children: [
              { title: 'Senior Developer', department: 'Engineering', color: '#06B6D4' },
              { title: 'Developer', department: 'Engineering', color: '#06B6D4' },
            ]
          },
          { title: 'COO', department: 'Operations', color: '#10B981',
            children: [
              { title: 'Marketing Manager', department: 'Marketing', color: '#F59E0B' },
              { title: 'Sales Manager', department: 'Sales', color: '#EF4444' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'agency',
    name: 'Agency / Media',
    description: 'Δομή για δημιουργικά γραφεία & agencies',
    icon: <Megaphone className="h-5 w-5" />,
    positions: [
      {
        title: 'Managing Director', department: 'Executive', color: '#8B5CF6',
        children: [
          { title: 'Creative Director', department: 'Creative', color: '#EC4899',
            children: [
              { title: 'Art Director', department: 'Creative', color: '#EC4899' },
              { title: 'Senior Designer', department: 'Design', color: '#EC4899' },
              { title: 'Copywriter', department: 'Content', color: '#F59E0B' },
            ]
          },
          { title: 'Account Director', department: 'Client Services', color: '#3B82F6',
            children: [
              { title: 'Senior Account Manager', department: 'Client Services', color: '#3B82F6' },
              { title: 'Account Executive', department: 'Client Services', color: '#06B6D4' },
            ]
          },
          { title: 'Head of Digital', department: 'Digital', color: '#10B981',
            children: [
              { title: 'Digital Strategist', department: 'Digital', color: '#10B981' },
              { title: 'Social Media Manager', department: 'Digital', color: '#10B981' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'corporate',
    name: 'Εταιρική',
    description: 'Κλασική εταιρική δομή με πολλά τμήματα',
    icon: <Building2 className="h-5 w-5" />,
    positions: [
      {
        title: 'CEO', department: 'Executive', color: '#8B5CF6',
        children: [
          { title: 'CFO', department: 'Finance', color: '#10B981',
            children: [
              { title: 'Finance Manager', department: 'Finance', color: '#10B981' },
              { title: 'Accountant', department: 'Finance', color: '#10B981' },
            ]
          },
          { title: 'COO', department: 'Operations', color: '#3B82F6',
            children: [
              { title: 'Operations Manager', department: 'Operations', color: '#3B82F6' },
              { title: 'HR Manager', department: 'HR', color: '#EC4899' },
            ]
          },
          { title: 'CMO', department: 'Marketing', color: '#F59E0B',
            children: [
              { title: 'Marketing Manager', department: 'Marketing', color: '#F59E0B' },
              { title: 'Brand Manager', department: 'Marketing', color: '#F59E0B' },
            ]
          },
          { title: 'CTO', department: 'Technology', color: '#06B6D4',
            children: [
              { title: 'Tech Lead', department: 'Engineering', color: '#06B6D4' },
              { title: 'Senior Developer', department: 'Engineering', color: '#06B6D4' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'services',
    name: 'Υπηρεσίες',
    description: 'Δομή για εταιρείες παροχής υπηρεσιών',
    icon: <Headphones className="h-5 w-5" />,
    positions: [
      {
        title: 'General Manager', department: 'Management', color: '#8B5CF6',
        children: [
          { title: 'Service Director', department: 'Service Delivery', color: '#3B82F6',
            children: [
              { title: 'Team Lead', department: 'Service Delivery', color: '#3B82F6' },
              { title: 'Senior Consultant', department: 'Consulting', color: '#06B6D4' },
              { title: 'Consultant', department: 'Consulting', color: '#06B6D4' },
            ]
          },
          { title: 'Sales Director', department: 'Sales', color: '#EF4444',
            children: [
              { title: 'Business Development', department: 'Sales', color: '#EF4444' },
              { title: 'Account Manager', department: 'Sales', color: '#F59E0B' },
            ]
          },
          { title: 'Support Manager', department: 'Support', color: '#10B981',
            children: [
              { title: 'Support Specialist', department: 'Support', color: '#10B981' },
            ]
          }
        ]
      }
    ]
  }
];

function flattenTemplate(positions: TemplatePosition[], parentIndex: number | null = null): FlatPosition[] {
  const result: FlatPosition[] = [];
  for (const pos of positions) {
    const idx = result.length;
    result.push({
      title: pos.title,
      department: pos.department,
      color: pos.color,
      parentIndex,
      assignedUserId: null,
      suggestedUserId: null,
    });
    if (pos.children) {
      // Need to adjust: children's parentIndex should be relative to the final flat array
      const childFlat = flattenTemplateWithOffset(pos.children, idx, result.length);
      result.push(...childFlat);
    }
  }
  return result;
}

function flattenTemplateWithOffset(positions: TemplatePosition[], parentIdx: number, currentOffset: number): FlatPosition[] {
  const result: FlatPosition[] = [];
  for (const pos of positions) {
    const myIdx = currentOffset + result.length;
    result.push({
      title: pos.title,
      department: pos.department,
      color: pos.color,
      parentIndex: parentIdx,
      assignedUserId: null,
      suggestedUserId: null,
    });
    if (pos.children) {
      const childFlat = flattenTemplateWithOffset(pos.children, myIdx, currentOffset + result.length);
      result.push(...childFlat);
    }
  }
  return result;
}

function autoSuggestMatches(flatPositions: FlatPosition[], profiles: Profile[]): FlatPosition[] {
  const usedProfileIds = new Set<string>();
  
  return flatPositions.map(pos => {
    // Try to match by job_title first, then by department
    const titleLower = pos.title.toLowerCase();
    const deptLower = pos.department.toLowerCase();
    
    let bestMatch: Profile | null = null;
    
    // Exact title match
    for (const p of profiles) {
      if (usedProfileIds.has(p.id)) continue;
      const jobTitle = (p.job_title || '').toLowerCase();
      if (jobTitle && titleLower.includes(jobTitle) || jobTitle && jobTitle.includes(titleLower.split('/')[0].trim())) {
        bestMatch = p;
        break;
      }
    }
    
    // Department match as fallback
    if (!bestMatch) {
      for (const p of profiles) {
        if (usedProfileIds.has(p.id)) continue;
        const pDept = (p.department || '').toLowerCase();
        if (pDept && (deptLower.includes(pDept) || pDept.includes(deptLower))) {
          bestMatch = p;
          break;
        }
      }
    }
    
    if (bestMatch) {
      usedProfileIds.add(bestMatch.id);
      return { ...pos, suggestedUserId: bestMatch.id, assignedUserId: bestMatch.id };
    }
    return pos;
  });
}

interface OrgChartWizardProps {
  companyId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function OrgChartWizard({ companyId, onComplete, onCancel }: OrgChartWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('startup');
  const [isCreating, setIsCreating] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [flatPositions, setFlatPositions] = useState<FlatPosition[]>([]);

  const selectedTemplateData = TEMPLATES.find(t => t.id === selectedTemplate);

  // Fetch profiles when entering step 2
  useEffect(() => {
    if (step === 2 && profiles.length === 0) {
      setLoadingProfiles(true);
      supabase.from('profiles')
        .select('id, full_name, email, avatar_url, job_title, department, phone')
        .then(({ data }) => {
          setProfiles(data || []);
          setLoadingProfiles(false);
        });
    }
  }, [step]);

  // When entering step 2, flatten and auto-suggest
  useEffect(() => {
    if (step === 2 && selectedTemplateData && profiles.length > 0) {
      const flat = flattenTemplate(selectedTemplateData.positions);
      const matched = autoSuggestMatches(flat, profiles);
      setFlatPositions(matched);
    }
  }, [step, selectedTemplateData, profiles]);

  const countPositions = (positions: TemplatePosition[]): number => {
    return positions.reduce((sum, p) => {
      return sum + 1 + (p.children ? countPositions(p.children) : 0);
    }, 0);
  };

  const renderPreviewTree = (positions: TemplatePosition[], depth = 0): React.ReactNode => {
    return positions.map((pos, idx) => (
      <div key={`${pos.title}-${idx}`} className={`${depth > 0 ? 'ml-6 border-l-2 border-border pl-4' : ''}`}>
        <div className="flex items-center gap-2 py-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pos.color }} />
          <span className="font-medium text-sm">{pos.title}</span>
          <Badge variant="outline" className="text-xs">{pos.department}</Badge>
        </div>
        {pos.children && renderPreviewTree(pos.children, depth + 1)}
      </div>
    ));
  };

  const assignedCount = flatPositions.filter(p => p.assignedUserId).length;
  const totalCount = flatPositions.length;

  const handleAssignChange = (index: number, userId: string) => {
    setFlatPositions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], assignedUserId: userId === 'none' ? null : userId };
      return next;
    });
  };

  const handleCreate = async () => {
    if (!selectedTemplateData) return;
    setIsCreating(true);
    
    try {
      // Delete existing positions
      await supabase.from('org_chart_positions').delete().eq('company_id', companyId);

      // Create positions from flatPositions, maintaining hierarchy via parentIndex
      const createdIds: string[] = [];
      
      for (let i = 0; i < flatPositions.length; i++) {
        const pos = flatPositions[i];
        const parentDbId = pos.parentIndex !== null ? createdIds[pos.parentIndex] : null;
        
        const { data, error } = await supabase
          .from('org_chart_positions')
          .insert({
            company_id: companyId,
            position_title: pos.title,
            department: pos.department,
            color: pos.color,
            parent_position_id: parentDbId,
            user_id: pos.assignedUserId,
            level: pos.parentIndex !== null ? (flatPositions.slice(0, i).filter((_, j) => j === pos.parentIndex).length > 0 ? 1 : 0) : 0,
            sort_order: i,
          })
          .select('id')
          .single();

        if (error) throw error;
        createdIds.push(data.id);
      }

      // Fix levels by traversing
      for (let i = 0; i < flatPositions.length; i++) {
        const level = flatPositions[i].parentIndex !== null ? getLevel(i, flatPositions) : 0;
        await supabase.from('org_chart_positions').update({ level }).eq('id', createdIds[i]);
      }
      
      onComplete();
    } catch (error) {
      console.error('Error creating org chart:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s === step ? 'w-8 bg-primary' : s < step ? 'w-8 bg-primary/50' : 'w-2 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Choose template */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold">Επιλέξτε Template</h3>
            <p className="text-sm text-muted-foreground">Διαλέξτε τη δομή που ταιριάζει στην εταιρεία σας</p>
          </div>
          <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <div className="grid gap-3">
              {TEMPLATES.map((template) => (
                <Label
                  key={template.id}
                  htmlFor={template.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50 ${
                    selectedTemplate === template.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <RadioGroupItem value={template.id} id={template.id} />
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                  </div>
                  <Badge variant="secondary">
                    {countPositions(template.positions)} θέσεις
                  </Badge>
                </Label>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Step 2: Assign Personnel */}
      {step === 2 && selectedTemplateData && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold">Αντιστοίχιση Προσωπικού</h3>
            <p className="text-sm text-muted-foreground">
              Αντιστοιχίστε υπάρχοντα μέλη σε θέσεις — {assignedCount}/{totalCount} αντιστοιχισμένα
            </p>
          </div>

          {loadingProfiles ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-2 pr-4">
                {flatPositions.map((pos, idx) => {
                  const assignedProfile = pos.assignedUserId ? profiles.find(p => p.id === pos.assignedUserId) : null;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pos.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{pos.title}</div>
                        <div className="text-xs text-muted-foreground">{pos.department}</div>
                      </div>
                      <Select
                        value={pos.assignedUserId || 'none'}
                        onValueChange={(val) => handleAssignChange(idx, val)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue>
                            {assignedProfile ? (
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">{assignedProfile.full_name || assignedProfile.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <UserX className="h-3.5 w-3.5 shrink-0" />
                                <span>Κενή θέση</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Κενή θέση</SelectItem>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={p.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {(p.full_name || p.email)?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{p.full_name || p.email}</span>
                                {p.job_title && <span className="text-xs text-muted-foreground">({p.job_title})</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {pos.suggestedUserId === pos.assignedUserId && pos.suggestedUserId && (
                        <Badge variant="secondary" className="text-xs shrink-0">Auto</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {profiles.length === 0 && !loadingProfiles && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Δεν βρέθηκαν μέλη. Οι θέσεις θα δημιουργηθούν κενές.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && selectedTemplateData && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Έτοιμοι για δημιουργία!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Θα δημιουργηθούν <strong>{totalCount}</strong> θέσεις 
              με τη δομή <strong>{selectedTemplateData.name}</strong>
              {assignedCount > 0 && <> — <strong>{assignedCount}</strong> αντιστοιχισμένες</>}
            </p>
          </div>

          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Προσοχή: Η υπάρχουσα δομή οργανογράμματος θα αντικατασταθεί.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
          disabled={isCreating}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Ακύρωση' : 'Πίσω'}
        </Button>

        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)}>
            Επόμενο
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Δημιουργία...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Δημιουργία Οργανογράμματος
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function getLevel(index: number, positions: FlatPosition[]): number {
  let level = 0;
  let current = positions[index];
  while (current.parentIndex !== null) {
    level++;
    current = positions[current.parentIndex];
  }
  return level;
}
