#!/usr/bin/env python3
"""Regenerate functions/_lib/templates.js from live vietqr.io SVGs.

Downloads the three Quick Link templates for the owner account,
extracts the frame artwork (base64 PNG), the QR placement
geometry, and the shared center logo, then rewrites templates.js.
The QR matrix and the printed texts are NOT taken from these
files; vibeqr generates both itself (see functions/_lib).

Usage: python3 tools/extract_templates.py
"""
import base64
import json
import re
import urllib.request

ACCOUNT = "970454-99ZP26301M80823757"
BASE = "https://img.vietqr.io/image/" + ACCOUNT + "-{}.svg?amount=10000&addInfo=SK1111"


def fetch(template):
    with urllib.request.urlopen(BASE.format(template)) as r:
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
    data = {t: extract(fetch(t)) for t in ("qr_only", "compact", "compact2")}
    logo = re.search(
        r'<image id="vietqr-logo"[^>]*href="data:image/jpeg;base64,([^"]+)"',
        fetch("compact2"),
    ).group(1)
    data["logoJpegB64"] = logo
    js = (
        "// Template artwork extracted from the vietqr.io Quick Link templates\n"
        "// (frames, geometry, center logo). Regenerate with tools/extract_templates.py.\n"
        "export const TEMPLATES = " + json.dumps(data, indent=1) + ";\n"
    )
    with open("functions/_lib/templates.js", "w") as f:
        f.write(js)
    print("templates.js regenerated")


if __name__ == "__main__":
    main()
