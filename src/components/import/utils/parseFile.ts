import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ParsedFile } from '../schemas/types';

export async function parseFile(file: File, sheetName?: string): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'tsv' || file.type === 'text/csv') {
    return parseCsv(file);
  }
  if (ext === 'xlsx' || ext === 'xls' || file.type.includes('spreadsheet')) {
    return parseExcel(file, sheetName);
  }
  throw new Error(`Μη υποστηριζόμενος τύπος αρχείου: ${ext ?? file.type}`);
}

async function parseCsv(file: File): Promise<ParsedFile> {
  const text = await file.text();
  // Strip BOM
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(clean, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const rows = (result.data || []).filter((r) =>
          Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== '')
        );
        const headers = (result.meta.fields || []).map((h) => h.trim()).filter(Boolean);
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file: File, sheetName?: string): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = wb.SheetNames;
  if (sheetNames.length === 0) throw new Error('Το αρχείο δεν περιέχει sheets');

  const target = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const sheet = wb.Sheets[target];

  // raw=false → coerce dates/numbers to strings; defval='' → keep empty cells as ''
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  // Get headers from the sheet header row to preserve order
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    if (cell && cell.v != null) {
      headers.push(String(cell.v).trim());
    }
  }

  const cleaned = rows.filter((r) =>
    Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== '')
  );

  return { headers, rows: cleaned, sheetName: target, sheetNames };
}
