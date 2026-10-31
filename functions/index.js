// API only, no web UI (owner directive). The root returns a
// short plain-text summary of the contract.
export async function onRequest() {
  const text = [
    "vibeqr - VietQR-compatible QR image API with ZaloPay native support",
    "",
    "GET /image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.svg?amount=<vnd>&addInfo=<code>&accountName=<name>",
    "",
    "Templates: qr_only, compact, compact2 (replicating the VietQR templates).",
    "Formats: svg (png planned). Every code encodes a hybrid payload:",
    "the ZaloPay native wallet block plus the VietQR bank block,",
    "so ZaloPay users pay natively and bank apps pay as a transfer.",
    "Single-account service: path bank/account segments are accepted",
    "for VietQR compatibility and ignored; all codes pay the owner.",
    "",
    "Docs: https://github.com/Sakayorii/vibeqr",
    "",
  ].join("\n");
  return new Response(text, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
