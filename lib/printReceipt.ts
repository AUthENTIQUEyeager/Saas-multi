import { formatMontant } from './utils';

export interface ReceiptData {
  shopName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  customerName?: string | null;
  date: Date;
}

/**
 * Ouvre une fenêtre d'impression avec un reçu simple, formaté pour une
 * imprimante thermique de caisse (largeur étroite). Indépendant du CSS de
 * l'application - fonctionne même sans connexion internet.
 */
export function printReceipt(data: ReceiptData) {
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;

  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:2px 0;">${item.name}</td>
        <td style="padding:2px 0; text-align:center;">${item.quantity}</td>
        <td style="padding:2px 0; text-align:right;">${formatMontant(item.unitPrice * item.quantity)}</td>
      </tr>`
    )
    .join('');

  win.document.write(`
    <html>
      <head>
        <title>Reçu</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 16px 8px; font-size: 13px; color: #111; }
          h1 { font-size: 15px; text-align: center; margin: 0 0 4px; }
          .meta { text-align: center; font-size: 11px; color: #444; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; }
          thead td { border-bottom: 1px dashed #999; font-weight: bold; padding-bottom: 4px; }
          tfoot td { border-top: 1px dashed #999; padding-top: 6px; font-weight: bold; }
          .center { text-align: center; }
          .footer { margin-top: 16px; text-align: center; font-size: 11px; color: #444; }
        </style>
      </head>
      <body onload="window.print(); window.onafterprint = () => window.close();">
        <h1>${data.shopName}</h1>
        <p class="meta">
          ${data.date.toLocaleDateString('fr-FR')} à ${data.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          ${data.customerName ? `<br/>Client : ${data.customerName}` : ''}
        </p>
        <table>
          <thead>
            <tr><td>Article</td><td class="center">Qté</td><td style="text-align:right;">Total</td></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="2">TOTAL</td><td style="text-align:right;">${formatMontant(data.total)}</td></tr>
          </tfoot>
        </table>
        <p class="footer">Merci pour votre achat !</p>
      </body>
    </html>
  `);
  win.document.close();
}
