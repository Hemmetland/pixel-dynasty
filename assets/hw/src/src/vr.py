"""VR (Mirage) hardware art: 3 generations x 3 styles, model 64x64 + icon 32x32.

run:  python3 src/vr.py              -> writes out/vr/model-gN-sS.png, icon-gN-sS.png, sheet.png
      python3 src/vr.py g2           -> only one generation
      python3 src/vr.py dev:g1_model:123:6   -> preview strip into prev/vr_*.png (themes 1,2,3 at scale 6)
"""
import os
import sys
import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "lib"))
from hwlib import *  # noqa: E402,F401,F403

P = PAL
V = P["vr"]
G = P["graphite"]
GL = P["graphite_lt"]
W = P["white"]
ST = P["steel"]
GLASS = P["glass"]
BLK = P["pcb_black"]
FAB = P["fabric"]
GOLD = P["gold"]

# ------------------------------------------------------------------ themes
# roles: shell (visor body), plate (front glass / plate), strap (fabric), trim (accent lines), led (tracking LEDs),
#        ctl (controller body), ctl_trim (controller accent), dial (metal dial), cable, lens (camera lenses)
THEMES = {
    1: Theme("Graphite", shell=G, plate=GLASS, strap=FAB, trim=V, led=V, ctl=GL, ctl_trim=V, dial=ST, cable=G,
             pods=GL, lens=GLASS, arm=GL),
    2: Theme("Ljus", shell=W, plate=GLASS, strap=G, trim=V, led=V, ctl=G, ctl_trim=V, dial=ST, cable=G,
             pods=W, lens=GLASS, arm=G),
    3: Theme("Korall", shell=V, plate=GLASS, strap=FAB, trim=W, led=P["led_blue"], ctl=V, ctl_trim=W, dial=ST,
             cable=G, pods=V, lens=GLASS, arm=G),
}


# ------------------------------------------------------------------ helpers
def bez(p0, p1, p2, p3, n=90):
    pts = []
    for i in range(n + 1):
        t = i / float(n)
        u = 1 - t
        x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0]
        y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
        pts.append((x, y))
    return pts


def band(pts, r):
    """Thick path: union of discs of radius r (pixel centres) along the polyline pts."""
    m = set()
    k = int(math.ceil(r)) + 1
    for (px_, py_) in pts:
        for j in range(int(py_) - k, int(py_) + k + 1):
            for i in range(int(px_) - k, int(px_) + k + 1):
                if (i + 0.5 - px_) ** 2 + (j + 0.5 - py_) ** 2 <= r * r:
                    m.add((i, j))
    return m


def shade_mask(c, m, ramp, tex=False):
    """Paint a freeform mask with top-left light: base, lit edge on top/left, shade edge on bottom/right."""
    c.paint(m, ramp[2])
    if tex:
        c.paint({p for p in m if (p[0] + p[1]) % 2 == 0}, ramp[1])
    c.paint({p for p in m if (p[0], p[1] + 1) not in m or (p[0] + 1, p[1]) not in m}, ramp[1])
    c.paint({p for p in m if (p[0], p[1] - 1) not in m or (p[0] - 1, p[1]) not in m}, ramp[3])
    return m


def side_cols(side_mask):
    d = {}
    for x, y in side_mask:
        d.setdefault(x, []).append(y)
    for k in d:
        d[k].sort()
    return d


def ascii_mask(rows, ox, oy, ch="#"):
    return {(ox + x, oy + y) for y, r in enumerate(rows) for x, v in enumerate(r) if v == ch}


class OCanvas(Canvas):
    """Canvas with an origin offset: draw with free coordinates (negative ones too) on a big canvas; export() crops."""

    def __init__(self, w=96, h=96, ox=16, oy=16):
        super().__init__(w, h)
        self.ox, self.oy = ox, oy

    def px(self, x, y, c):
        Canvas.px(self, int(x) + self.ox, int(y) + self.oy, c)

    def get(self, x, y):
        return Canvas.get(self, x + self.ox, y + self.oy)

    def erase(self, mask):
        for (x, y) in mask:
            Canvas.px(self, x + self.ox, y + self.oy, (0, 0, 0, 0))


def MC():
    return OCanvas(96, 96, 16, 16)


