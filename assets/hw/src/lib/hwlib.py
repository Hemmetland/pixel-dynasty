"""hwlib: shared pixel-art toolkit for the Pixel Dynasty hardware catalogue (hw2).

Pure Python 3 + Pillow.  Everything is hard-edged: no anti-aliasing, alpha is only 0 or 255.

Quick map
---------
PAL            shared palette: named 5-tone ramps (index 0 = darkest ... 4 = highlight)
Theme          dict of colour roles (shell, panel, trim, led, ...) with attribute access
Canvas         pixel canvas with px/rect/line/ellipse/polygon, oblique box(), rbox(), cyl(), grille(), led(), screw()
place()        centres a finished sprite (model: baseline row 59, icon: centred)
finish()       adds the 1 px outline #1c1c31 and the top-left rim #82b2d0 exactly like the shipped icons
up(), sheet()  preview helpers (nearest-neighbour upscale, per-type contact sheet)
masks          rect_mask / rrect_mask / ellipse_mask / poly_mask / dilate / edge_mask are plain python sets of (x, y)

Colours are accepted everywhere as '#rrggbb' strings or (r, g, b[, a]) tuples.
See STYLE.md for the conventions (view, light, depth, margins, outline rules).
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

HW2 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(HW2, "out")


# --------------------------------------------------------------------------- colours
def rgba(c, a=255):
    """'#rrggbb' | (r,g,b) | (r,g,b,a) -> (r,g,b,a)"""
    if isinstance(c, str):
        s = c.lstrip("#")
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)
    if len(c) == 3:
        return (c[0], c[1], c[2], a)
    return tuple(c)


def hexs(c):
    c = rgba(c)
    return "#%02x%02x%02x" % c[:3]


class Ramp(tuple):
    """5 tones, index 0 darkest .. 4 highlight. Named access: dark shade base light high."""

    def __new__(cls, hexes):
        hexes = list(hexes)
        assert len(hexes) == 5, "a Ramp has exactly 5 tones"
        return super().__new__(cls, [rgba(h) for h in hexes])

    dark = property(lambda s: s[0])
    shade = property(lambda s: s[1])
    base = property(lambda s: s[2])
    light = property(lambda s: s[3])
    high = property(lambda s: s[4])


OUTLINE = rgba("#1c1c31")  # outer + strong inner outline
RIM = rgba("#82b2d0")  # rim light, outside the outline on the top/left edges
NAVY = rgba("#0f1530")  # dock background used for previews
GLINT = (rgba("#e3fffd"), rgba("#fafec2"))  # specular glints

# Origin of the base colours: extract_palette.py over assets/ui/hw-*.png (28 colours in the shipped icons):
#   outline #1c1c31, rim #82b2d0, graphite #36314e #57475a #65656e, whites #dff5eb #b4cfc1 #91a69a #fafdfb,
#   glass/steel #e3fffd #b0e1ef #476e89, gold-orange #fb9f44 #ed6a3e #c6472f #fafec2, violets #5b058a #8f18da #c34cea #fb87fc
#   #f25cff, cyan #5efdff #03b6f0 #0283c5, greens #6ee76a #2ea35a #b9f5a2, teal #2fbfb0.
# Everything else below is an extension; NEW (not in the shipped icons) tones are marked in NEW_COLOURS.
PAL = {
    "outline": Ramp(["#1c1c31", "#1c1c31", "#1c1c31", "#1c1c31", "#1c1c31"]),
    # dark plastic / graphite (violet tinted so it sits well with the console accent)
    "graphite": Ramp(["#26243d", "#36314e", "#4a4561", "#625d7a", "#8681a0"]),
    # lighter graphite (controllers lying on a graphite console)
    "graphite_lt": Ramp(["#4a4561", "#625d7a", "#7a7595", "#9a95b5", "#c4c0d8"]),
    # graphite shell one tone up (style 1 Graphite shells) and an even lighter ramp for pads on it
    "graphite_mid": Ramp(["#36314e", "#4a4561", "#625d7a", "#7a7595", "#9a95b5"]),
    "graphite_pad": Ramp(["#625d7a", "#7a7595", "#9a95b5", "#c4c0d8", "#e4e2f0"]),
    # near-black ink for inset panels / matte panels, and a dark glossy glass for inset gloss panels
    "ink": Ramp(["#1c1c31", "#22203a", "#26243d", "#36314e", "#4a4561"]),
    "glass_dk": Ramp(["#1c1c31", "#22203a", "#26294a", "#34476b", "#b0e1ef"]),
    # brushed metal, cool light tint
    "steel": Ramp(["#476e89", "#7a9bb0", "#a9c8d6", "#d4eaf2", "#f2fcff"]),
    # white / light-grey plastic (mint tinted like the shipped gamepad)
    "white": Ramp(["#91a69a", "#b4cfc1", "#dff5eb", "#fafdfb", "#ffffff"]),
    # beige / putty plastic of 1990s PC cases (added by the pc artist)
    "beige": Ramp(["#8c7e62", "#b8aa8a", "#d9ceb0", "#efe6cc", "#fcf8e8"]),
    # glass: dark with an ice-blue glint
    "glass": Ramp(["#1c1c31", "#26294a", "#34476b", "#476e89", "#b0e1ef"]),
    "gold": Ramp(["#8a5230", "#d99a5b", "#fedf86", "#fff1b0", "#fffbe6"]),
    "pcb_green": Ramp(["#14473a", "#1f7a50", "#2ea35a", "#6ee76a", "#b9f5a2"]),
    "pcb_black": Ramp(["#1c1c31", "#26243d", "#36314e", "#4a4561", "#625d7a"]),
    # dark woven fabric (VR head straps): one step darker than graphite so it separates from graphite shells
    "fabric": Ramp(["#17172b", "#1f1e36", "#2b2842", "#3c3757", "#524d70"]),
    "pcb_red": Ramp(["#7a2230", "#c6472f", "#ed6a3e", "#fb9f44", "#fed08a"]),
    "pcb_blue": Ramp(["#0b3a78", "#0283c5", "#03b6f0", "#5efdff", "#c4fffd"]),
    # brown solder mask of 1990s ISA cards (added by the sound artist)
    "pcb_brown": Ramp(["#3a2418", "#5e3b24", "#8a5230", "#b0713f", "#d99a5b"]),
    # LEDs: [dark halo, halo, body, bright, core]
    "led_green": Ramp(["#1f6b3c", "#2ea35a", "#6ee76a", "#b9f5a2", "#f0ffe0"]),
    "led_red": Ramp(["#7a2230", "#c6472f", "#ff5a4a", "#ff9a8a", "#ffe0d8"]),
    "led_blue": Ramp(["#0b3a78", "#0283c5", "#03b6f0", "#5efdff", "#e3fffd"]),
    "led_amber": Ramp(["#a65a1e", "#fb9f44", "#fcd24a", "#fafec2", "#fffde8"]),
    "led_violet": Ramp(["#5b058a", "#8f18da", "#c34cea", "#fb87fc", "#ffd8ff"]),
    "led_white": Ramp(["#91a69a", "#dff5eb", "#fafdfb", "#ffffff", "#ffffff"]),
    # teal LED (same tones as the handheld accent ramp, so no new colours; named led_* so qa.py allows isolated pixels)
    "led_teal": Ramp(["#1f7a78", "#2fbfb0", "#7be0c8", "#b4f2e0", "#e2fff6"]),
    # handheld LCD: soft olive/grey-green liquid crystal (dark pixels .. pale backlight), added by the handheld artist
    "lcd": Ramp(["#24352f", "#4a6a52", "#8fb07a", "#c2d9a0", "#e8f2c4"]),
    # the 7 type accents: dark, shade, base (= the accent colour), light, highlight
    "sound": Ramp(["#a65a1e", "#d98a2c", "#f6b84a", "#fcd786", "#fff0c0"]),
    "gpu": Ramp(["#1f6b3c", "#2ea35a", "#6ee76a", "#b9f5a2", "#e8fdd0"]),
    "pc": Ramp(["#0b4a9a", "#1f7fe0", "#4aa8ff", "#8ed0ff", "#d4f0ff"]),
    # CPU substrates (added by the cpu artist), indexed like the light model: [3] top, [2] front, [1] side, [0] shadow
    "sub_green": Ramp(["#0e3a30", "#14473a", "#1f7a50", "#2ea35a", "#6ee76a"]),
    "sub_deep": Ramp(["#0a2224", "#0e3a30", "#14573f", "#1f7a50", "#2ea35a"]),
    "rose": Ramp(["#4e1a46", "#74225c", "#9a2a74", "#b83e8c", "#d6559f"]),
    "cpu": Ramp(["#9a2a74", "#d6559f", "#ff8fd2", "#ffb9e5", "#ffe3f5"]),
    "handheld": Ramp(["#1f7a78", "#2fbfb0", "#7be0c8", "#b4f2e0", "#e2fff6"]),
    "console": Ramp(["#5236b0", "#8b62e8", "#b98cff", "#d8bcff", "#f2e8ff"]),
    "vr": Ramp(["#a63a28", "#d45a3a", "#ff8a5c", "#ffb48a", "#ffdcc2"]),
}
ACCENT_HEX = {
    "sound": "#f6b84a", "gpu": "#6ee76a", "pc": "#4aa8ff", "cpu": "#ff8fd2",
    "handheld": "#7be0c8", "console": "#b98cff", "vr": "#ff8a5c",
}
# colours that are allowed to stand alone as 1 px (LED / glint). qa.py reads this.
ALLOW_ISOLATED = set(GLINT)
for _k, _r in PAL.items():
    if _k.startswith("led_"):
        ALLOW_ISOLATED.update(_r[2:])

_SHIPPED = {
    "#1c1c31", "#82b2d0", "#fb9f44", "#36314e", "#57475a", "#65656e", "#fafec2", "#b4cfc1", "#ed6a3e", "#8f18da",
    "#fb87fc", "#5efdff", "#6ee76a", "#91a69a", "#c34cea", "#0283c5", "#dff5eb", "#fafdfb", "#e3fffd", "#5b058a",
    "#f25cff", "#03b6f0", "#2fbfb0", "#c6472f", "#b9f5a2", "#2ea35a", "#b0e1ef", "#476e89",
}
NEW_COLOURS = sorted(
    {hexs(c) for r in PAL.values() for c in r} - _SHIPPED
)


def mix(c1, c2, t):
    a, b = rgba(c1), rgba(c2)
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3)) + (255,)


class Theme(dict):
    """A colour theme: dict of role -> Ramp or colour. Attribute access (theme.shell.base).

    Drawing functions must take every shell / panel / trim colour from the theme so ONE drawing gives 3 styles.
    Roles are up to the type artist; suggested: shell, panel, trim, accent, glass, metal, led, glow, pad, pad_trim.
    """

    def __init__(self, name, **roles):
        super().__init__(roles)
        self["name"] = name

    def __getattr__(self, k):
        try:
            return self[k]
        except KeyError:
            raise AttributeError(k)


# --------------------------------------------------------------------------- masks (sets of (x, y))
def rect_mask(x, y, w, h):
    return {(i, j) for j in range(y, y + h) for i in range(x, x + w)}


def rrect_mask(x, y, w, h, r):
    """Rounded rectangle; r = corner radius in px (r=2 chips 1 px, r=3 gives the usual 2-1-0 corner)."""
    m = set()
    lim = (r - 0.15) ** 2
    for j in range(h):
        for i in range(w):
            ci = min(i, w - 1 - i)
            cj = min(j, h - 1 - j)
            if ci < r and cj < r:
                dx, dy = r - (ci + 0.5), r - (cj + 0.5)
                if dx * dx + dy * dy > lim:
                    continue
            m.add((x + i, y + j))
    return m


def ellipse_mask(x, y, w, h, bias=1.0):
    """Ellipse inscribed in the bbox (x, y, w, h); pixel centres inside win. bias<1 rounds more, >1 squarer."""
    cx, cy, rx, ry = x + w / 2.0, y + h / 2.0, w / 2.0, h / 2.0
    m = set()
    for j in range(y, y + h):
        for i in range(x, x + w):
            dx, dy = (i + 0.5 - cx) / rx, (j + 0.5 - cy) / ry
            if dx * dx + dy * dy <= bias:
                m.add((i, j))
    return m


def poly_mask(pts):
    """Even-odd scanline fill, pixel centres, no anti-aliasing. pts = [(x, y), ...] in pixel-corner coordinates."""
    m = set()
    ys = [p[1] for p in pts]
    n = len(pts)
    for j in range(int(min(ys)) - 1, int(max(ys)) + 2):
        yc = j + 0.5
        xs = []
        for k in range(n):
            x0, y0 = pts[k]
            x1, y1 = pts[(k + 1) % n]
            if (y0 <= yc < y1) or (y1 <= yc < y0):
                xs.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for a, b in zip(xs[0::2], xs[1::2]):
            for i in range(int(math.ceil(a - 0.5)), int(math.ceil(b - 0.5))):
                m.add((i, j))
    return m


def shift(mask, dx, dy):
    return {(x + dx, y + dy) for x, y in mask}


def dilate(mask, diag=True):
    out = set()
    for x, y in mask:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if (dx or dy) and (diag or not (dx and dy)):
                    out.add((x + dx, y + dy))
    return out - mask


def erode(mask, n=1):
    """Shrink a mask by n px (4-neighbour)."""
    for _ in range(n):
        mask = {(x, y) for x, y in mask if all(q in mask for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))}
    return mask


def edge_mask(mask, dirs):
    """Pixels of mask whose neighbour in one of dirs ('u','d','l','r') is outside the mask."""
    v = {"u": (0, -1), "d": (0, 1), "l": (-1, 0), "r": (1, 0)}
    return {(x, y) for x, y in mask if any((x + v[k][0], y + v[k][1]) not in mask for k in dirs)}


def solid(front, d):
    """Oblique extrusion of a front-face mask by d px (back edge shifts +d right, -d up).
    Returns (top, side) masks (the front mask is not included). The top/side split is one clean 45 degree line
    through the front face's top-right extreme (the pixels maximising x - y), so rounded corners shade as a
    smooth top -> side hand-over instead of a checker."""
    swept = set()
    for k in range(1, d + 1):
        for (qx, qy) in front:
            swept.add((qx + k, qy - k))
    swept -= front
    best = max(x - y for x, y in front)
    ss = [x + y for x, y in front if x - y == best]
    s_star = (min(ss) + max(ss)) / 2.0
    top = {p for p in swept if p[0] + p[1] <= s_star}
    return top, swept - top


# --------------------------------------------------------------------------- Canvas
class Canvas:
    """RGBA canvas. All ops are hard-edged and clip silently at the border."""

    def __init__(self, w=64, h=64):
        self.w, self.h = w, h
        self.img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.pix = self.img.load()

    # -- basics
    def px(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.pix[x, y] = rgba(c)

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.pix[x, y]
        return (0, 0, 0, 0)

    def opaque(self, x, y):
        return self.get(x, y)[3] > 0

    def rect(self, x, y, w, h, c):
        c = rgba(c)
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)):
                self.px(i, j, c)

    def frame(self, x, y, w, h, c):
        self.hline(x, y, w, c)
        self.hline(x, y + h - 1, w, c)
        self.vline(x, y, h, c)
        self.vline(x + w - 1, y, h, c)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)

    def line(self, x0, y0, x1, y1, c):
        """Bresenham, 1 px."""
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def paint(self, mask, c):
        c = rgba(c)
        for x, y in mask:
            self.px(x, y, c)

    def ellipse(self, x, y, w, h, c, fill=True, bias=1.0):
        """Ellipse inscribed in bbox (x, y, w, h). fill=False draws only a 1 px ring."""
        m = ellipse_mask(x, y, w, h, bias)
        if not fill:
            m = edge_mask(m, "udlr")
        self.paint(m, c)
        return m

    def rrect(self, x, y, w, h, r, c):
        m = rrect_mask(x, y, w, h, r)
        self.paint(m, c)
        return m

    def polygon(self, pts, c):
        m = poly_mask(pts)
        self.paint(m, c)
        return m

    def stroke(self, mask, c, over_only=False, diag=True):
        """1 px line just outside a mask. over_only=True paints only where something is already drawn
        (use it for the separation outline of a part lying on another part)."""
        c = rgba(c)
        for x, y in dilate(mask, diag):
            if not over_only or self.opaque(x, y):
                self.px(x, y, c)

    def inner_stroke(self, mask, c, diag=False):
        """1 px line along the inside border of a mask."""
        self.paint(edge_mask(mask, "udlr") if not diag else {p for p in mask if any(n not in mask for n in _n8(p))}, c)

    def composite(self, sub, ox=0, oy=0, outline=None):
        """Paste another Canvas (opaque pixels only) at (ox, oy). outline=colour first draws a 1 px separation line
        around the part, only over pixels that are already opaque (so the silhouette outline stays finish()'s job)."""
        pts = {(x + ox, y + oy) for x in range(sub.w) for y in range(sub.h) if sub.pix[x, y][3] > 0}
        if outline is not None:
            self.stroke(pts, outline, over_only=True)
        for x in range(sub.w):
            for y in range(sub.h):
                p = sub.pix[x, y]
                if p[3] > 0:
                    self.px(x + ox, y + oy, p)
        return pts

    # -- solids
    def solid(self, front, d, top, front_c, side, hi=None, lo=None):
        """Paint an oblique solid from a front-face mask. hi = lit edges (top face front edge + left edge,
        front face left/top edge), lo = shadow edges (front bottom/right edge, side bottom edge).
        Returns dict(front, top, side) masks."""
        t, s = solid(front, d)
        full = front | t | s
        self.paint(t, top)
        self.paint(s, side)
        self.paint(front, front_c)
        if hi is not None:
            # top face: the edge touching the front face, and its left edge
            self.paint({p for p in t if (p[0], p[1] + 1) in front or (p[0] - 1, p[1]) not in full}, hi)
        if lo is not None:
            self.paint({p for p in front if (p[0], p[1] + 1) not in front}, lo)
            self.paint({p for p in s if (p[0], p[1] + 1) not in full}, lo)
        return {"front": front, "top": t, "side": s}

    def box(self, x, y, w, h, d, top, front, side, hi=None, lo=None):
        """Oblique box. (x, y, w, h) is the FRONT face; the back edge is d px to the right and d px up.
        Bounding box: x .. x+w+d-1, y-d .. y+h-1. Light top-left: top lightest, front mid, side darkest."""
        return self.solid(rect_mask(x, y, w, h), d, top, front, side, hi, lo)

    def rbox(self, x, y, w, h, d, r, top, front, side, hi=None, lo=None):
        """Same as box() with a rounded front face (corner radius r) - chunky / toy-like bodies."""
        return self.solid(rrect_mask(x, y, w, h, r), d, top, front, side, hi, lo)

    def cyl(self, x, y, w, eh, th, top, side, hi=None, rim=None):
        """Upright cylinder / disc seen from the front-above: top ellipse bbox (x, y, w, eh), body th px tall.
        rim = colour of a 1 px ring around the top ellipse, hi = 1 px highlight arc on its upper-left."""
        em = ellipse_mask(x, y, w, eh)
        body = set()
        for k in range(th + 1):
            body |= shift(em, 0, k)
        self.paint(body, side)
        self.paint(em, top)
        if rim is not None:
            self.paint(edge_mask(em, "udlr"), rim)
        if hi is not None:
            self.paint({p for p in edge_mask(em, "ul") if p[0] < x + w * 0.6 and p[1] < y + eh * 0.6}, hi)
        return {"top": em, "all": body | em}

    def disc(self, x, y, w, h, c, ring=None):
        """Flat disc (ellipse) with optional ring colour."""
        m = self.ellipse(x, y, w, h, c)
        if ring is not None:
            self.paint(edge_mask(m, "udlr"), ring)
        return m

    # -- small parts
    def grille(self, x, y, w, h, c, bg=None, step=2, vertical=True):
        """Vent grille: 1 px slits every `step` px inside (x, y, w, h); optional bg fill first."""
        if bg is not None:
            self.rect(x, y, w, h, bg)
        if vertical:
            for i in range(0, w, step):
                self.vline(x + i, y, h, c)
        else:
            for j in range(0, h, step):
                self.hline(x, y + j, w, c)

    def led(self, x, y, ramp, w=1, h=1, halo=True):
        """LED: w x h core (ramp.light, top-left pixel ramp.core), darker 1 px halo (ramp.shade) around it."""
        if halo:
            for j in range(-1, h + 1):
                for i in range(-1, w + 1):
                    if (i in (-1, w)) and (j in (-1, h)):
                        continue
                    self.px(x + i, y + j, ramp[1])
        self.rect(x, y, w, h, ramp[3] if w * h > 1 else ramp[2])
        if w * h > 1:
            self.px(x, y, ramp[4])

    def screw(self, x, y, base, hi):
        """2x2 screw head: light top-left, dark bottom-right."""
        self.px(x, y, hi)
        self.px(x + 1, y, base)
        self.px(x, y + 1, base)
        self.px(x + 1, y + 1, base)

    def glint(self, x, y, horizontal=True, n=2, c=GLINT[0]):
        for i in range(n):
            self.px(x + (i if horizontal else 0), y + (0 if horizontal else i), c)


def _n8(p):
    x, y = p
    return [(x + i, y + j) for j in (-1, 0, 1) for i in (-1, 0, 1) if i or j]


# --------------------------------------------------------------------------- finishing
def outline_pixels(body):
    """Outline = 4-neighbour dilation (1 px thick on 45 degree staircases) plus the diagonal corner pixel at true
    90 degree convex corners (so square corners stay square, as in the shipped icons)."""
    out = dilate(body, diag=False)
    for (x, y) in body:
        for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            d = (x + dx, y + dy)
            if d in body or d in out:
                continue
            if (x + dx, y) in body or (x, y + dy) in body:
                continue
            if (x - dx, y + dy) in body or (x + dx, y - dy) in body:
                continue
            out.add(d)
    return out


def finish(canvas, outline=True, rim=True):
    """Return a new RGBA image: the canvas plus a 1 px outer outline (#1c1c31, 8-neighbour so corners are closed)
    and the rim light (#82b2d0) on the transparent pixel directly ABOVE or LEFT of every outline pixel -
    i.e. the rim is the outermost line on the top/left edges, exactly like the shipped hw-*.png icons.
    Alpha is forced to 0/255. The sprite therefore grows 2 px to the top/left and 1 px to the bottom/right."""
    w, h = canvas.w, canvas.h
    img = canvas.img.copy()
    px = img.load()
    body = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0}
    for x, y in body:  # hard alpha
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 255)
    if outline:
        out = outline_pixels(body)
        for x, y in out:
            if 0 <= x < w and 0 <= y < h:
                px[x, y] = OUTLINE
        if rim:
            allp = body | out
            for x, y in out:
                for dx, dy in ((0, -1), (-1, 0)):
                    q = (x + dx, y + dy)
                    if q not in allp and 0 <= q[0] < w and 0 <= q[1] < h:
                        px[q] = RIM
    return img


