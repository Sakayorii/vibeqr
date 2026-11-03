// GET /image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.<svg|png>?amount=&addInfo=&accountName=
//
// VietQR Quick Link compatible route. The BANK_ID and ACCOUNT_NO
// segments are accepted for compatibility but are NOT trusted
// input: vibeqr is a single-account service, so every response
// carries the owner's hybrid payload (see _lib/payload.js).

import { buildPayload } from "../_lib/payload.js";
import { renderSvg } from "../_lib/render.js";
import { TEMPLATES } from "../_lib/templates.js";
import { svgToPng } from "../_lib/png.js";

const FILE_RE = /^.+-(payos|vietqr_pro|qr_only|compact2|compact)\.(svg|png)$/;
const AMOUNT_RE = /^\d{1,13}$/;
const ADDINFO_RE = /^[\x20-\x7E]{1,50}$/;

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequest(context) {
  const { params, request } = context;
  const url = new URL(request.url);

  const m = FILE_RE.exec(params.file || "");
  if (!m) {
    return jsonError(
      404,
      "expected /image/<BANK_ID>-<ACCOUNT_NO>-<qr_only|compact|compact2|vietqr_pro|payos>.<svg|png>"
    );
  }
  const template = m[1];
  const format = m[2];

  let amount = url.searchParams.get("amount");
  if (amount !== null) {
    if (!AMOUNT_RE.test(amount) || Number(amount) <= 0) {
      return jsonError(400, "amount must be an integer VND amount, 1 to 13 digits");
    }
    amount = amount.replace(/^0+(?=\d)/, "");
  }

  let addInfo = url.searchParams.get("addInfo");
  if (addInfo !== null && !ADDINFO_RE.test(addInfo)) {
    return jsonError(400, "addInfo must be 1 to 50 printable ASCII characters");
  }

  // accountName is accepted for VietQR compatibility and ignored:
  // it is display-only data and never enters the payload. The
  // printed holder name is the owner's chosen display name.

  const payload = buildPayload({ amount, addInfo });
  const svg = renderSvg(template, payload, { amount });
  // A URL fully determines its image, so it is immutable.
  const cacheHeaders = { "cache-control": "public, max-age=31536000, immutable" };

  if (format === "png") {
    try {
      const t = TEMPLATES[template];
      const png = await svgToPng(svg, t.width, t.height);
      return new Response(png, {
        headers: { "content-type": "image/png", ...cacheHeaders },
      });
    } catch (e) {
      return jsonError(
        501,
        "png rendering is unavailable on this deployment; use .svg, which carries the identical payload"
      );
    }
  }

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      ...cacheHeaders,
    },
  });
}
