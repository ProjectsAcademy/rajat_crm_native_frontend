import { InvoiceDetail } from '../services/api';

// Builds the printable invoice HTML — a digital version of the business's
// existing bill-book letterhead (see screenshot/Invoice template.jpg):
// company header, No./Date, M/s./Add., an items table, totals, and a
// signature footer. Returned as a standalone HTML document (inline <style>,
// no external assets) so it works unmodified as both a Print.printAsync/
// printToFileAsync source and a plain browser-openable file for preview.

// ── Letterhead constants — transcribed from the physical bill book ─────────────
const COMPANY = {
  name: 'RAJAT',
  tagline: 'ELECTRIC DECORATION & POWER POINT',
  regnLine: `'A' Class Electric Contractor in M.P. State   Regn. No. 23/8319-A`,
  services: [
    'General Lighting  •  Lighting Equipment  •  Silent Genset',
    'Trussing System  •  Chandelier  •  Cooling system  •  Tower Split AC',
    'CCTV Camera  •  Street Lights  •  Garden Lights',
  ],
  gstin: '23AGDPB3876A2Z0',
  address: '126, Adarsh Indira Nagar City, Indore 452002 (M.P.)',
  phones: ['8839032230', '9131847282'],
  email: 'vishalbhawsar538@gmail.com',
};

