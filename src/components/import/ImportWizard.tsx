import { useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Upload as UploadIcon } from 'lucide-react';
import { useImportWizard, type WizardStep } from '@/hooks/useImportWizard';
import type { ImportEntity } from './schemas/types';
import { StepEntitySource } from './steps/StepEntitySource';
import { StepUpload } from './steps/StepUpload';
import { StepMapping } from './steps/StepMapping';
import { StepValidation } from './steps/StepValidation';
import { StepImport } from './steps/StepImport';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity?: ImportEntity;
  onComplete?: () => void;
}

const STEP_LABELS: Record<WizardStep, string> = {
  source: 'Είδος',
  upload: 'Ανέβασμα',
  mapping: 'Αντιστοίχιση',
  validation: 'Έλεγχος',
  import: 'Εισαγωγή',
};
const STEP_ORDER: WizardStep[] = ['source', 'upload', 'mapping', 'validation', 'import'];

export function ImportWizard({ open, onOpenChange, entity = 'clients', onComplete }: Props) {
  const wiz = useImportWizard(entity);

  useEffect(() => {
    if (open) {
      wiz.reset();
      wiz.setEntity(entity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity]);

  const stepIdx = STEP_ORDER.indexOf(wiz.step);

  const handleClose = (v: boolean) => {
    if (!v && wiz.summary) onComplete?.();
    onOpenChange(v);
  };

  const goBack = () => {
    if (stepIdx > 0 && wiz.step !== 'import') {
      wiz.setStep(STEP_ORDER[stepIdx - 1]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[min(900px,calc(100vw-2rem))] max-w-none max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            Μαζική Εισαγωγή
          </DialogTitle>
          <DialogDescription>
            Βήμα {stepIdx + 1} από {STEP_ORDER.length}: {STEP_LABELS[wiz.step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-2">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {wiz.step === 'source' && (
            <StepEntitySource
              entity={wiz.entity}
              onEntityChange={wiz.setEntity}
              onContinueToUpload={() => wiz.setStep('upload')}
            />
          )}
          {wiz.step === 'upload' && <StepUpload onParsed={wiz.onParsed} />}
          {wiz.step === 'mapping' && wiz.parsed && (
            <StepMapping
              parsed={wiz.parsed}
              schema={wiz.schema}
              entity={wiz.entity}
              mapping={wiz.mapping}
              onMappingChange={wiz.setMapping}
              onContinue={wiz.goToValidation}
            />
          )}
          {wiz.step === 'validation' && (
            <StepValidation
              entity={wiz.entity}
              schema={wiz.schema}
              rows={wiz.rows}
              onRowsChange={wiz.setRows}
              autoCreateMissing={wiz.autoCreateMissing}
              onAutoCreateChange={wiz.setAutoCreateMissing}
              onContinue={wiz.runImport}
            />
          )}
          {wiz.step === 'import' && (
            <StepImport
              progress={wiz.progress}
              summary={wiz.summary}
              onClose={() => handleClose(false)}
            />
          )}
        </div>

        {stepIdx > 0 && wiz.step !== 'import' && (
          <div className="pt-3 border-t">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