def IC():
    return OCanvas(64, 64, 16, 16)


def _allowed():
    al = set(ALLOW_ISOLATED)
    for r in PAL.values():
        al.add(tuple(r[4]))
    return al


def despeckle(img):
    """Recolour isolated 1 px body pixels (no same-colour 8-neighbour, not LED/glint/highlight) with the dominant
    colour around them. Keeps the shading routines simple: edge tones on thin diagonal bands leave stray pixels."""
    px = img.load()
    w, h = img.size
    al = _allowed()
    for _ in range(2):
        op = {(x, y) for y in range(h) for x in range(w) if px[x, y][3]}
        for (x, y) in sorted(op):
            col = tuple(px[x, y])
            if col in (OUTLINE, RIM) or col in al:
                continue
            nb = [(x + i, y + j) for j in (-1, 0, 1) for i in (-1, 0, 1) if i or j]
            if any(q in op and tuple(px[q]) == col for q in nb):
                continue
            cnt = {}
            for q in nb:
                if q in op and tuple(px[q]) not in (OUTLINE, RIM):
                    cnt[tuple(px[q])] = cnt.get(tuple(px[q]), 0) + (2 if q[0] == x or q[1] == y else 1)
            if cnt:
                px[x, y] = max(cnt.items(), key=lambda kv: kv[1])[0]
    return img