// ── Formatting helpers ──────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
function fmtQty(v: string): string {
  const n = parseFloat(v || '0');
  return isNaN(n) ? v : (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
}
function fmtAmt(v: string | number): string {
  const n = typeof v === 'number' ? v : parseFloat(v || '0');
  return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Small inline-SVG icons (pin/phone/mail) matching the letterhead's icon
// chips — no external image assets needed.
const ICON = {
  pin:   '<path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.2A2.2 2.2 0 1 1 8 3.8a2.2 2.2 0 0 1 0 4.4z" fill="#fff"/>',
  phone: '<path d="M3.6 1.3c.4-.3.9-.2 1.2.2l1.5 2c.3.4.2.9-.1 1.2L5 5.8c.6 1.3 1.7 2.4 3 3l1.1-1.2c.3-.3.8-.4 1.2-.1l2 1.5c.4.3.5.8.2 1.2l-1 1.4c-.3.4-.8.6-1.3.5-3.4-.7-6.4-3.7-7.1-7.1-.1-.5.1-1 .5-1.3l1.4-1z" fill="#fff"/>',
  mail:  '<path d="M1 3h14v10H1V3zm7 5.2L2.2 4h11.6L8 8.2zM1.6 4.6V12h12.8V4.6L8 9.4 1.6 4.6z" fill="#fff"/>',
};
function iconChip(svgPath: string): string {
  return `<span class="icon-chip"><svg width="12" height="12" viewBox="0 0 16 16">${svgPath}</svg></span>`;
}

export function buildInvoiceHtml(invoice: InvoiceDetail): string {
  const isSales = invoice.invoiceType !== 'purchase';
  const partyName = isSales ? (invoice.customer?.customerName ?? '') : (invoice.vendor?.name ?? '');
  const partyAddress = (isSales ? invoice.customer?.address : invoice.vendor?.address) ?? '';

  const itemRows = invoice.items.map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="l">${esc(it.description || '')}</td>
      <td class="c">${fmtQty(it.quantity)}</td>
      <td class="r">${fmtAmt(it.unitPrice)}</td>
      <td class="r">${fmtAmt(it.total)}</td>
    </tr>`).join('');

  // Pad with a few blank rows so a short item list still fills the table
  // visually, same as the bill book's mostly-empty printed rows.
  const blanksNeeded = Math.max(0, 4 - invoice.items.length);
  const blankRows = Array.from({ length: blanksNeeded }, () =>
    `<tr><td class="c">&nbsp;</td><td class="l"></td><td class="c"></td><td class="r"></td><td class="r"></td></tr>`
  ).join('');

  const subtotal = parseFloat(invoice.subtotal || '0');
  const tax = parseFloat(invoice.taxAmount || '0');
  const total = parseFloat(invoice.totalAmount || '0');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<!-- Customer/vendor name first, then invoice no. — drives the "Save as PDF"
     default filename in the browser print dialog (and the print header). -->
<title>${esc(partyName || 'Invoice')} - ${esc(invoice.invoiceNo)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #23283a; font-size: 12px; }
  .sheet { border: 1.5px solid #23283a; position: relative; overflow: hidden; }

  /* Curved banner — a stylistic nod to the bill book's hand-drawn arcs */
  .banner-a { position: absolute; top: -90px; right: -60px; width: 460px; height: 220px; border-radius: 50%; background: linear-gradient(135deg, #c7cee0, #9fabc4); opacity: .45; z-index: 0; }
  .banner-b { position: absolute; top: -40px; right: 40px; width: 300px; height: 140px; border-radius: 50%; background: linear-gradient(135deg, #dfe3ee, #b7c0d6); opacity: .55; z-index: 0; }

  .header { position: relative; z-index: 1; display: flex; justify-content: space-between; padding: 18px 20px 12px; gap: 16px; }
  .brand-name { font-size: 30px; font-weight: 700; letter-spacing: 2px; color: #23283a; line-height: 1; }
  .brand-tagline { font-size: 14px; font-weight: 700; letter-spacing: 1.5px; margin-top: 4px; padding-bottom: 4px; border-bottom: 1.5px solid #23283a; display: inline-block; }
  .brand-regn { font-size: 10px; font-weight: 600; margin-top: 6px; }
  .brand-services { font-size: 10px; margin-top: 5px; line-height: 1.6; color: #333; }

  .contact { text-align: right; font-size: 11px; }
  .gstin { font-weight: 700; font-size: 12px; letter-spacing: .5px; margin-bottom: 8px; }
  .contact-row { display: flex; align-items: flex-start; justify-content: flex-end; gap: 6px; margin-top: 6px; }
  .icon-chip { width: 16px; height: 16px; min-width: 16px; border-radius: 3px; background: #7c88a8; display: inline-flex; align-items: center; justify-content: center; }

  .meta { position: relative; z-index: 1; padding: 10px 20px; border-top: 1px solid #23283a; }
  .meta-row { display: flex; margin-bottom: 8px; }
  .meta-row .no-field { width: 45%; display: flex; align-items: baseline; gap: 8px; }
  .meta-row .no-field b { font-size: 15px; }
  .meta-row .date-field { flex: 1; display: flex; align-items: baseline; gap: 8px; }
  .field-line { flex: 1; border-bottom: 1px dotted #23283a; padding-bottom: 2px; min-height: 14px; font-weight: 600; }
  .field-label { font-weight: 700; white-space: nowrap; }
  .party-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }

  table { position: relative; z-index: 1; width: 100%; border-collapse: collapse; border-top: 1px solid #23283a; }
  th, td { border: 1px solid #23283a; padding: 6px 8px; font-size: 11.5px; }
  th { font-weight: 700; background: #f2f3f7; }
  td.c, th.c { text-align: center; width: 8%; }
  td.l { text-align: left; }
  td.r, th.r { text-align: right; width: 15%; }
  th.qty { width: 10%; text-align: center; }
  tbody tr td { height: 20px; }

  .totals-label { text-align: right; font-weight: 700; }
  .grand td { font-weight: 800; font-size: 13px; border-top: 2px solid #23283a; }

  .footer { position: relative; z-index: 1; display: flex; justify-content: space-between; padding: 18px 20px 20px; margin-top: 6px; }
  .sign-block { width: 46%; }
  .sign-field { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
  .sign-caption { text-align: center; font-size: 11px; margin-top: 4px; }
  .for-block { width: 46%; text-align: right; }
  .for-company { font-weight: 700; font-size: 12px; line-height: 1.4; }
  .sig-space { height: 42px; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="banner-a"></div>
    <div class="banner-b"></div>

    <div class="header">
      <div class="brand">
        <div class="brand-name">${COMPANY.name}</div>
        <div class="brand-tagline">${COMPANY.tagline}</div>
        <div class="brand-regn">${COMPANY.regnLine}</div>
        <div class="brand-services">
          ${COMPANY.services.map((s) => `&bull; ${s}<br/>`).join('')}
        </div>
      </div>
      <div class="contact">
        <div class="gstin">GSTIN ${COMPANY.gstin}</div>
        <div class="contact-row">${iconChip(ICON.pin)}<span>${esc(COMPANY.address)}</span></div>
        <div class="contact-row">${iconChip(ICON.phone)}<span>${COMPANY.phones.join(' / ')}</span></div>
        <div class="contact-row">${iconChip(ICON.mail)}<span>${COMPANY.email}</span></div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-row">
        <div class="no-field"><span class="field-label">No.</span><b>${esc(invoice.invoiceNo)}</b></div>
        <div class="date-field"><span class="field-label">Date</span><span class="field-line">${fmtDate(invoice.invoiceDate)}</span></div>
      </div>
      <div class="party-row"><span class="field-label">M/s.</span><span class="field-line">${esc(partyName)}</span></div>
      <div class="party-row"><span class="field-label">Add.</span><span class="field-line">${esc(partyAddress)}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="c">S.No.</th>
          <th>Particulars</th>
          <th class="qty">Qty.</th>
          <th class="r">Rate</th>
          <th class="r">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${blankRows}
        <tr><td colspan="3" style="border:none;"></td><td class="totals-label">Subtotal</td><td class="r">${fmtAmt(subtotal)}</td></tr>
        ${tax > 0 ? `<tr><td colspan="3" style="border:none;"></td><td class="totals-label">Tax</td><td class="r">${fmtAmt(tax)}</td></tr>` : ''}
        <tr class="grand"><td colspan="3" style="border:none;"></td><td class="totals-label">Total</td><td class="r">${fmtAmt(total)}</td></tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="sign-block">
        <div class="sign-field"><span class="field-label">Name</span><span class="field-line">&nbsp;</span></div>
        <div class="sign-field"><span class="field-label">Mob.</span><span class="field-line">&nbsp;</span></div>
        <div class="sign-caption">Receiver's Signature</div>
      </div>
      <div class="for-block">
        <div class="for-company">For: ${COMPANY.name} ${COMPANY.tagline}</div>
        <div class="sig-space"></div>
        <div class="sign-caption">Authorised Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
