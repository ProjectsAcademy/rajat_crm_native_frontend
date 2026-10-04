import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Print / share / preview a standalone HTML document. Same approach as the
// invoice screen (app/(app)/invoices/[id].tsx — see its handlePrint comment
// for the reasoning): on web, expo-print ignores the html argument and would
// print the live app, so the document is opened as its own blob: tab, which
// also keeps its <title> as the Save-as-PDF filename. On native the HTML is
// rendered to a PDF file and handed to the share sheet (WhatsApp, Files, ...).

function openBlobTab(html: string): { w: Window; revoke: () => void } {
  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(blobUrl, '_blank');
  if (!w) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Pop-up blocked — allow pop-ups for this site to open the statement.');
  }
  return { w, revoke: () => URL.revokeObjectURL(blobUrl) };
}

export async function printOrShareHtml(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    const { w, revoke } = openBlobTab(html);
    w.onafterprint = revoke;
    setTimeout(() => {
      w.focus();
      w.print();
      setTimeout(revoke, 5000); // onafterprint isn't reliable everywhere (Safari)
    }, 300);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle });
  } else {
    await Print.printAsync({ html });
  }
}

export async function previewHtml(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const { w, revoke } = openBlobTab(html);
    w.onunload = revoke;
    return;
  }
  await Print.printAsync({ html }); // OS print preview: zoomable, with Save/Share inside
}