def place(img, kind="model"):
    """Translate a finished sprite (whole pixels only) so it sits where the catalogue wants it:
    model: horizontally centred, lowest opaque row on 59 (rim/outline included);
    icon: centred in both axes. Never resamples. Call it on the result of finish()."""
    bb = bbox(img)
    x0, y0, x1, y1 = bb[0], bb[1], bb[2] - 1, bb[3] - 1
    w, h = img.size
    dx = int(round((w - 1) / 2.0 - (x0 + x1) / 2.0))
    if kind == "model":
        dy = 59 - y1
    else:
        dy = int(round((h - 1) / 2.0 - (y0 + y1) / 2.0))
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (dx, dy))
    return out


# --------------------------------------------------------------------------- preview helpers
def up(img, k=8, bg=None):
    """Nearest-neighbour upscale; bg (colour) puts it on an opaque background."""
    big = img.resize((img.width * k, img.height * k), Image.NEAREST)
    if bg is None:
        return big
    base = Image.new("RGBA", big.size, rgba(bg))
    base.alpha_composite(big)
    return base


def bbox(img):
    return img.getchannel("A").point(lambda a: 255 if a else 0).getbbox()


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


def out_dir(type_name):
    d = os.path.join(OUT_ROOT, type_name)
    os.makedirs(d, exist_ok=True)
    return d


