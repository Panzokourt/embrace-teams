import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any, row: any) => string;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  // Create header row
  const headers = columns.map(col => `"${col.label}"`).join(',');
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value, row) : value;
      // Escape quotes and wrap in quotes
      const escaped = String(formatted ?? '').replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  
  const csvContent = [headers, ...rows].join('\n');
  
  // Add BOM for UTF-8 encoding (helps Excel recognize Greek characters)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  // Create a simple HTML table that Excel can open
  const headers = columns.map(col => `<th>${col.label}</th>`).join('');
  
  const rows = data.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value, row) : value;
      return `<td>${formatted ?? ''}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  
  const table = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head>
    <body>
      <table border="1">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob([table], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${filename}.xls`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Common formatters
export const formatters = {
  date: (value: string | null) => value ? format(new Date(value), 'd MMM yyyy', { locale: el }) : '-',
  currency: (value: number | null) => value != null ? `€${value.toLocaleString('el-GR')}` : '-',
  percentage: (value: number | null) => value != null ? `${value}%` : '-',
  hours: (value: number | null) => value != null ? `${value}h` : '-',
  boolean: (value: boolean | null) => value ? 'Ναι' : 'Όχι',
};
