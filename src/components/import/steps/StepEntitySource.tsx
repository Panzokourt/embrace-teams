import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Upload, Users, FolderKanban, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportEntity } from '../schemas/types';
import { getSchema } from '../schemas';
import { buildTemplate, downloadBlob } from '../utils/templateBuilder';

interface Props {
  entity: ImportEntity;
  onEntityChange: (e: ImportEntity) => void;
  onContinueToUpload: () => void;
}

const ENTITY_OPTIONS: { value: ImportEntity; label: string; icon: any; desc: string }[] = [
  { value: 'clients', label: 'Πελάτες', icon: Users, desc: 'Επωνυμία, στοιχεία επικοινωνίας, ΑΦΜ, tags' },
  { value: 'projects', label: 'Έργα', icon: FolderKanban, desc: 'Όνομα, πελάτης, status, budget, ημερομηνίες' },
  { value: 'tasks', label: 'Tasks', icon: CheckSquare, desc: 'Τίτλος, έργο, ανάθεση, προτεραιότητα, deadline' },
];

export function StepEntitySource({ entity, onEntityChange, onContinueToUpload }: Props) {
  const schema = getSchema(entity);

  const handleDownloadTemplate = () => {
    const blob = buildTemplate(schema);
    downloadBlob(blob, `template_${entity}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">1. Τι θέλεις να εισάγεις;</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ENTITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = entity === opt.value;
            return (
              <Card
                key={opt.value}
                onClick={() => onEntityChange(opt.value)}
                className={cn(
                  'p-4 cursor-pointer border-2 transition-all',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <Icon className={cn('h-5 w-5 mb-2', active ? 'text-primary' : 'text-muted-foreground')} />
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">2. Πηγή δεδομένων</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4 border-2 border-dashed">
            <Download className="h-5 w-5 text-muted-foreground mb-2" />
            <div className="font-medium text-sm">Κατέβασμα template</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Excel αρχείο με προ-συμπληρωμένα headers + παράδειγμα + οδηγίες.
            </p>
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="w-full">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Λήψη template_{entity}.xlsx
            </Button>
          </Card>
          <Card className="p-4 border-2 border-primary/40 bg-primary/5">
            <Upload className="h-5 w-5 text-primary mb-2" />
            <div className="font-medium text-sm">Ανέβασμα αρχείου</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Συμπλήρωσε το template ή ανέβασε δικό σου .xlsx / .csv.
            </p>
            <Button size="sm" onClick={onContinueToUpload} className="w-full">
              Συνέχεια στο ανέβασμα
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
