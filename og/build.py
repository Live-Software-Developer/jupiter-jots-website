"""Render the site's Open Graph images and icons.

    pnpm og        (or: python3 og/build.py)

Each share image is template.html rendered by headless Chrome at 1200x630 and saved as an
RGB PNG in public/og/. The home image uses the real screenshots in public/shots/. The same
script renders the logo (og/jj-logo.svg, the extension's logo) into the icon files:
public/icon-192.png, public/icon-512.png, src/app/apple-icon.png and src/app/favicon.ico.

Chrome: $CHROME, else google-chrome, else Playwright's cached Chromium.
A new page needs a row in IMAGES (its name is the file name pageMetadata() points at).
"""

import html
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
OUT = ROOT / "public" / "og"
HOST = "jj.livesoftwaredeveloper.com"  # the domain printed on the cards (SITE_URL in src/lib/site.ts)

# name, path shown on the card, title, body, visual ("hero" or None)
IMAGES = [
    ("home", "", "Save the page. Keep the reason.",
     "A free bookmark manager for Chrome that remembers why you saved each page.", "hero"),
    ("guide", "/guide", "How to use Jupiter Jots",
     "From installing to backing up: saving, collections, tags, import and shortcuts.", None),
    ("faq", "/faq", "Frequently asked questions",
     "Short answers about saving, organising and keeping your library.", None),
    ("changelog", "/changelog", "Changelog",
     "What changed in each version of Jupiter Jots, newest first.", None),
    ("about", "/about", "About Jupiter Jots",
     "A bookmark manager for people who save pages for a reason and want to find them again.", None),
    ("support", "/support", "Support",
     "Find an answer, report a problem, or contact us.", None),
    ("privacy", "/privacy", "Privacy policy",
     "Your library stays on your computer. No account, no server, no tracking.", None),
    ("terms", "/terms", "Terms of use",
     "The rules for using Jupiter Jots, in plain language.", None),
]


def chrome() -> str:
    for c in (os.environ.get("CHROME"), shutil.which("google-chrome"),
              str(Path.home() / ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome")):
        if c and Path(c).exists():
            return c
    raise SystemExit("No Chrome found; set CHROME=/path/to/chrome")


def shoot(page: Path, out: Path, width: int, height: int) -> None:
    subprocess.run(
        [chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
         "--force-device-scale-factor=1", "--virtual-time-budget=4000", "--default-background-color=00000000",
         f"--window-size={width},{height}", f"--screenshot={out}", page.as_uri()],
        check=True, capture_output=True,
    )


def visual(kind: str | None) -> tuple[str, int, int]:
    """Returns (html, copy column width, title size)."""
    if kind == "hero":
        return ('<div class="shot wide"><img src="../public/shots/search.webp" alt=""></div>'
                '<div class="shot tall"><img src="../public/shots/save.webp" alt=""></div>'), 520, 76
    return "", 940, 92


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    template = (SRC / "template.html").read_text()
    for name, path, title, body, kind in IMAGES:
        markup, width, size = visual(kind)
        page = template
        for key, value in {
            "title": html.escape(title), "body": html.escape(body), "path": html.escape(path), "host": HOST,
            "visual": markup, "copyWidth": str(width), "titleSize": str(size),
        }.items():
            page = page.replace("{{" + key + "}}", value)
        tmp = SRC / f".{name}.html"
        tmp.write_text(page)
        out = OUT / f"{name}.png"
        shoot(tmp, out, 1200, 630)
        tmp.unlink()
        Image.open(out).convert("RGB").save(out, optimize=True)
        print(f"public/og/{name}.png  {out.stat().st_size // 1024} KB")

    # Icons from the SVG logo, rendered large on a transparent page, then scaled down.
    tmp = SRC / ".logo.html"
    tmp.write_text('<html><body style="margin:0;background:transparent">'
                   '<img src="jj-logo.svg" style="display:block;width:1024px;height:1024px"></body></html>')
    big = SRC / ".logo.png"
    shoot(tmp, big, 1024, 1024)
    tmp.unlink()
    logo = Image.open(big).convert("RGBA")
    big.unlink()
    for size, out in ((192, ROOT / "public" / "icon-192.png"), (512, ROOT / "public" / "icon-512.png")):
        logo.resize((size, size), Image.LANCZOS).save(out, optimize=True)
        print(f"{out.relative_to(ROOT)}  {size}x{size}")
    # Apple touch icon: opaque. iOS rounds the corners itself, so fill them with the tile colour.
    tile = Image.new("RGBA", (180, 180), (122, 64, 218, 255))
    small = logo.resize((180, 180), Image.LANCZOS)
    tile.alpha_composite(small)
    tile.convert("RGB").save(ROOT / "src" / "app" / "apple-icon.png", optimize=True)
    print("src/app/apple-icon.png  180x180")
    # favicon.ico from the extension's hand-tuned small PNGs (public/icons/), which stay sharp at 16px.
    small_pngs = [Image.open(ROOT / "public" / "icons" / f"jj-{s}.png").convert("RGBA") for s in (48, 32, 16)]
    small_pngs[0].save(ROOT / "src" / "app" / "favicon.ico", sizes=[(48, 48), (32, 32), (16, 16)], append_images=small_pngs[1:])
    print("src/app/favicon.ico  16, 32, 48")


if __name__ == "__main__":
    main()
