/**
 * Format utilities for currency (Rupiah) and date/time in Indonesian locale.
 *
 * Single source of truth for all formatting across the app. Import from here
 * instead of re-defining `Intl.NumberFormat` / `toLocaleDateString` inline.
 */

/** Format a number (or numeric string) as Rupiah, e.g. `Rp 15.000`. */
export function formatRupiah(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Format a raw form input string as Rupiah for display/hint. Falls back to `Rp 0`. */
export function formatRupiahHint(value: string): string {
  if (!value || isNaN(Number(value))) return 'Rp 0';
  return formatRupiah(Number(value));
}

/** Format an ISO date string with time, e.g. `12 Jun 2026, 14.30`. */
export function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format an ISO date string without time, e.g. `12 Jun 2026`. */
export function formatDateOnly(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
