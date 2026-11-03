// SVG renderer: hybrid payload in, template artwork out.
//
// The VietQR templates replicate the vietqr.io Quick Link artwork
// (frame image, QR placement, center logo, printed lines) exactly;
// only the QR matrix differs, because it encodes the hybrid
// payload built by payload.js. One deliberate exception, owner
// choice: compact2 prints the holder name in normal Vietnamese
// spelling with diacritics instead of the normalised bank name.
//
// vietqr_pro is the frame payOS serves inside its checkout page
// (pay.payos.vn embeds the QR as a vietqr_pro Quick Link image);
// its frame and printed lines replicate that image for the owner
// account (account number and amount, no holder name).
//
// payos replicates the payOS checkout card itself (pay.payos.vn):
// the official payOS logo on top, the QR below it, then the same
// detail rows the checkout page lists (bank, holder, account,
// amount, transfer content). The card is drawn as native SVG;
// only the payOS logo artwork is extracted (templates.js).

import qrcode from "./qrcode.js";
import { TEMPLATES } from "./templates.js";

export const HOLDER_NAME = "Lê Huy Khánh";
export const ACCOUNT_NUMBER = "99ZP26301M80823757";
export const BANK_NAME = "BVBank - Ngân hàng Bản Việt";

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

// The QR group shared by every template: white backing, matrix,
// and the VietQR center logo overlay (ECC level Q keeps the code
// scannable under the overlay).
function qrGroup(t, n, path) {
  const scale = (t.qrBox / n).toFixed(6);
  const logoSize = 0.16 * n;
  const logoOff = ((n - logoSize) / 2).toFixed(2);
  return (
    `<g transform="translate(${t.qrX} ${t.qrY}) scale(${scale})">` +
    `<rect width="${n}" height="${n}" fill="#ffffff"/>` +
    `<path fill="#111111" d="${path}"/>` +
    `<rect x="${logoOff}" y="${logoOff}" width="${logoSize}" height="${logoSize}" fill="#ffffff"/>` +
    `<image x="${logoOff}" y="${logoOff}" width="${logoSize}" height="${logoSize}" href="data:image/jpeg;base64,${TEMPLATES.logoJpegB64}"/>` +
    `</g>`
  );
}

function renderPayos(t, n, path, { amount = null, addInfo = null } = {}) {
  const rows = [
    ["Ngân hàng", BANK_NAME],
    ["Chủ tài khoản", HOLDER_NAME],
    ["Số tài khoản", ACCOUNT_NUMBER],
  ];
  if (amount !== null) rows.push(["Số tiền", `${formatAmount(amount)} VND`]);
  if (addInfo !== null) rows.push(["Nội dung", addInfo]);

  const firstRowY = 548;
  const rowStep = 31;
  const height = firstRowY + rowStep * (rows.length - 1) + 36;

  let texts = "";
  rows.forEach(([label, value], i) => {
    const y = firstRowY + rowStep * i;
    texts +=
      `<text x="60" y="${y}" font-family="Arial" font-size="14" fill="#64748b">${escapeXml(label)}</text>` +
      `<text x="480" y="${y}" text-anchor="end" font-family="Arial" font-size="15" fill="#262626" font-weight="bold">${escapeXml(value)}</text>`;
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${height}" viewBox="0 0 ${t.width} ${height}" role="img">` +
    `<title>vibeqr payos ${ACCOUNT_NUMBER}</title>` +
    `<rect width="${t.width}" height="${height}" fill="#ffffff"/>` +
    `<rect x="0.5" y="0.5" width="${t.width - 1}" height="${height - 1}" fill="none" stroke="#e2e8f0"/>` +
    `<image x="195" y="22" width="150" height="62" href="data:image/svg+xml;base64,${TEMPLATES.payosLogoSvgB64}"/>` +
    `<text x="270" y="116" text-anchor="middle" font-family="Arial" font-size="15" fill="#64748b">Quét mã bằng app ngân hàng hoặc ví điện tử</text>` +
    `<rect x="83.5" y="124" width="373" height="373" fill="#ffffff" stroke="#e2e8f0"/>` +
    qrGroup(t, n, path) +
    `<line x1="60" y1="517" x2="480" y2="517" stroke="#e2e8f0"/>` +
    `${texts}</svg>`
  );
}

// template: "qr_only" | "compact" | "compact2" | "vietqr_pro" | "payos"
// amount: integer VND string or null (printed by compact2,
// vietqr_pro and payos); addInfo: order code or null (printed
// by payos only, as the Nội dung row, like the checkout page)
export function renderSvg(
  template,
  payload,
  { amount = null, addInfo = null } = {}
) {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`unknown template: ${template}`);
  const { n, path } = matrixRuns(payload);

  if (template === "payos") return renderPayos(t, n, path, { amount, addInfo });

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
    qrGroup(t, n, path) +
    `${texts}</svg>`
  );
}
