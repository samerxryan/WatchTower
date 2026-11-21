"""Small SVG toolkit used to build the WatchTower report diagrams.

The diagrams are authored as SVG so that every label, arrow and cardinality is
positioned deterministically. Chrome headless is then used to rasterise them at
2x for the DOCX/PDF deliverables.
"""
from __future__ import annotations

from html import escape
from pathlib import Path

FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
MONO = "'Cascadia Mono', Consolas, monospace"

NAVY = "#0F172A"
INDIGO = "#4F46E5"
INDIGO_LIGHT = "#6366F1"
CYAN = "#0284C7"
CYAN_LIGHT = "#E0F2FE"
SLATE = "#475569"
MUTED = "#64748B"
BORDER = "#CBD5E1"
GRID = "#E2E8F0"
WHITE = "#FFFFFF"
BG = "#F8FAFC"
RED = "#DC2626"
GREEN = "#15803D"
AMBER = "#B45309"
VIOLET = "#7C3AED"


class SVG:
    def __init__(self, width: int, height: int, background: str = WHITE):
        self.width = width
        self.height = height
        self.parts: list[str] = []
        self.defs: list[str] = []
        self._markers()

    # ------------------------------------------------------------------ defs
    def _markers(self) -> None:
        def marker(name: str, color: str, kind: str = "filled") -> str:
            if kind == "filled":
                body = f'<path d="M0,0 L10,4 L0,8 z" fill="{color}"/>'
            elif kind == "open":
                body = (
                    f'<path d="M0,0 L10,4 L0,8" fill="none" stroke="{color}" '
                    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
                )
            elif kind == "hollow":
                body = f'<path d="M0,0 L10,4 L0,8 z" fill="{WHITE}" stroke="{color}" stroke-width="1.4"/>'
            else:  # diamond
                body = f'<path d="M0,4 L5,0 L10,4 L5,8 z" fill="{color}"/>'
            return (
                f'<marker id="{name}" viewBox="0 0 10 8" refX="9" refY="4" '
                'markerWidth="10" markerHeight="8" orient="auto-start-reverse">'
                f"{body}</marker>"
            )

        self.defs.extend(
            [
                marker("arrow", NAVY),
                marker("arrow-indigo", INDIGO),
                marker("arrow-red", RED),
                marker("arrow-green", GREEN),
                marker("arrow-muted", MUTED),
                marker("open", SLATE, "open"),
                marker("open-indigo", INDIGO, "open"),
                marker("open-red", RED, "open"),
                marker("hollow", INDIGO, "hollow"),
                marker("diamond", NAVY, "diamond"),
                marker("diamond-white", WHITE, "hollow"),
            ]
        )

    # --------------------------------------------------------------- helpers
    def add(self, markup: str) -> None:
        self.parts.append(markup)

    def rect(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        fill: str = WHITE,
        stroke: str = BORDER,
        sw: float = 1.2,
        rx: float = 0,
        dash: str | None = None,
        opacity: float | None = None,
    ) -> None:
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        if opacity is not None:
            extra += f' opacity="{opacity}"'
        self.add(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{extra}/>'
        )

    def line(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        stroke: str = SLATE,
        sw: float = 1.3,
        dash: str | None = None,
        marker_end: str | None = None,
        marker_start: str | None = None,
    ) -> None:
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        if marker_end:
            extra += f' marker-end="url(#{marker_end})"'
        if marker_start:
            extra += f' marker-start="url(#{marker_start})"'
        self.add(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" '
            f'stroke-width="{sw}" stroke-linecap="round"{extra}/>'
        )

    def path(
        self,
        d: str,
        stroke: str = SLATE,
        sw: float = 1.3,
        fill: str = "none",
        dash: str | None = None,
        marker_end: str | None = None,
        marker_start: str | None = None,
    ) -> None:
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        if marker_end:
            extra += f' marker-end="url(#{marker_end})"'
        if marker_start:
            extra += f' marker-start="url(#{marker_start})"'
        self.add(
            f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round"{extra}/>'
        )

    def text(
        self,
        x: float,
        y: float,
        value: str,
        size: float = 13,
        fill: str = NAVY,
        weight: str = "normal",
        anchor: str = "start",
        family: str = FONT,
        italic: bool = False,
        opacity: float | None = None,
        letter_spacing: float | None = None,
    ) -> None:
        extra = ""
        if italic:
            extra += ' font-style="italic"'
        if opacity is not None:
            extra += f' opacity="{opacity}"'
        if letter_spacing is not None:
            extra += f' letter-spacing="{letter_spacing}"'
        self.add(
            f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{extra}>'
            f"{escape(value)}</text>"
        )

    def lines(
        self,
        x: float,
        y: float,
        values: list[str],
        size: float = 13,
        leading: float | None = None,
        fill: str = NAVY,
        weight: str = "normal",
        anchor: str = "start",
        italic: bool = False,
    ) -> None:
        lead = leading if leading is not None else size * 1.25
        for index, value in enumerate(values):
            self.text(
                x,
                y + index * lead,
                value,
                size=size,
                fill=fill,
                weight=weight,
                anchor=anchor,
                italic=italic,
            )

    def circle(self, cx: float, cy: float, r: float, fill: str = WHITE,
               stroke: str = BORDER, sw: float = 1.2) -> None:
        self.add(
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"/>'
        )

    def ellipse(self, cx: float, cy: float, rx: float, ry: float,
                fill: str = WHITE, stroke: str = INDIGO, sw: float = 1.4,
                dash: str | None = None) -> None:
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"{extra}/>'
        )

    def badge(self, x: float, y: float, w: float, h: float, label: str,
              fill: str = INDIGO, color: str = WHITE, size: float = 11.5,
              rx: float = 8) -> None:
        self.rect(x, y, w, h, fill=fill, stroke="none", rx=rx)
        self.text(x + w / 2, y + h / 2 + size * 0.35, label, size=size,
                  fill=color, weight="600", anchor="middle")

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        defs = "\n".join(self.defs)
        body = "\n".join(self.parts)
        doc = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" '
            f'height="{self.height}" viewBox="0 0 {self.width} {self.height}">\n'
            f"<defs>\n{defs}\n</defs>\n"
            f'<rect width="{self.width}" height="{self.height}" fill="{WHITE}"/>\n'
            f"{body}\n</svg>\n"
        )
        path.write_text(doc, encoding="utf-8")


def boxed_title(svg: SVG, x: float, y: float, w: float, title: str,
                subtitle: str | None = None, fill: str = NAVY) -> None:
    svg.rect(x, y, w, 52, fill=fill, stroke="none", rx=10)
    svg.text(x + 18, y + 24, title, size=17, fill=WHITE, weight="700")
    if subtitle:
        svg.text(x + 18, y + 42, subtitle, size=11.5, fill="#CBD5E1")


def arrow_label(svg: SVG, x: float, y: float, label: str,
                size: float = 11.5, fill: str = SLATE,
                anchor: str = "middle", bg: str | None = WHITE) -> None:
    if bg:
        approx = max(28, len(label) * size * 0.56)
        if anchor == "middle":
            svg.rect(x - approx / 2 - 3, y - size - 1, approx + 6, size + 6,
                     fill=bg, stroke="none", rx=3)
        elif anchor == "start":
            svg.rect(x - 2, y - size - 1, approx + 6, size + 6, fill=bg,
                     stroke="none", rx=3)
        else:
            svg.rect(x - approx - 3, y - size - 1, approx + 6, size + 6,
                     fill=bg, stroke="none", rx=3)
    svg.text(x, y, label, size=size, fill=fill, anchor=anchor)
