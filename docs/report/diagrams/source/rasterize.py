"""Rasterise every SVG diagram to a 2x PNG using Chrome headless."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "export"


def rasterize(svg_path: Path) -> None:
    head = svg_path.read_text(encoding="utf-8")[:600]
    width = int(re.search(r'width="(\d+)"', head).group(1))
    height = int(re.search(r'height="(\d+)"', head).group(1))
    png_path = svg_path.with_suffix(".png")
    command = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=2",
        "--default-background-color=FFFFFFFF",
        "--virtual-time-budget=1500",
        f"--window-size={width},{height}",
        f"--screenshot={png_path}",
        svg_path.as_uri(),
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=120)
    if not png_path.exists():
        raise RuntimeError(
            f"Chrome failed for {svg_path.name}: {result.stderr[-800:]}"
        )
    print(f"{png_path.name}: {width * 2}x{height * 2}")


if __name__ == "__main__":
    names = sys.argv[1:]
    targets = [
        path for path in sorted(EXPORT.glob("*.svg"))
        if not names or any(name in path.name for name in names)
    ]
    if not targets:
        raise SystemExit("No SVG found in export/")
    for path in targets:
        rasterize(path)
