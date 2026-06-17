#!/usr/bin/env python3
"""Generate PNG icons for Perch (file icons, README, and extension marketplace logo)."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "image" / "icons"

# Match icon.svg / icon-dark.svg viewBox (1294 x 1519).
SVG_WIDTH = 1294
SVG_HEIGHT = 1519

ICON_PNG_HEIGHT = 256
MARKETPLACE_SIZE = 128
SUPERSAMPLE = 4
LOGO_RADIUS = 24


def run_rsvg_height(svg: Path, png: Path, height: int) -> None:
    subprocess.run(
        ["rsvg-convert", "-h", str(height), str(svg), "-o", str(png)],
        check=True,
    )


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def render_svg(svg: Path, target_height: int) -> Image.Image:
    """Rasterize SVG at the native portrait aspect ratio (no square letterboxing)."""
    work_height = target_height * SUPERSAMPLE
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        run_rsvg_height(svg, tmp_path, work_height)
        image = Image.open(tmp_path).convert("RGBA")
    finally:
        tmp_path.unlink(missing_ok=True)

    if SUPERSAMPLE > 1:
        target_width = round(target_height * SVG_WIDTH / SVG_HEIGHT)
        image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
    return image


def save_png(image: Image.Image, path: Path) -> None:
    image.save(path, format="PNG", compress_level=3)


def kinglet_source_path() -> Path:
    for candidate in (
        ROOT / "third_party/bootstrap/assets/kinglet.png",
        ICONS / "kinglet-source.png",
    ):
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "kinglet source PNG not found (expected third_party/bootstrap/assets/kinglet.png)"
    )


def generate_icon_png() -> None:
    save_png(render_svg(ICONS / "icon.svg", ICON_PNG_HEIGHT), ICONS / "icon.png")


def generate_icon_dark_png() -> None:
    save_png(render_svg(ICONS / "icon-dark.svg", ICON_PNG_HEIGHT), ICONS / "icon-dark.png")


def generate_kinglet_png() -> None:
    """Extension marketplace logo: kinglet bird on a rounded square."""
    image = Image.open(kinglet_source_path()).convert("RGBA")
    image = image.resize((MARKETPLACE_SIZE, MARKETPLACE_SIZE), Image.Resampling.LANCZOS)
    image.putalpha(rounded_mask(MARKETPLACE_SIZE, LOGO_RADIUS))
    save_png(image, ICONS / "kinglet.png")


def main() -> int:
    if not ICONS.is_dir():
        print(f"missing icons dir: {ICONS}", file=sys.stderr)
        return 1

    generate_icon_png()
    generate_icon_dark_png()
    generate_kinglet_png()

    icon = Image.open(ICONS / "icon.png")
    logo = Image.open(ICONS / "kinglet.png")
    print(
        "Generated image/icons/icon.png "
        f"({icon.size[0]}x{icon.size[1]}), icon-dark.png ({icon.size[0]}x{icon.size[1]}), "
        f"kinglet.png ({logo.size[0]}x{logo.size[1]})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
