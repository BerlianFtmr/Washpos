/**
 * CSV export helper (browser-only).
 *
 * Memicu download file CSV dari array of rows. Setiap row adalah object
 * dengan key = header kolom, value = string|number.
 *
 * - Memakai prefix BOM (`\ufeff`) supaya Excel Windows membaca UTF-8 dengan
 *   benar (terutama untuk karakter Rupiah / teks Indonesia).
 * - Nilai yang mengandung koma, kutip, atau newline di-quote dan di-escape
 *   sesuai RFC 4180.
 */

type CsvRow = Record<string, string | number>;

function escapeCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename: string, rows: CsvRow[]): void {
  if (!rows.length) {
    // Header tetap ditulis agar file tidak kosong
    const empty = new Blob(['\ufeff'], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(empty, filename);
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','));
  }

  // \r\n untuk kompatibilitas Excel Windows
  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], {
    type: 'text/csv;charset=utf-8;',
  });

  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
