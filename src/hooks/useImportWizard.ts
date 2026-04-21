import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ImportEntity,
  ParsedFile,
  ColumnMapping,
  ValidatedRow,
  ImportSummary,
} from '../components/import/schemas/types';
import { getSchema } from '../components/import/schemas';
import { autoMapHeaders } from '../components/import/utils/fuzzyMatch';
import { loadFkLookups, buildValidatedRows, type FkLookups } from '../components/import/utils/buildValidatedRows';
import { executeImport } from '../components/import/utils/importExecutor';

export type WizardStep = 'source' | 'upload' | 'mapping' | 'validation' | 'import';

export function useImportWizard(initialEntity: ImportEntity = 'clients') {
  const { user, company } = useAuth();
  const [entity, setEntity] = useState<ImportEntity>(initialEntity);
  const [step, setStep] = useState<WizardStep>('source');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [fk, setFk] = useState<FkLookups | null>(null);
  const [autoCreateMissing, setAutoCreateMissing] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number; label?: string } | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const schema = useMemo(() => getSchema(entity), [entity]);

  const reset = useCallback(() => {
    setStep('source');
    setParsed(null);
    setMapping({});
    setRows([]);
    setFk(null);
    setProgress(null);
    setSummary(null);
  }, []);

  const onParsed = useCallback(
    (p: ParsedFile) => {
      setParsed(p);
      setMapping(autoMapHeaders(p.headers, schema.fields));
      setStep('mapping');
    },
    [schema]
  );

  const goToValidation = useCallback(async () => {
    if (!parsed || !company) return;
    const lookups = await loadFkLookups(company.id, entity);
    setFk(lookups);
    const built = buildValidatedRows(parsed.rows, mapping, schema.fields, entity, lookups);
    setRows(built);
    setStep('validation');
  }, [parsed, mapping, entity, schema, company]);

  const runImport = useCallback(async () => {
    if (!user || !company) return;
    setStep('import');
    setProgress({ done: 0, total: rows.length });
    const result = await executeImport({
      entity,
      rows,
      companyId: company.id,
      userId: user.id,
      autoCreateMissing,
      onProgress: (done, total, label) => setProgress({ done, total, label }),
    });
    setSummary(result);
  }, [user, company, entity, rows, autoCreateMissing]);

  return {
    entity,
    setEntity,
    step,
    setStep,
    schema,
    parsed,
    setParsed,
    onParsed,
    mapping,
    setMapping,
    rows,
    setRows,
    fk,
    autoCreateMissing,
    setAutoCreateMissing,
    progress,
    summary,
    goToValidation,
    runImport,
    reset,
  };
}
