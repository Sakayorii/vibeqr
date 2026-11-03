// SVG renderer: hybrid payload in, template artwork out.
//
// Every template replicates its vietqr.io Quick Link source
// render exactly (frame image, QR placement, center logo,
// printed lines extracted by tools/extract_templates.py); only
// the QR matrix differs, because it encodes the hybrid payload
// built by payload.js. One deliberate exception, owner choice:
// compact2 prints the holder name in normal Vietnamese spelling
// with diacritics instead of the normalised bank name.
//
// vietqr_pro is the frame payOS serves inside its checkout page
// (pay.payos.vn embeds the QR as a vietqr_pro Quick Link image);
// it prints the account number and amount, no holder name.
// payos is the VietQR template of that name, the one payOS uses
// for its QR images: QR only inside a thin border, VietQR and
// wallet icons below, no printed text at all. Its amount and
// transfer content (addInfo) are supported exactly like every
// other template, inside the payload, just never printed.

import qrcode from "./qrcode.js";
import { TEMPLATES } from "./templates.js";

export const HOLDER_NAME = "Lê Huy Khánh";
export const ACCOUNT_NUMBER = "99ZP26301M80823757";

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 10000 -> "10.000" (Vietnamese thousands separator)
export function formatAmount(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function matrixRuns(payload) {
  const qr = qrcode(0, "Q");
  qr.addData(payload, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const runs = [];
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (qr.isDark(y, x)) {
        const x0 = x;
        while (x < n && qr.isDark(y, x)) x++;
        runs.push(`M${x0} ${y}h${x - x0}v1h-${x - x0}z`);
      } else {
        x++;
      }
    }
  }
  return { n, path: runs.join("") };
}

// template: "qr_only" | "compact" | "compact2" | "vietqr_pro" | "payos"
// amount: integer VND string or null (printed by compact2 and
// vietqr_pro only); addInfo is never printed, it only ever
// lives in the payload (see payload.js)
export function renderSvg(template, payload, { amount = null } = {}) {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`unknown template: ${template}`);
  const { n, path } = matrixRuns(payload);
  const scale = (t.qrBox / n).toFixed(6);
  const logoSize = 0.16 * n;
  const logoOff = ((n - logoSize) / 2).toFixed(2);

  let texts = "";
  if (template === "compact2") {
    texts +=
      `<text x="270" y="562" text-anchor="middle" font-family="Arial" font-size="16" fill="#4a4a4a" font-weight="bold">${escapeXml(HOLDER_NAME)}</text>` +
      `<text x="270" y="586" text-anchor="middle" font-family="Arial" font-size="16" fill="#4a4a4a">${ACCOUNT_NUMBER}</text>`;
    if (amount !== null) {
      texts += `<text x="270" y="610" text-anchor="middle" font-family="Arial" font-size="16" fill="#262626">Số tiền: ${formatAmount(amount)} VND</text>`;
    }
  }
  if (template === "vietqr_pro") {
    texts += `<text x="270" y="586" text-anchor="middle" font-family="Arial" font-size="16" fill="#4a4a4a">${ACCOUNT_NUMBER}</text>`;
    if (amount !== null) {
      texts += `<text x="270" y="610" text-anchor="middle" font-family="Arial" font-size="16" fill="#262626">Số tiền: ${formatAmount(amount)} VND</text>`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}" role="img">` +
    `<title>vibeqr ${template} ${ACCOUNT_NUMBER}</title>` +
    `<rect width="${t.width}" height="${t.height}" fill="#ffffff"/>` +
    `<image x="0" y="0" width="${t.width}" height="${t.height}" href="data:image/png;base64,${t.framePngB64}"/>` +
    `<g transform="translate(${t.qrX} ${t.qrY}) scale(${scale})">` +
    `<rect width="${n}" height="${n}" fill="#ffffff"/>` +
    `<path fill="#111111" d="${path}"/>` +
    `<rect x="${logoOff}" y="${logoOff}" width="${logoSize}" height="${logoSize}" fill="#ffffff"/>` +
    `<image x="${logoOff}" y="${logoOff}" width="${logoSize}" height="${logoSize}" href="data:image/jpeg;base64,${TEMPLATES.logoJpegB64}"/>` +
    `</g>${texts}</svg>`
  );
}
