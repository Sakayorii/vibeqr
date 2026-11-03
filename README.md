# vibeqr

**A VietQR-compatible QR image API with ZaloPay native support.**

vibeqr serves QR code images from URLs, exactly like the VietQR
Quick Link (`img.vietqr.io/image/...`): same URL shape, same
parameters, same templates, same artwork, plus two templates in
the payOS checkout style (`vietqr_pro` and `payos`). The one
thing it does differently is the payload inside the code.

A code from img.vietqr.io carries only the bank block, so a
ZaloPay user who scans it is pushed through a bank-transfer flow
(and some variants are rejected outright). A vibeqr code is a
**hybrid**: it carries both the ZaloPay native wallet block
(EMVCo tag 26) and the standard VietQR bank block (tag 38) in a
single payload.

- ZaloPay scans it -> native wallet-to-wallet payment, with the
  amount and the transfer note prefilled.
- Any bank app or other wallet scans it -> a normal VietQR bank
  transfer into the same wallet, amount and note prefilled.

Live endpoint: `https://qr.sakayori.me`

> Single-account service. vibeqr serves exactly one receiving
> account (the owner's ZaloPay wallet, backed by its BVBank
> virtual account `99ZP26301M80823757`). The bank and account
> segments in the URL exist for VietQR compatibility only and
> are ignored; every code pays the owner. Do not integrate this
> deployment expecting to configure your own account.

## URL contract

```
GET /image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.<FORMAT>?amount=<vnd>&addInfo=<code>&accountName=<name>
```

Example:

```
https://qr.sakayori.me/image/970454-99ZP26301M80823757-compact.svg?amount=10000&addInfo=SK1000
```

### Path segments

| Segment      | Values                                   | Notes |
|--------------|------------------------------------------|-------|
| `BANK_ID`    | anything                                 | Accepted for compatibility, ignored. |
| `ACCOUNT_NO` | anything                                 | Accepted for compatibility, ignored. |
| `TEMPLATE`   | `qr_only`, `compact`, `compact2`, `vietqr_pro`, `payos` | Artwork replicates the VietQR templates, plus the payOS checkout decor (below). |
| `FORMAT`     | `svg`, `png`                             | See Formats. `.jpg` is never served. |

### Query parameters

| Parameter     | Required | Rules | Meaning |
|---------------|----------|-------|---------|
| `amount`      | no       | integer VND, 1-13 digits, > 0 | Baked into the QR (tag 54) and printed by the `compact2` template. Omit it and the code carries no amount. |
| `addInfo`     | no       | 1-50 printable ASCII characters | The transfer content / order code, baked into the QR (tag 62, subtag 08). This is the value payments are matched by. |
| `accountName` | no       | any | Accepted for VietQR compatibility and ignored. It is display-only data in VietQR and never enters any payload; the printed holder name here is fixed (see Templates). |

### Responses and errors

- `200` with `image/svg+xml` or `image/png`. Every response
  carries `Cache-Control: public, max-age=31536000, immutable`:
  a URL fully determines its image.
- `400` JSON `{"error": "..."}` for an invalid `amount` or
  `addInfo`.
- `404` JSON for a path that does not match the contract.
- `501` JSON if PNG rendering is unavailable on the deployment
  (the SVG route is unaffected and carries the same payload).

### Root route

`GET /` returns a short plain-text summary of this contract.
There is no web UI (API only, by design).

## Templates

The artwork is the VietQR Quick Link artwork itself: the same
frame images, QR placement, center logo, and printed-line
layout, extracted from live vietqr.io responses
(`tools/extract_templates.py` regenerates the data). Only the
QR matrix differs, because it encodes the hybrid payload.

| Template   | Canvas    | Printed information |
|------------|-----------|---------------------|
| `qr_only`  | 490 x 490 | none |
| `compact`  | 540 x 540 | none |
| `compact2` | 540 x 640 | holder name, account number, amount (when given) |
| `vietqr_pro` | 540 x 640 | account number, amount (when given) |
| `payos`    | 540 x 646-708 | bank, holder name, account number, amount and transfer content (when given) |

`vietqr_pro` is the frame payOS serves inside its checkout page
(pay.payos.vn embeds the QR as a vietqr_pro Quick Link image), so
its frame is extracted from vietqr.io for the owner account the
same way as the other VietQR frames, BVBank logo included.

`payos` replicates the payOS checkout card itself: the official
payOS logo (extracted from pay.payos.vn) on top, the QR under it
with the same VietQR center logo, then the detail rows the
checkout page lists (bank, holder, account, amount, transfer
content). The card is drawn as native SVG, so its height grows
with the number of rows printed. payOS has no Quick Link style
template set of its own; its own QR generator offers the VietQR
templates above.

