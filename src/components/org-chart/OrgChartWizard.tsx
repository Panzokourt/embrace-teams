import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, Users, Briefcase, Code, Megaphone, Wallet, Headphones,
  ArrowRight, ArrowLeft, Check, Wand2, Loader2
} from 'lucide-react';

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

const TEMPLATES: Template[] = [
  {
    id: 'startup',
    name: 'Startup',
    description: 'Απλή δομή για μικρές ομάδες (5-15 άτομα)',
    icon: <Code className="h-5 w-5" />,
    positions: [
      {
        title: 'CEO / Founder',
        department: 'Executive',
        color: '#8B5CF6',
        children: [
          {
            title: 'CTO',
            department: 'Technology',
            color: '#3B82F6',
            children: [
              { title: 'Senior Developer', department: 'Engineering', color: '#06B6D4' },
              { title: 'Developer', department: 'Engineering', color: '#06B6D4' },
            ]
          },
          {
            title: 'COO',
            department: 'Operations',
            color: '#10B981',
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
        title: 'Managing Director',
        department: 'Executive',
        color: '#8B5CF6',
        children: [
          {
            title: 'Creative Director',
            department: 'Creative',
            color: '#EC4899',
            children: [
              { title: 'Art Director', department: 'Creative', color: '#EC4899' },
              { title: 'Senior Designer', department: 'Design', color: '#EC4899' },
              { title: 'Copywriter', department: 'Content', color: '#F59E0B' },
            ]
          },
          {
            title: 'Account Director',
            department: 'Client Services',
            color: '#3B82F6',
            children: [
              { title: 'Senior Account Manager', department: 'Client Services', color: '#3B82F6' },
              { title: 'Account Executive', department: 'Client Services', color: '#06B6D4' },
            ]
          },
          {
            title: 'Head of Digital',
            department: 'Digital',
            color: '#10B981',
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
        title: 'CEO',
        department: 'Executive',
        color: '#8B5CF6',
        children: [
          {
            title: 'CFO',
            department: 'Finance',
            color: '#10B981',
            children: [
              { title: 'Finance Manager', department: 'Finance', color: '#10B981' },
              { title: 'Accountant', department: 'Finance', color: '#10B981' },
            ]
          },
          {
            title: 'COO',
            department: 'Operations',
            color: '#3B82F6',
            children: [
              { title: 'Operations Manager', department: 'Operations', color: '#3B82F6' },
              { title: 'HR Manager', department: 'HR', color: '#EC4899' },
            ]
          },
          {
            title: 'CMO',
            department: 'Marketing',
            color: '#F59E0B',
            children: [
              { title: 'Marketing Manager', department: 'Marketing', color: '#F59E0B' },
              { title: 'Brand Manager', department: 'Marketing', color: '#F59E0B' },
            ]
          },
          {
            title: 'CTO',
            department: 'Technology',
            color: '#06B6D4',
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
        title: 'General Manager',
        department: 'Management',
        color: '#8B5CF6',
        children: [
          {
            title: 'Service Director',
            department: 'Service Delivery',
            color: '#3B82F6',
            children: [
              { title: 'Team Lead', department: 'Service Delivery', color: '#3B82F6' },
              { title: 'Senior Consultant', department: 'Consulting', color: '#06B6D4' },
              { title: 'Consultant', department: 'Consulting', color: '#06B6D4' },
            ]
          },
          {
            title: 'Sales Director',
            department: 'Sales',
            color: '#EF4444',
            children: [
              { title: 'Business Development', department: 'Sales', color: '#EF4444' },
              { title: 'Account Manager', department: 'Sales', color: '#F59E0B' },
            ]
          },
          {
            title: 'Support Manager',
            department: 'Support',
            color: '#10B981',
            children: [
              { title: 'Support Specialist', department: 'Support', color: '#10B981' },
            ]
          }
        ]
      }
    ]
  }
];

// Dummy names for positions
const DUMMY_NAMES = [
  'Αλέξανδρος Παπαδόπουλος',
  'Μαρία Γεωργίου',
  'Νίκος Κωνσταντίνου',
  'Ελένη Αντωνίου',
  'Γιώργος Δημητρίου',
  'Κατερίνα Νικολάου',
  'Δημήτρης Βασιλείου',
  'Σοφία Παναγιώτου',
  'Χρήστος Ιωάννου',
  'Αναστασία Χριστοδούλου',
  'Θάνος Μιχαήλ',
  'Εύα Σταματίου',
  'Πέτρος Αλεξάνδρου',
  'Ιωάννα Κυριάκου',
  'Στέφανος Γρηγορίου'
];

interface OrgChartWizardProps {
  companyId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function OrgChartWizard({ companyId, onComplete, onCancel }: OrgChartWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('startup');
  const [companyName, setCompanyName] = useState('');
  const [includeDummyUsers, setIncludeDummyUsers] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const selectedTemplateData = TEMPLATES.find(t => t.id === selectedTemplate);

  const countPositions = (positions: TemplatePosition[]): number => {
    return positions.reduce((sum, p) => {
      return sum + 1 + (p.children ? countPositions(p.children) : 0);
    }, 0);
  };

  const renderPreviewTree = (positions: TemplatePosition[], depth = 0): React.ReactNode => {
    return positions.map((pos, idx) => (
      <div key={`${pos.title}-${idx}`} className={`${depth > 0 ? 'ml-6 border-l-2 border-border pl-4' : ''}`}>
        <div className="flex items-center gap-2 py-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: pos.color }}
          />
          <span className="font-medium text-sm">{pos.title}</span>
          <Badge variant="outline" className="text-xs">{pos.department}</Badge>
        </div>
        {pos.children && renderPreviewTree(pos.children, depth + 1)}
      </div>
    ));
  };

  const handleCreate = async () => {
    if (!selectedTemplateData) return;
    
    setIsCreating(true);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // First, delete existing positions
      await supabase
        .from('org_chart_positions')
        .delete()
        .eq('company_id', companyId);

      let nameIndex = 0;
      
      // Flatten and create positions
      const createPositions = async (
        positions: TemplatePosition[], 
        parentId: string | null = null, 
        level = 0
      ) => {
        for (let i = 0; i < positions.length; i++) {
          const pos = positions[i];
          
          const { data: newPosition, error } = await supabase
            .from('org_chart_positions')
            .insert({
              company_id: companyId,
              position_title: pos.title,
              department: pos.department,
              color: pos.color,
              parent_position_id: parentId,
              level: level,
              sort_order: i
            })
            .select('id')
            .single();

          if (error) throw error;

          // Create dummy profile if enabled
          if (includeDummyUsers && newPosition) {
            const dummyName = DUMMY_NAMES[nameIndex % DUMMY_NAMES.length];
            nameIndex++;
            
            // Create a dummy profile entry (we'll use existing profiles or create placeholder data)
            // For now, we'll skip actual user creation since it requires auth
            // The positions will be shown as empty but with structure
          }

          if (pos.children && newPosition) {
            await createPositions(pos.children, newPosition.id, level + 1);
          }
        }
      };

      await createPositions(selectedTemplateData.positions);
      
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

      {/* Step 2: Preview */}
      {step === 2 && selectedTemplateData && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold">Προεπισκόπηση Δομής</h3>
            <p className="text-sm text-muted-foreground">Δείτε τη δομή που θα δημιουργηθεί</p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {selectedTemplateData.icon}
                <CardTitle className="text-lg">{selectedTemplateData.name}</CardTitle>
              </div>
              <CardDescription>
                {countPositions(selectedTemplateData.positions)} θέσεις θα δημιουργηθούν
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                {renderPreviewTree(selectedTemplateData.positions)}
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDummyUsers}
                onChange={(e) => setIncludeDummyUsers(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">Προσθήκη δοκιμαστικών ονομάτων στις θέσεις</span>
            </Label>
          </div>
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
              Θα δημιουργηθούν <strong>{countPositions(selectedTemplateData.positions)}</strong> θέσεις 
              με τη δομή <strong>{selectedTemplateData.name}</strong>
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
