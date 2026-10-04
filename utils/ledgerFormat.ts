// Formatting + period helpers shared by the customer ledger screens, the
// receipt / entry sheets and the printable statement (utils/ledgerHtml.ts).
//
// Ledger amounts arrive from the API as plain numbers in rupees. Balances are
// signed: positive = the customer owes us (Dr), negative = advance (Cr).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ₹1,23,456.00 — statements always show paise, unlike the rest of the app's
// compact ₹1.23L figures, so totals can be checked line by line.
export function fmtMoney(n: number): string {
  return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ₹55,000.00 Dr / ₹2,000.00 Cr / ₹0.00
export function fmtDrCr(n: number): string {
  if (Math.abs(n) < 0.005) return fmtMoney(0);
  return `${fmtMoney(n)} ${n > 0 ? 'Dr' : 'Cr'}`;
}

// 'YYYY-MM-DD' → '04 Oct 2026'. Parsed by hand, not via new Date(), so the
// calendar day can't shift with the device's timezone.
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d} ${MONTHS[parseInt(m, 10) - 1] ?? m} ${y}`;
}

// 'YYYY-MM-DD' → 'DD/MM/YYYY' (form inputs and the printed statement)
export function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// 'DD/MM/YYYY' → 'YYYY-MM-DD', or null if it isn't a real date.
export function displayToIso(s: string): string | null {
  const p = s.trim().split('/');
  if (p.length !== 3 || p[2].length !== 4) return null;
  const iso = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return isNaN(t) || new Date(t).toISOString().slice(0, 10) !== iso ? null : iso;
}

// Typing helper: digits only, slashes inserted → DD/MM/YYYY
export function autoDate(text: string): string {
  const d = text.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Indian financial year (1 Apr – 31 Mar) containing `iso`, shifted by
// `offset` years (-1 = previous FY).
export function fyRange(iso: string = todayIso(), offset = 0): { from: string; to: string; label: string } {
  const y = parseInt(iso.slice(0, 4), 10);
  const m = parseInt(iso.slice(5, 7), 10);
  const start = (m >= 4 ? y : y - 1) + offset;
  return {
    from: `${start}-04-01`,
    to: `${start + 1}-03-31`,
    label: `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}`,
  };
}

export function periodLabel(from: string | null, to: string | null): string {
  if (!from && !to) return 'All transactions';
  if (from && to) return `${fmtDay(from)} – ${fmtDay(to)}`;
  return from ? `From ${fmtDay(from)}` : `Up to ${fmtDay(to)}`;
}

export const PAYMENT_MODES = [
  { key: 'cash',  label: 'Cash',   icon: 'cash-outline' },
  { key: 'upi',   label: 'UPI',    icon: 'phone-portrait-outline' },
  { key: 'neft',  label: 'NEFT',   icon: 'swap-horizontal-outline' },
  { key: 'check', label: 'Cheque', icon: 'document-outline' },
  { key: 'other', label: 'Other',  icon: 'ellipsis-horizontal-outline' },
] as const;

export const ENTRY_TYPES = [
  { key: 'discount',  label: 'Discount',     side: 'Cr', hint: 'Discount / rebate given — reduces what the customer owes' },
  { key: 'write_off', label: 'Write-off',    side: 'Cr', hint: 'Amount that will not be recovered (bad debt)' },
  { key: 'charge',    label: 'Extra charge', side: 'Dr', hint: 'Damage, late fee, extra work — adds to what the customer owes' },
  { key: 'refund',    label: 'Refund',       side: 'Dr', hint: 'Money paid back to the customer (e.g. returning an advance)' },
] as const;
