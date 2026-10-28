import { confirmAsync, notify } from './dialogs';

// WhatsApp template messages cost money (outside the customer's 24-hour
// window) and cannot be recalled, so every send asks first and shows the
// number it goes to. One send at a time: a second tap while one is on its
// way is ignored instead of sending (and paying for) the message twice.

let sending = false;

export async function confirmAndSendWhatsapp(opts: {
  what: string;                 // e.g. "the order confirmation"
  customerName: string;
  phone: string | null | undefined;
  send: () => Promise<{ data: { sentTo: string } }>;
  title?: string;
  intro?: string;               // shown above the question, e.g. what was just saved
  // An offer right after saving: without a phone number only `intro` is shown.
  afterSave?: boolean;
  // The customer sent STOP: said in the dialog, the person still decides.
  optedOut?: boolean;
}): Promise<boolean> {
  const phone = opts.phone?.trim();
  if (!phone) {
    if (opts.afterSave) {
      if (opts.intro) notify(opts.title ?? 'Saved', opts.intro);
      return false;
    }
    notify('No phone number', `${opts.customerName} has no phone number saved. Add it in the customer's profile first.`);
    return false;
  }
  if (sending) return false;
  const stopNote = opts.optedOut
    ? '\n\nThis customer sent STOP: they get no automatic messages. This one goes only because you send it.'
    : '';
  const question = `Send ${opts.what} to ${opts.customerName} (${phone}) on WhatsApp?${stopNote}`;
  const ok = await confirmAsync(opts.title ?? 'Send on WhatsApp', opts.intro ? `${opts.intro}\n\n${question}` : question, 'Send');
  if (!ok) return false;
  sending = true;
  try {
    const { data } = await opts.send();
    notify('Sent', `Sent to ${data.sentTo} via WhatsApp.`);
    return true;
  } catch (e: any) {
    notify('Send failed', e?.response?.data?.error ?? 'Could not send the WhatsApp message.');
    return false;
  } finally {
    sending = false;
  }
}