def _font(size=11):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def tile(icon, accent_hex, size=38):
    """The icon on its 38 px accent tile (accent mixed 22 % into the dock navy, 1 px lighter border)."""
    bgc = mix(NAVY, accent_hex, 0.22)
    t = Image.new("RGBA", (size, size), bgc)
    d = ImageDraw.Draw(t)
    d.rectangle([0, 0, size - 1, size - 1], outline=mix(NAVY, accent_hex, 0.45))
    ox, oy = (size - icon.width) // 2, (size - icon.height) // 2
    t.alpha_composite(icon, (ox, oy))
    return t


def sheet(type_name, gens=(1, 2, 3), styles=(1, 2, 3), labels=None, path=None):
    """Contact sheet for out/<type>/: one row per generation, per style [model 2x | icon 4x | icon 1x on tile],
    all on the dock navy. Returns the PIL image and saves out/<type>/sheet.png (or path)."""
    d = out_dir(type_name)
    acc = ACCENT_HEX.get(type_name, "#b98cff")
    pad, mw, iw, tw = 8, 128, 128, 38
    cell = mw + pad + iw + pad + tw + pad * 2
    lab = 86
    rowh = 128 + pad * 2 + 14
    W = lab + cell * len(styles) + pad
    H = len(gens) * rowh + 24
    sh = Image.new("RGBA", (W, H), NAVY)
    dr = ImageDraw.Draw(sh)
    f = _font(11)
    for si, s in enumerate(styles):
        dr.text((lab + si * cell + pad, 5), "style %d" % s, fill=rgba("#a9c8d6"), font=f)
    for gi, g in enumerate(gens):
        y0 = 24 + gi * rowh
        dr.text((8, y0 + 56), (labels or {}).get(g, "g%d" % g), fill=rgba("#a9c8d6"), font=f)
        for si, s in enumerate(styles):
            x0 = lab + si * cell + pad
            mp = os.path.join(d, "model-g%d-s%d.png" % (g, s))
            ip = os.path.join(d, "icon-g%d-s%d.png" % (g, s))
            if os.path.exists(mp):
                m = Image.open(mp).convert("RGBA")
                sh.alpha_composite(up(m, 2), (x0, y0 + 4))
            if os.path.exists(ip):
                ic = Image.open(ip).convert("RGBA")
                sh.alpha_composite(up(ic, 4), (x0 + mw + pad, y0 + 4))
                sh.alpha_composite(tile(ic, acc), (x0 + mw + pad + iw + pad, y0 + 4 + 40))
    p = path or os.path.join(d, "sheet.png")
    sh.save(p)
    return sh