def export(c, kind):
    """finish() + despeckle + crop + place() into 64x64 (model) / 32x32 (icon)."""
    img = despeckle(finish(c))
    tight = img.crop(bbox(img))
    size = 64 if kind == "model" else 32
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(tight, (max(0, (size - tight.width) // 2), 0))
    return place(out, kind), tight.size


# ------------------------------------------------------------------ g1 : tethered visor (2016-2019)
def wand_g1(c, ox, oy, th):
    """Upright tracking wand with a halo ring on top. 9 wide x 19 tall at (ox, oy)."""
    S = th.ctl
    ring = ellipse_mask(ox, oy, 9, 7)
    hole = ellipse_mask(ox + 2, oy + 2, 5, 3)
    grip = poly_mask([(ox + 2.5, oy + 5), (ox + 6.5, oy + 5), (ox + 7.5, oy + 8), (ox + 8, oy + 14), (ox + 7.5, oy + 19),
                      (ox + 3.5, oy + 19), (ox + 2.5, oy + 14), (ox + 1.5, oy + 8)])
    body = (ring - hole) | grip
    shade_mask(c, body, S)
    c.paint(hole, S[0])
    # tracking dots on the ring
    c.paint({(ox, oy + 3), (ox, oy + 4)}, th.ctl_trim[3])
    c.paint({(ox + 8, oy + 3), (ox + 8, oy + 4)}, th.ctl_trim[3])
    c.paint({(ox + 3, oy + 6), (ox + 4, oy + 6), (ox + 5, oy + 6)}, th.ctl_trim[2])
    # thumb pad, trigger groove, grip band
    c.rect(ox + 3, oy + 8, 3, 2, S[0])
    c.px(ox + 4, oy + 8, th.ctl_trim[3])
    c.hline(ox + 3, oy + 13, 4, S[0])
    c.hline(ox + 3, oy + 14, 4, S[3])
    c.rect(ox + 3, oy + 16, 4, 2, S[1])
    return body


def cable_path(c, pts, ramp, r=1.0):
    m = band(pts, r)
    shade_mask(c, m, ramp)
    return m


def plug_g1(c, x, y, th):
    """Cable plug lying on the floor, tip pointing left: steel tip, gold strip, dark sleeve. 9 x 5."""
    c.rect(x, y + 1, 5, 3, ST[2])
    c.hline(x, y + 1, 5, ST[4])
    c.hline(x, y + 3, 5, ST[0])
    c.hline(x + 1, y + 2, 3, GOLD[2])
    c.rect(x + 5, y, 4, 5, th.cable[2])
    c.hline(x + 5, y, 4, th.cable[3])
    c.hline(x + 5, y + 4, 4, th.cable[0])


def shear(sub, lean, y_ref):
    """Shift each row of a Canvas sideways: lean px at 0 rows above y_ref... (positive lean = top leans right)."""
    out = Canvas(sub.w, sub.h)
    for y in range(sub.h):
        k = int(round(lean * (y_ref - y) / float(y_ref)))
        for x in range(sub.w):
            p = sub.pix[x, y]
            if p[3] > 0:
                out.px(x + k, y, p)
    return out


def g1_model(th):
    c = MC()
    S = th.shell
    X, Y, Wd, H, Dp = 6, 24, 27, 19, 6
    # --- head strap arch (behind the visor)
    arch = band(bez((X + 7, Y - 3), (X + 1, 6), (X + 33, 4), (X + Wd + 8, Y - 8)), 1.8)
    shade_mask(c, arch, th.strap, tex=True)
    c.rect(X + 12, 9, 6, 3, th.trim[2])
    c.hline(X + 12, 9, 6, th.trim[3])
    # cable leaves the left side, drops to the floor and ends in a plug lying in front
    cab = band(bez((X + 2, Y + 8), (X - 7, Y + 6), (X - 6, Y + H + 6), (X + 4, Y + H + 5)), 1.15)
    shade_mask(c, cab, th.cable)
    # --- visor body with notch for the nose
    front = rrect_mask(X, Y, Wd, H, 4) - ellipse_mask(X + 8, Y + H - 4, 11, 8)
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    # top vents
    for i in range(3):
        c.line(X + 16 + 2 * i, Y - 2, X + 18 + 2 * i, Y - 4, S[1])
    plug_g1(c, X + 3, Y + H + 3, th)
    # side strap on the right face up to the rear dial
    side = band([(X + Wd + k, Y + 8 - k) for k in range(0, 9)], 1.6)
    shade_mask(c, side, th.strap, tex=True)
    # rear dial
    c.cyl(X + Wd + 7, 13, 8, 5, 3, th.dial[3], th.dial[1], hi=th.dial[4], rim=th.dial[2])
    c.rect(X + Wd + 9, 14, 4, 2, th.trim[2])
    # front plate (raised, thick)
    pl = rrect_mask(X + 3, Y + 3, Wd - 7, 11, 2)
    c.solid(pl, 2, S[3], th.plate[1], S[1], hi=S[4])
    c.paint(erode(pl, 1), th.plate[1])
    for i in range(4):
        c.px(X + 6 + i, Y + 7 - i, GLINT[0])
    for i in range(2):
        c.px(X + 11 + i, Y + 7 - i, th.plate[3])
    # coral trim
    c.hline(X + 2, Y + 14, Wd - 5, th.trim[2])
    # tracking leds on the plate
    for (lx, ly) in ((X + 5, Y + 8), (X + 9, Y + 6), (X + 14, Y + 4), (X + 20, Y + 6), (X + 18, Y + 10), (X + 12, Y + 11)):
        c.rect(lx, ly, 2, 1, th.led[3])
    # wands standing in front right
    sub = Canvas(24, 24)
    wand_g1(sub, 2, 2, th)
    sub = shear(sub, -1, 21)
    c.composite(sub, 32, 33, outline=S[0])
    sub = Canvas(24, 24)
    wand_g1(sub, 2, 2, th)
    sub = shear(sub, 1, 21)
    c.composite(sub, 42, 34, outline=S[0])
    return c


def wand_icon_g1(c, ox, oy, th):
    """Upright wand for the icon: ring 7 x 5 + grip, 7 wide x 12 tall."""
    S = th.ctl
    ring = ellipse_mask(ox, oy, 7, 5)
    hole = {(ox + 2, oy + 2), (ox + 3, oy + 2), (ox + 4, oy + 2)}
    grip = rect_mask(ox + 2, oy + 4, 3, 8)
    body = (ring - hole) | grip
    shade_mask(c, body, S)
    c.paint(hole, S[0])
    c.paint({(ox, oy + 2), (ox, oy + 3)}, th.ctl_trim[3])
    c.paint({(ox + 6, oy + 2), (ox + 6, oy + 3)}, th.ctl_trim[3])
    c.rect(ox + 3, oy + 6, 1, 2, th.ctl_trim[2])
    return body


def g1_icon(th):
    c = IC()
    S = th.shell
    X, Y, Wd, H, Dp = 3, 12, 15, 10, 4
    # strap arch behind the visor: ring made of two ellipses
    ring = ellipse_mask(X + 1, 2, 19, 15) - ellipse_mask(X + 3, 4, 15, 11)
    shade_mask(c, ring, th.strap)
    notch = {(X + 6, Y + H - 1), (X + 7, Y + H - 1), (X + 8, Y + H - 1), (X + 9, Y + H - 1), (X + 7, Y + H - 2), (X + 8, Y + H - 2)}
    front = rrect_mask(X, Y, Wd, H, 2) - notch
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    # dial where the strap meets the side
    c.rect(X + Wd + 2, 7, 3, 4, th.dial[2])
    c.vline(X + Wd + 2, 7, 4, th.dial[3])
    c.vline(X + Wd + 4, 7, 4, th.dial[1])
    c.px(X + Wd + 3, 8, th.trim[2]); c.px(X + Wd + 3, 9, th.trim[2])
    # plate
    pl = rrect_mask(X + 1, Y + 1, Wd - 3, 6, 1)
    c.paint(pl, th.plate[1])
    c.paint(edge_mask(pl, "u"), th.plate[0])
    c.px(X + 2, Y + 3, th.plate[3]); c.px(X + 3, Y + 2, th.plate[3])
    c.hline(X + 7, Y + 2, 2, th.led[3]); c.hline(X + 11, Y + 4, 2, th.led[3]); c.hline(X + 5, Y + 5, 2, th.led[3])
    c.hline(X + 1, Y + 7, Wd - 3, th.trim[2])
    # one wand, lower right
    sub = Canvas(12, 16)
    wand_icon_g1(sub, 1, 1, th)
    c.composite(sub, X + Wd + 1, 14, outline=S[0])
    return c


# ------------------------------------------------------------------ g2 : standalone visor (2020-2026)
def depth_of(front, p, d):
    """Depth layer k (1..d) of a side/top pixel p of an oblique solid, 0 for front pixels."""
    for k in range(0, d + 1):
        if (p[0] - k, p[1] + k) in front:
            return k
    return d + 1


def wand_g2(c, ox, oy, th):
    """Motion controller: halo ring over a short grip with thumbstick and buttons. 9 x 19 at (ox, oy)."""
    S = th.ctl
    ring = ellipse_mask(ox, oy, 9, 7)
    hole = ellipse_mask(ox + 2, oy + 2, 5, 3)
    grip = poly_mask([(ox + 2.5, oy + 5), (ox + 6.5, oy + 5), (ox + 7.5, oy + 9), (ox + 8, oy + 14), (ox + 7.5, oy + 19),
                      (ox + 3.5, oy + 19), (ox + 2.5, oy + 14), (ox + 1.5, oy + 9)])
    body = (ring - hole) | grip
    shade_mask(c, body, S)
    c.paint(hole, S[0])
    c.paint({(ox, oy + 3), (ox, oy + 4)}, th.ctl_trim[3])
    c.paint({(ox + 8, oy + 3), (ox + 8, oy + 4)}, th.ctl_trim[3])
    # thumbstick + buttons
    c.ellipse(ox + 3, oy + 8, 4, 3, S[0])
    c.rect(ox + 4, oy + 8, 2, 2, S[3])
    c.px(ox + 7, oy + 9, th.ctl_trim[2]); c.px(ox + 7, oy + 10, th.ctl_trim[2])
    c.hline(ox + 3, oy + 14, 4, S[0])
    c.hline(ox + 3, oy + 15, 4, S[3])
    c.rect(ox + 3, oy + 17, 4, 2, S[1])
    return body


def camera(c, x, y, th):
    """4 x 4 tracking camera: light ring, dark glass centre, glint."""
    ring = ST[1]
    c.paint({(x + 1, y), (x + 2, y), (x, y + 1), (x + 3, y + 1), (x, y + 2), (x + 3, y + 2), (x + 1, y + 3), (x + 2, y + 3)}, ring)
    c.rect(x + 1, y + 1, 2, 2, BLK[0])
    c.px(x + 1, y, ST[4]); c.px(x, y + 1, ST[3])
    c.px(x + 2, y + 2, th.lens[3])


def pill_mask(x, y, w, h, rt, rb):
    """Rounded rectangle with different corner radii: rt on top, rb at the bottom."""
    return rrect_mask(x, y, w, h - rb, rt) | rrect_mask(x, y + rb, w, h - rb, rb) | rect_mask(x + rb, y + rt, w - 2 * rb, h - rt - rb)


def camera3(c, x, y, th):
    """3 x 3 tracking camera: steel barrel, dark lens, glint on the top-left."""
    c.rect(x, y, 3, 3, ST[1])
    c.px(x + 1, y, ST[2]); c.px(x, y + 1, ST[2]); c.px(x + 2, y + 1, ST[0]); c.px(x + 1, y + 2, ST[0])
    c.px(x + 1, y + 1, BLK[0])
    c.px(x, y, ST[4])


def g2_model(th):
    c = MC()
    S = th.shell
    X, Y, Wd, H, Dp = 14, 25, 30, 21, 6
    # --- fabric head strap, flat loop behind the visor
    loop = band(bez((X + Wd + 7, Y + 3), (X + Wd + 8, Y - 17), (X + 8, Y - 17), (X + 5, Y - 3)), 1.8)
    shade_mask(c, loop, th.strap, tex=True)
    # --- visor: rounded, glossy
    front = pill_mask(X, Y, Wd, H, 5, 9) - ellipse_mask(X + 10, Y + H - 3, 10, 6)
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    # soft face gasket: rear two layers of the side face
    for q in geo["side"]:
        if depth_of(F, q, Dp) >= Dp:
            c.px(q[0], q[1], BLK[2])
    # rigid arm on the side face, continuing into the strap
    arm = band([(X + Wd + k, Y + 10 - k) for k in range(0, 8)], 1.9)
    shade_mask(c, arm, th.arm)
    c.px(X + Wd + 2, Y + 8, th.arm[0]); c.px(X + Wd + 3, Y + 7, th.arm[0])
    # glass front panel (large)
    pl = pill_mask(X + 2, Y + 2, Wd - 4, H - 7, 4, 5)
    c.paint(pl, th.plate[1])
    c.paint(edge_mask(pl, "u") | edge_mask(pl, "l"), th.plate[0])
    for i in range(4):
        c.px(X + 11 + i, Y + 9 - i, GLINT[0])
    for i in range(2):
        c.px(X + 16 + i, Y + 9 - i, th.plate[3])
    # camera lenses at the four corners of the glass
    for (lx, ly) in ((X + 4, Y + 3), (X + Wd - 7, Y + 3), (X + 4, Y + H - 10), (X + Wd - 7, Y + H - 10)):
        camera3(c, lx, ly, th)
    # led under the plate
    c.hline(X + 13, Y + H - 3, 4, th.led[3])
    # controllers to the left
    sub = Canvas(24, 26)
    wand_g2(sub, 2, 2, th)
    sub = shear(sub, -1, 21)
    c.composite(sub, -1, 31, outline=S[0])
    sub = Canvas(24, 26)
    wand_g2(sub, 2, 2, th)
    sub = shear(sub, 1, 21)
    c.composite(sub, 7, 33, outline=S[0])
    return c


def wand_icon_g2(c, ox, oy, th):
    """Controller for the 32 px icon: ring 6 x 4 + grip, 6 wide x 11 tall."""
    S = th.ctl
    ring = ellipse_mask(ox, oy, 6, 4)
    hole = {(ox + 2, oy + 1), (ox + 3, oy + 1)}
    grip = rect_mask(ox + 2, oy + 3, 2, 8)
    body = (ring - hole) | grip
    shade_mask(c, body, S)
    c.paint(hole, S[0])
    c.paint({(ox, oy + 2), (ox + 5, oy + 2)}, th.ctl_trim[3])
    c.rect(ox + 2, oy + 5, 2, 1, th.ctl_trim[2])
    return body


def g2_icon(th):
    c = IC()
    S = th.shell
    X, Y, Wd, H, Dp = 6, 12, 15, 11, 4
    loop = band(bez((X + Wd + 3, Y + 2), (X + Wd + 4, Y - 7), (X + 2, Y - 7), (X + 1, Y - 2)), 1.0)
    shade_mask(c, loop, th.strap)
    front = pill_mask(X, Y, Wd, H, 3, 5) - {(X + 6, Y + H - 1), (X + 7, Y + H - 1), (X + 8, Y + H - 1), (X + 7, Y + H - 2)}
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    arm = band([(X + Wd + k, Y + 5 - k) for k in range(0, 4)], 1.0)
    shade_mask(c, arm, th.arm)
    pl = pill_mask(X + 1, Y + 1, Wd - 2, H - 4, 2, 3)
    c.paint(pl, th.plate[1])
    c.paint(edge_mask(pl, "u") | edge_mask(pl, "l"), th.plate[0])
    c.px(X + 5, Y + 4, GLINT[0]); c.px(X + 6, Y + 3, GLINT[0])
    # four cameras: bright dots at the glass corners
    for (lx, ly) in ((X + 2, Y + 2), (X + Wd - 4, Y + 2), (X + 2, Y + H - 5), (X + Wd - 4, Y + H - 5)):
        c.rect(lx, ly, 2, 2, ST[2])
        c.px(lx, ly, ST[4])
    # controller at the left
    sub = Canvas(12, 16)
    wand_icon_g2(sub, 1, 1, th)
    c.composite(sub, 1, 14, outline=S[0])
    return c


# ------------------------------------------------------------------ g3 : goggles (2027+)
def pod_g3(c, ox, oy, th, flip=False):
    """Ear pod (earbud): round head with a stem. 9 wide x 14 tall at (ox, oy)."""
    S = th.pods
    head = ellipse_mask(ox, oy, 9, 8)
    stem = poly_mask([(ox + 4, oy + 5), (ox + 8.5, oy + 5), (ox + 8.5, oy + 12), (ox + 7.5, oy + 14), (ox + 5, oy + 14), (ox + 4, oy + 12)])
    if flip:
        stem = {(2 * ox + 8 - x, y) for (x, y) in stem}
    body = head | stem
    shade_mask(c, body, S)
    # inner speaker mesh + accent ring
    c.ellipse(ox + 2, oy + 2, 5, 4, th.trim[1] if th.name != "Korall" else BLK[1])
    c.ellipse(ox + 3, oy + 3, 3, 2, th.led[3] if th.name != "Korall" else th.led[2])
    c.px(ox + 3, oy + 3, th.led[4])
    c.hline(ox + (1 if flip else 5), oy + 11, 3, S[0])
    return body


def g3_model(th):
    c = MC()
    S = th.shell
    X, Y, Wd, H, Dp = 4, 18, 36, 19, 6
    # --- right temple arm: slim, goes back and hooks down behind the ear
    arm = band([(X + Wd + k, Y + 6 - k) for k in range(0, 8)], 1.5) | band(bez((X + Wd + 7, Y - 1), (X + Wd + 11, Y - 6), (X + Wd + 14, Y - 1), (X + Wd + 10, Y + 5)), 1.5)
    # --- visor shell
    nx = X + Wd // 2 - 6
    front = rrect_mask(X, Y, Wd, H, 9) - ellipse_mask(nx, Y + H - 5, 12, 10)
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    shade_mask(c, arm - F, th.shell)
    # curved glass
    gl = rrect_mask(X + 2, Y + 3, Wd - 4, H - 7, 5) - ellipse_mask(nx - 2, Y + H - 7, 16, 12)
    c.paint(gl, th.plate[1])
    c.paint(edge_mask(gl, "u") | edge_mask(gl, "l"), th.plate[0])
    # subtle reflection: soft band + bright glint
    for i in range(8):
        if (X + 9 + i, Y + 11 - i) in gl:
            c.px(X + 9 + i, Y + 11 - i, th.plate[2])
            if (X + 10 + i, Y + 11 - i) in gl:
                c.px(X + 10 + i, Y + 11 - i, th.plate[2])
    for (gx, gy, n) in ((X + 8, Y + 11, 5), (X + 15, Y + 11, 2)):
        for i in range(n):
            if (gx + i, gy - i) in gl:
                c.px(gx + i, gy - i, GLINT[0])
    # thin glowing line along the lower glass edge
    for (x, y) in sorted(gl):
        if (x, y + 1) not in gl and y > Y + H - 9:
            c.px(x, y, th.led[3])
    # ear pods
    sub = Canvas(16, 18)
    pod_g3(sub, 2, 2, th)
    c.composite(sub, 13, 40, outline=S[0])
    sub = Canvas(16, 18)
    pod_g3(sub, 2, 2, th, flip=True)
    c.composite(sub, 25, 42, outline=S[0])
    return c


def pod_icon_g3(c, ox, oy, th, flip=False):
    """Tiny ear pod for the icon: round head 5 x 5 with a short stem, 5 wide x 8 tall."""
    S = th.pods
    head = ellipse_mask(ox, oy, 5, 5)
    stem = rect_mask(ox + 3, oy + 4, 2, 4)
    if flip:
        stem = {(2 * ox + 4 - x, y) for (x, y) in stem}
    body = head | stem
    shade_mask(c, body, S)
    c.hline(ox + 1, oy + 2, 3, th.led[3])
    return body


def g3_icon(th):
    c = IC()
    S = th.shell
    X, Y, Wd, H, Dp = 1, 9, 18, 15, 4
    nx = X + Wd // 2 - 4
    arm = band([(X + Wd + k, Y + 4 - k) for k in range(0, 4)], 1.1) | band(bez((X + Wd + 3, Y + 1), (X + Wd + 5, Y - 3), (X + Wd + 7, Y - 1), (X + Wd + 4, Y + 4)), 1.0)
    notch = ellipse_mask(nx, Y + H - 3, 8, 6)
    front = rrect_mask(X, Y, Wd, H, 6) - notch
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    c.erase(notch)
    shade_mask(c, arm - F, th.shell)
    gl = rrect_mask(X + 1, Y + 2, Wd - 2, H - 5, 4) - ellipse_mask(nx - 1, Y + H - 5, 10, 8)
    c.paint(gl, th.plate[1])
    c.paint(edge_mask(gl, "u") | edge_mask(gl, "l"), th.plate[0])
    for i in range(3):
        c.px(X + 4 + i, Y + 6 - i, GLINT[0])
    c.px(X + 9, Y + 4, th.plate[3]); c.px(X + 10, Y + 3, th.plate[3])
    for (x, y) in sorted(gl):
        if (x, y + 1) not in gl and y > Y + H - 7:
            c.px(x, y, th.led[3])
    return c


# ------------------------------------------------------------------ build
def render(fn, name, ks=(1, 2, 3), scale=8):
    imgs = []
    for k in ks:
        c = THEMES[k]
        cv = fn(c)
        im, sz = export(cv, "icon" if "icon" in fn.__name__ else "model")
        print(fn.__name__, k, "sprite", sz)
        imgs.append(im)
    W_ = sum(i.width * scale for i in imgs) + 8 * (len(imgs) + 1)
    extra = 46 if imgs[0].width == 32 else 0
    sh = Image.new("RGBA", (W_, imgs[0].height * scale + 16 + extra), NAVY)
    x = 8
    for i in imgs:
        sh.alpha_composite(up(i, scale), (x, 8))
        if extra:
            sh.alpha_composite(tile(i, ACCENT_HEX["vr"]), (x, imgs[0].height * scale + 12))
            sh.alpha_composite(up(tile(i, ACCENT_HEX["vr"]), 1), (x + 50, imgs[0].height * scale + 12))
        x += i.width * scale + 8
    p = os.path.join(HERE, "..", "prev", "vr_" + name + ".png")
    sh.save(p)
    return imgs


GENS = {}


def build(gens=None):
    d = out_dir("vr")
    for g, (mf, icf) in sorted(GENS.items()):
        if gens and g not in gens:
            continue
        for k, th in THEMES.items():
            save(export(mf(th), "model")[0], os.path.join(d, "model-g%d-s%d.png" % (g, k)))
            save(export(icf(th), "icon")[0], os.path.join(d, "icon-g%d-s%d.png" % (g, k)))
    return sheet("vr", gens=sorted(GENS), labels={1: "g1 2016-19", 2: "g2 2020-26", 3: "g3 2027+"})


GENS[1] = (g1_model, g1_icon)
GENS[2] = (g2_model, g2_icon)
GENS[3] = (g3_model, g3_icon)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("dev:"):
        _, fn, ks, sc = sys.argv[1].split(":")
        render(globals()[fn], fn, ks=tuple(int(k) for k in ks), scale=int(sc))
    else:
        want = [int(a[1:]) for a in sys.argv[1:] if a[0] == "g"]
        build(want or None)
