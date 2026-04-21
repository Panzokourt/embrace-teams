import * as XLSX from 'xlsx';
import type { EntitySchema } from '../schemas/types';

export function buildTemplate(schema: EntitySchema): Blob {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Headers + 2 example rows
  const headers = schema.fields.map((f) => (f.required ? `${f.label} *` : f.label));
  const example = schema.fields.map((f) => {
    const v = (schema.exampleRow as any)[f.key];
    if (Array.isArray(v)) return v.join(', ');
    return v ?? '';
  });
  // Empty placeholder row
  const empty = schema.fields.map(() => '');

  const sheetData = [headers, example, empty];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws['!cols'] = schema.fields.map((f) => ({
    wch: Math.max(14, f.label.length + 4),
  }));

  XLSX.utils.book_append_sheet(wb, ws, schema.label);

  // Sheet 2: Οδηγίες
  const instructionRows: (string | number)[][] = [
    ['Πεδίο', 'Τύπος', 'Υποχρεωτικό', 'Σημειώσεις / Επιτρεπόμενες τιμές'],
  ];
  for (const f of schema.fields) {
    let notes = f.hint ?? '';
    if (f.type === 'enum' && f.enumValues) {
      notes = `Μία από: ${f.enumValues.map((e) => e.value).join(', ')}`;
    } else if (f.type === 'date') {
      notes = 'yyyy-mm-dd ή dd/mm/yyyy';
    } else if (f.type === 'tags') {
      notes = 'Διαχωρισμός με κόμμα: tag1, tag2';
    } else if (f.type === 'email') {
      notes = notes || 'π.χ. user@example.com';
    } else if (f.type === 'number') {
      notes = notes || 'Δεκαδικός αριθμός (π.χ. 1500.50)';
    }
    instructionRows.push([f.label, f.type, f.required ? 'Ναι' : 'Όχι', notes]);
  }
  const wsInstr = XLSX.utils.aoa_to_sheet(instructionRows);
  wsInstr['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Οδηγίες');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildErrorReport(failures: { index: number; error: string; data: Record<string, any> }[]): Blob {
  if (failures.length === 0) {
    return new Blob(['No failures'], { type: 'text/csv;charset=utf-8;' });
  }
  const allKeys = new Set<string>();
  failures.forEach((f) => Object.keys(f.data).forEach((k) => allKeys.add(k)));
  const headers = ['Γραμμή', 'Σφάλμα', ...Array.from(allKeys)];
  const lines = [headers.join(',')];
  for (const f of failures) {
    const row = [
      String(f.index + 2), // +2: 1 for header, 1 for 1-based row numbering
      `"${(f.error || '').replace(/"/g, '""')}"`,
      ...Array.from(allKeys).map((k) => {
        const v = f.data[k];
        const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }),
    ];
    lines.push(row.join(','));
  }
  return new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
}
