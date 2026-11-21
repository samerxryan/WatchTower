"""Prépare les ressources graphiques de la présentation WatchTower.

- copie le logo officiel du projet sans le modifier ;
- récupère les pictogrammes officiels Simple Icons des technologies vérifiées ;
- les rasterise en PNG haute résolution avec Chrome headless.
"""
from __future__ import annotations

import html
import subprocess
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "Assets"
SRC = OUT / "logos_src"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
BASE = "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/"

LOGOS = {
    "react": ("react.svg", "#149eca"),
    "javascript": ("javascript.svg", "#eab308"),
    "tailwindcss": ("tailwindcss.svg", "#0891b2"),
    "nodejs": ("nodejs.svg", "#2f9e44"),
    "express": ("express.svg", "#1f2937"),
    "mysql": ("mysql.svg", "#00758f"),
    "jsonwebtokens": ("jsonwebtokens.svg", "#3b4fba"),
    "git": ("git.svg", "#e8590c"),
    "github": ("github.svg", "#111827"),
    "vite": ("vite.svg", "#6d5efc"),
    "postman": ("postman.svg", "#e9652d"),
}


def fetch_svg(name: str, filename: str) -> str:
    url = BASE + filename
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    svg = response.text.strip()
    SRC.mkdir(parents=True, exist_ok=True)
    (SRC / f"{name}.svg").write_text(svg, encoding="utf-8")
    return svg


def rasterize(name: str, svg: str, color: str) -> None:
    svg = svg.replace("<svg ", f'<svg style="fill:{color};" ', 1)
    document = f"""<!doctype html><html><head><meta charset="utf-8">
<style>
html,body{{margin:0;padding:0;width:256px;height:256px;background:#fff;}}
body{{display:flex;align-items:center;justify-content:center;}}
svg{{width:190px;height:190px;}}
</style></head><body>{svg}</body></html>"""
    page = SRC / f"_{name}.html"
    page.write_text(document, encoding="utf-8")
    png = OUT / f"logo_{name}.png"
    cmd = [
        str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=1", f"--screenshot={png}",
        "--window-size=256,256", page.as_uri(),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)

    original = ROOT / "Assets" / "Logo.svg"
    (OUT / "WatchTower_Logo.svg").write_bytes(original.read_bytes())
    report_logo = ROOT / "docs" / "report" / "assets" / "WatchTower_Logo.png"
    (OUT / "WatchTower_Logo.png").write_bytes(report_logo.read_bytes())

    for name, (filename, color) in LOGOS.items():
        try:
            svg = fetch_svg(name, filename)
            rasterize(name, svg, color)
            print("ok", name)
        except Exception as exc:
            print("skip", name, exc)


if __name__ == "__main__":
    main()
