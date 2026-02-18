import { BriefFieldConfig } from './briefDefinitions';

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderFieldValue(field: BriefFieldConfig, value: any): string {
  if (value === null || value === undefined || value === '') return '-';

  if (field.type === 'checkboxes' || field.type === 'multiselect') {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }

  if (field.type === 'repeater' && Array.isArray(value)) {
    if (value.length === 0) return '-';
    const subFields = field.repeaterFields || [];
    const headerRow = subFields.map(sf => `<th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5;">${escapeHtml(sf.label)}</th>`).join('');
    const rows = value.map(item => {
      const cells = subFields.map(sf => `<td style="border:1px solid #ccc;padding:4px 8px;">${escapeHtml(String(item[sf.key] ?? ''))}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table style="border-collapse:collapse;width:100%;margin-top:4px;"><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  return escapeHtml(String(value));
}

function buildHtmlTable(title: string, fields: BriefFieldConfig[], data: Record<string, any>): string {
  const rows = fields.map(field => {
    const val = renderFieldValue(field, data[field.key]);
    const isTable = field.type === 'repeater';
    return `<tr>
      <td style="border:1px solid #ccc;padding:8px 12px;background:#fafafa;font-weight:600;width:200px;vertical-align:top;">${escapeHtml(field.label)}</td>
      <td style="border:1px solid #ccc;padding:8px 12px;${isTable ? '' : 'white-space:pre-wrap;'}">${val}</td>
    </tr>`;
  }).join('');

  return `
    <html>
    <head><meta charset="UTF-8"><style>
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
      h1 { font-size: 22px; margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; }
      @media print {
        body { padding: 0; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; }
      }
    </style></head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <table style="border-collapse:collapse;width:100%;">
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;
}

export function exportBriefToPdf(title: string, fields: BriefFieldConfig[], data: Record<string, any>) {
  const html = buildHtmlTable(title, fields, data);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}

export function exportBriefToWord(title: string, fields: BriefFieldConfig[], data: Record<string, any>) {
  const html = buildHtmlTable(title, fields, data);
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8;' });
  downloadBlob(blob, `${title}.doc`);
}

export function exportBriefToExcel(title: string, fields: BriefFieldConfig[], data: Record<string, any>) {
  const rows = fields.map(field => {
    const val = data[field.key];
    let display: string;
    if (field.type === 'checkboxes' || field.type === 'multiselect') {
      display = Array.isArray(val) ? val.join(', ') : String(val ?? '');
    } else if (field.type === 'repeater' && Array.isArray(val)) {
      display = val.map((item: any) =>
        (field.repeaterFields || []).map(sf => `${sf.label}: ${item[sf.key] ?? ''}`).join(' | ')
      ).join('\n');
    } else {
      display = String(val ?? '');
    }
    return `<tr><td>${escapeHtml(field.label)}</td><td>${escapeHtml(display)}</td></tr>`;
  }).join('');

  const table = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head>
    <body>
      <table border="1">
        <thead><tr><th>Πεδίο</th><th>Τιμή</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([table], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${title}.xls`);
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