One deliberate exception, owner choice: `compact2` prints the
holder name as **Lê Huy Khánh** (normal Vietnamese spelling with
diacritics) instead of the normalised registered bank name the
stock template renders. Note that whatever any image prints,
payer apps resolve the registered account name
(`ZALOPAY_LE HUY KHANH`) from the banking system on their own
confirmation screens.

Error correction level is Q, so the center logo overlay never
puts scannability at risk.

## Formats

- **`.svg` (primary)** - a self-contained SVG document (frame
  artwork embedded as data URIs), vector-crisp at any size and
  the smallest response. This is the format web pages should
  embed; browsers render it natively. It mirrors what VietQR
  Quick Link itself serves today.
- **`.png` (raster twin)** - the same artwork rasterised at
  1080 px on the long edge (resvg/WASM), for clients that
  cannot embed SVG. The encoded payload is identical.
- **`.jpg` (never)** - lossy compression blurs QR modules and
  degrades scanning, for no benefit over SVG or PNG.

## Payload design

Payloads are EMVCo strings assembled per request
(`functions/_lib/payload.js`):

| Tag | Content |
|-----|---------|
| 00  | `01` (payload format indicator) |
| 01  | `12` (dynamic QR) |
| 26  | ZaloPay native wallet block, constant, copied verbatim from the owner's own ZaloPay receive QR |
| 38  | VietQR bank block: NAPAS GUID, BVBank BIN `970454`, account `99ZP26301M80823757`, service `QRIBFTTA` |
| 52  | `7399` (merchant category code, same as the native QR) |
| 53  | `704` (VND) |
| 54  | the `amount` parameter, when given |
| 58  | `VN` |
| 62  | subtag 08 = the `addInfo` parameter, when given |
| 63  | CRC16-CCITT (poly 0x1021, init 0xFFFF) over the whole payload |

Only tags 54 and 62 vary. Generation is pure local computation
(string assembly plus a matrix render), a few milliseconds at
most, with no external call, no API key, and no rate limit.

### Verified behaviour (2026-11-01, owner tests)

- ZaloPay app + hybrid code: amount and note prefilled, routed
  natively (the app recognised the recipient wallet and refused
  a self-transfer, which only the tag 26 block can trigger).
- ZaloPay app + plain dynamic VietQR into the BVBank account:
  works as a bank transfer, prefilled.
- ZaloPay app + the `971101` "ZaloPay as bank" VietQR variant:
  rejected ("bank not supported"). vibeqr never generates it.
- MoMo + hybrid code: parsed as a BVBank transfer, fully
  prefilled; completion depends on MoMo's BVBank channel.

## Architecture

Cloudflare Pages, API only:

```
functions/
  index.js               plain-text contract summary at /
  image/[file].js        the image route: parse, validate, respond
  _lib/
    payload.js           EMVCo hybrid payload builder
    render.js            payload + template -> SVG string
    templates.js         extracted VietQR template artwork/geometry
    qrcode.js            vendored QR encoder (MIT, Kazuhiko Arase)
    png.js               SVG -> PNG via resvg/WASM
    fonts.js             subset DejaVu Sans (Latin + Vietnamese), base64
scripts/build-dist.mjs   assembles dist/ (functions + @resvg)
tools/extract_templates.py
wrangler.toml
```

Static Pages requests are unmetered; the image route runs as a
Pages Function. `scripts/build-dist.mjs` copies `functions/`
and the single runtime dependency (`@resvg/resvg-wasm`) into
`dist/` so deployments never upload the rest of the repo.

## Develop and deploy

```sh
npm install
npx wrangler pages dev        # local workerd run
npm run deploy                # build dist/ + wrangler pages deploy
```

Deployment targets the Cloudflare Pages project `vibeqr`,
custom domain `qr.sakayori.me`.

## Credits

- QR encoder: `qrcode-generator` by Kazuhiko Arase (MIT).
- SVG rasterisation: `@resvg/resvg-wasm` (MPL-2.0).
- Fonts: DejaVu Sans subsets (DejaVu license), used only so the
  PNG route can print Vietnamese text.
- Template artwork: VietQR Quick Link templates (NAPAS/VietQR
  branding belongs to their owners); vibeqr exists to generate
  payloads those templates cannot, for the owner's own account.
- payOS template artwork: the payOS logo from pay.payos.vn
  (payOS/Casso branding belongs to its owner).
