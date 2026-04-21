import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Building2, FolderKanban, CheckSquare } from 'lucide-react';
import { ImportWizard } from '@/components/import/ImportWizard';
import type { ImportEntity } from '@/components/import/schemas/types';

export function BulkImportCard() {
  const [open, setOpen] = useState(false);
  const [entity, setEntity] = useState<ImportEntity>('clients');

  const start = (e: ImportEntity) => {
    setEntity(e);
    setOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Μαζική Εισαγωγή / Import
          </CardTitle>
          <CardDescription>
            Εισαγωγή πελατών, έργων ή tasks από αρχεία Excel ή CSV με AI-assisted column mapping.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="outline" className="justify-start" onClick={() => start('clients')}>
            <Building2 className="h-4 w-4 mr-2" /> Πελάτες
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => start('projects')}>
            <FolderKanban className="h-4 w-4 mr-2" /> Έργα
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => start('tasks')}>
            <CheckSquare className="h-4 w-4 mr-2" /> Tasks
          </Button>
        </CardContent>
      </Card>
      <ImportWizard open={open} onOpenChange={setOpen} entity={entity} />
    </>
  );
}
