#!/usr/bin/env python3
"""Regenerate functions/_lib/templates.js from live vietqr.io SVGs.

Downloads the Quick Link templates for the owner account,
extracts the frame artwork (base64 PNG), the QR placement
geometry, and the shared center logo, then rewrites templates.js.
The QR matrix and the printed texts are NOT taken from these
files; vibeqr generates both itself (see functions/_lib).

Also stored here:
- vietqr_pro: the frame payOS puts inside its checkout page
  (pay.payos.vn serves the QR as a vietqr_pro Quick Link image).
- payos: geometry only. The payOS checkout card decor is drawn
  as native SVG in render.js; only the official payOS logo
  (pay.payos.vn/images/logo.svg) is extracted, as base64.

Usage: python3 tools/extract_templates.py
"""
import base64
import json
import re
import urllib.request

ACCOUNT = "970454-99ZP26301M80823757"
BASE = "https://img.vietqr.io/image/" + ACCOUNT + "-{}.svg?amount=10000&addInfo=SK1111"
PAYOS_LOGO = "https://pay.payos.vn/images/logo.svg"

# payOS checkout card geometry (see render.js renderPayos).
PAYOS = {"width": 540, "height": 708, "qrX": 91.5, "qrY": 132, "qrBox": 357}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r:
        return r.read().decode("utf-8")


def extract(svg):
    frame = re.search(
        r'<image x="0" y="0" width="\d+" height="\d+" href="data:image/png;base64,([^"]+)"',
        svg,
    ).group(1)
    w, h = re.search(r'width="(\d+)" height="(\d+)"', svg).groups()
    gx, gy, gs, mods = re.search(
        r'<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)"><rect width="(\d+)"',
        svg,
    ).groups()
    return {
        "width": int(w),
        "height": int(h),
        "framePngB64": frame,
        "qrX": float(gx),
        "qrY": float(gy),
        "qrBox": round(float(gs) * int(mods), 2),
    }


def main():
    data = {
        t: extract(fetch(BASE.format(t)))
        for t in ("qr_only", "compact", "compact2", "vietqr_pro")
    }
    data["payos"] = PAYOS
    logo = re.search(
        r'<image id="vietqr-logo"[^>]*href="data:image/jpeg;base64,([^"]+)"',
        fetch(BASE.format("compact2")),
    ).group(1)
    data["logoJpegB64"] = logo
    data["payosLogoSvgB64"] = base64.b64encode(
        fetch(PAYOS_LOGO).encode("utf-8")
    ).decode("ascii")
    js = (
        "// Template artwork extracted from the vietqr.io Quick Link templates\n"
        "// (frames, geometry, center logo) plus the payOS checkout logo.\n"
        "// Regenerate with tools/extract_templates.py.\n"
        "export const TEMPLATES = " + json.dumps(data, indent=1) + ";\n"
    )
    with open("functions/_lib/templates.js", "w") as f:
        f.write(js)
    print("templates.js regenerated")


if __name__ == "__main__":
    main()
