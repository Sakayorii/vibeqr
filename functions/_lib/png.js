// SVG -> PNG rasteriser (resvg compiled to WASM), used only by
// the .png route. The SVG stays the source of truth; this renders
// the identical artwork at 1080 px on the long edge. Fonts are
// subset DejaVu Sans builds (Latin + Vietnamese) bundled as data
// modules; the SVG asks for Arial and falls back to them.

import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { FONT_REGULAR_B64, FONT_BOLD_B64 } from "./fonts.js";

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
const fontRegular = b64ToBytes(FONT_REGULAR_B64);
const fontBold = b64ToBytes(FONT_BOLD_B64);

let initPromise = null;

export async function svgToPng(svg, width, height) {
  if (!initPromise) initPromise = initWasm(resvgWasm);
  await initPromise;
  const fitTo =
    height >= width
      ? { mode: "height", value: 1080 }
      : { mode: "width", value: 1080 };
  const resvg = new Resvg(svg, {
    fitTo,
    font: {
      fontBuffers: [fontRegular, fontBold],
      loadSystemFonts: false,
      defaultFontFamily: "DejaVu Sans",
      sansSerifFamily: "DejaVu Sans",
    },
  });
  return resvg.render().asPng();
}
