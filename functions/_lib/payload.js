// EMVCo payload builder for vibeqr.
//
// Every payload is a HYBRID: it carries two merchant blocks.
//   tag 26: the ZaloPay native wallet block, so the ZaloPay app
//           routes the payment natively, wallet to wallet.
//   tag 38: the standard VietQR bank block (NAPAS), so every bank
//           app and other wallets pay it as a normal transfer.
// Both blocks point at the same wallet: the owner's ZaloPay
// account, backed by its BVBank virtual account. The two segment
// constants below are copied verbatim (tag + length + value) from
// the owner's own ZaloPay multi-purpose receive QR.
//
// Only two things vary per request: the amount (tag 54) and the
// order code (tag 62, subtag 08).

const NATIVE_SEGMENT =
  "26400010vn.zalopay0115RoXfHcQI4sXJJA60203002";
const BANK_SEGMENT =
  "38620010A00000072701320006970454011899ZP26301M808237570208QRIBFTTA";

function tlv(tag, value) {
  return tag + String(value.length).padStart(2, "0") + value;
}

// CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF), the
// EMVCo checksum in tag 63.
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc =
        crc & 0x8000
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// amount: integer VND as a string, or null to omit tag 54.
// addInfo: order code string, or null to omit tag 62.
export function buildPayload({ amount = null, addInfo = null } = {}) {
  let p = tlv("00", "01"); // payload format indicator
  p += tlv("01", "12"); // dynamic QR
  p += NATIVE_SEGMENT;
  p += BANK_SEGMENT;
  p += tlv("52", "7399"); // merchant category code
  p += tlv("53", "704"); // currency: VND
  if (amount !== null) p += tlv("54", String(amount));
  p += tlv("58", "VN"); // country
  if (addInfo !== null) p += tlv("62", tlv("08", addInfo));
  p += "6304";
  return p + crc16(p);
}
