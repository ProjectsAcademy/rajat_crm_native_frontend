import { CustomerLedgerResponse } from '../services/api';
import { COMPANY, ICON, esc, iconChip } from './invoiceHtml';
import { isoToDisplay, todayIso } from './ledgerFormat';

// Printable "Statement of Account" for one customer and period — same
// letterhead as the invoice (utils/invoiceHtml.ts), then the ledger table
// with running balance, totals, closing balance and the ageing summary.
// Standalone HTML (inline <style>, no external assets) so it works for
// Print.printToFileAsync on native and a blob: tab on web, like invoices.

function amt(n: number): string {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function bal(n: number): string {
  if (Math.abs(n) < 0.005) return '0.00';
  return `${amt(n)} ${n > 0 ? 'Dr' : 'Cr'}`;
}

export function buildLedgerHtml(data: CustomerLedgerResponse): string {
  const { customer, statement, position } = data;
  const period = statement.from && statement.to ? `${isoToDisplay(statement.from)} to ${isoToDisplay(statement.to)}`
    : statement.from ? `${isoToDisplay(statement.from)} onwards`
    : statement.to ? `Up to ${isoToDisplay(statement.to)}`
    : 'All transactions';

  const rows = statement.lines.map((l) => `
      <tr>
        <td class="d">${l.date ? isoToDisplay(l.date) : ''}</td>
        <td class="l"><div class="p">${esc(l.particulars)}</div>${l.detail ? `<div class="sub">${esc(l.detail)}</div>` : ''}</td>
        <td class="r">${l.debit ? amt(l.debit) : ''}</td>
        <td class="r">${l.credit ? amt(l.credit) : ''}</td>
        <td class="r b">${bal(l.balance)}</td>
      </tr>`).join('');

  const closing = statement.closingBalance;
  const dueText = closing > 0.005 ? `Closing balance ₹${amt(closing)} Dr — amount payable`
    : closing < -0.005 ? `Closing balance ₹${amt(closing)} Cr — advance held with us`
    : 'Closing balance nil — account settled';
  const a = position.ageing;
  const ageing = position.outstanding > 0 ? `
    <table class="ageing">
      <thead><tr><th colspan="5" class="l">Outstanding by age (as on ${isoToDisplay(todayIso())})</th></tr>
        <tr><th>0–30 days</th><th>31–60 days</th><th>61–90 days</th><th>Over 90 days</th><th>Total due</th></tr></thead>
      <tbody><tr>
        <td class="r">${amt(a.d0_30)}</td><td class="r">${amt(a.d31_60)}</td><td class="r">${amt(a.d61_90)}</td>
        <td class="r">${amt(a.d90_plus)}</td><td class="r b">${amt(position.outstanding)}</td>
      </tr></tbody>
    </table>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(customer.customerName)} - Statement of Account</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #23283a; font-size: 11.5px; }
  /* Preview tab only — print uses the @page margins above */
  @media screen { body { max-width: 900px; margin: 24px auto; padding: 0 16px; } }
  .header { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 1.5px solid #23283a; }
  .brand-name { font-size: 26px; font-weight: 700; letter-spacing: 2px; line-height: 1; }
  .brand-tagline { font-size: 12.5px; font-weight: 700; letter-spacing: 1.2px; margin-top: 4px; }
  .brand-regn { font-size: 9.5px; font-weight: 600; margin-top: 5px; }
  .contact { text-align: right; font-size: 10.5px; }
  .gstin { font-weight: 700; font-size: 11.5px; letter-spacing: .5px; margin-bottom: 6px; }
  .contact-row { display: flex; align-items: flex-start; justify-content: flex-end; gap: 6px; margin-top: 4px; }
  .icon-chip { width: 15px; height: 15px; min-width: 15px; border-radius: 3px; background: #7c88a8; display: inline-flex; align-items: center; justify-content: center; }

  .title { text-align: center; font-size: 14px; font-weight: 700; letter-spacing: 3px; margin: 12px 0 10px; }
  .info { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 12px; }
  .info .to { flex: 1; }
  .info .meta { text-align: right; white-space: nowrap; }
  .k { font-weight: 700; }
  .party { font-size: 13px; font-weight: 700; margin: 2px 0 3px; }
  .muted { color: #555; }

  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #23283a; padding: 5px 7px; vertical-align: top; }
  th { background: #f2f3f7; font-weight: 700; text-align: center; }
  td.d { width: 13%; white-space: nowrap; }
  td.l, th.l { text-align: left; }
  td.r { text-align: right; white-space: nowrap; width: 14%; }
  .b { font-weight: 700; }
  .p { font-weight: 600; }
  .sub { font-size: 10px; color: #555; margin-top: 2px; }
  tr.bf td, tr.tot td { background: #fafafa; font-weight: 700; }
  tr.close td { font-weight: 800; font-size: 12.5px; border-top: 2px solid #23283a; }

  .due { margin: 12px 0 8px; padding: 8px 10px; border: 1.5px solid #23283a; font-size: 13px; font-weight: 700; }
  .ageing { margin-top: 6px; }
  .ageing td.r { width: auto; }

  .footer { display: flex; justify-content: flex-end; margin-top: 26px; }
  .for-block { text-align: right; }
  .for-company { font-weight: 700; }
  .sig-space { height: 40px; }
  .caption { font-size: 10.5px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">${COMPANY.name}</div>
      <div class="brand-tagline">${COMPANY.tagline}</div>
      <div class="brand-regn">${COMPANY.regnLine}</div>
    </div>
    <div class="contact">
      <div class="gstin">GSTIN ${COMPANY.gstin}</div>
      <div class="contact-row">${iconChip(ICON.pin)}<span>${esc(COMPANY.address)}</span></div>
      <div class="contact-row">${iconChip(ICON.phone)}<span>${COMPANY.phones.join(' / ')}</span></div>
      <div class="contact-row">${iconChip(ICON.mail)}<span>${COMPANY.email}</span></div>
    </div>
  </div>

  <div class="title">STATEMENT OF ACCOUNT</div>

  <div class="info">
    <div class="to">
      <div class="k">To,</div>
      <div class="party">M/s. ${esc(customer.customerName)}</div>
      ${customer.businessName ? `<div>${esc(customer.businessName)}</div>` : ''}
      ${customer.address ? `<div class="muted">${esc(customer.address)}</div>` : ''}
      ${customer.phone ? `<div class="muted">Mob. ${esc(customer.phone)}</div>` : ''}
      ${customer.gstin ? `<div class="muted">GSTIN ${esc(customer.gstin)}</div>` : ''}
    </div>
    <div class="meta">
      <div><span class="k">Customer Code:</span> ${esc(customer.customerCode)}</div>
      <div><span class="k">Period:</span> ${period}</div>
      <div><span class="k">Statement Date:</span> ${isoToDisplay(todayIso())}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Date</th><th class="l">Particulars</th><th>Debit (₹)</th><th>Credit (₹)</th><th>Balance (₹)</th></tr>
    </thead>
    <tbody>
      ${statement.from ? `<tr class="bf"><td class="d">${isoToDisplay(statement.from)}</td><td class="l">Opening Balance (brought forward)</td><td class="r"></td><td class="r"></td><td class="r">${bal(statement.openingBalance)}</td></tr>` : ''}
      ${rows || `<tr><td colspan="5" class="l muted">No transactions in this period.</td></tr>`}
      <tr class="tot"><td></td><td class="l">Total</td><td class="r">${amt(statement.totals.debit)}</td><td class="r">${amt(statement.totals.credit)}</td><td></td></tr>
      <tr class="close"><td></td><td class="l">Closing Balance</td><td class="r"></td><td class="r"></td><td class="r">${bal(closing)}</td></tr>
    </tbody>
  </table>

  <div class="due">${dueText}</div>
  ${ageing}

  <div class="footer">
    <div class="for-block">
      <div class="for-company">For: ${COMPANY.name} ${COMPANY.tagline}</div>
      <div class="sig-space"></div>
      <div class="caption">Authorised Signatory</div>
    </div>
  </div>
</body>
</html>`;
}
