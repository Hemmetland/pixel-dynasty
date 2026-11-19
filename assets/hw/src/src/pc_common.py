"""pc_common: shared helpers for the PC (Forge) art: plane helpers, fans, glyphs, theme builder."""
import os
import sys
import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "lib"))
from hwlib import *  # noqa: E402,F401,F403

P = PAL
BLUE = P["pc"]
GR = P["graphite"]
INK = P["ink"]
ST = P["steel"]
GL = P["glass_dk"]
BG = P["beige"]
WH = P["white"]
GOLD = P["gold"]


# ------------------------------------------------------------------ plane helpers
# A box with front face at (X, Y, W, H) and depth d.  Side face point (k, v): k = depth 1..d, v = row 0..H-1
#   -> screen (X + W - 1 + k, Y + v - k).   Top face point (i, k): i = column 0..W-1  -> screen (X + i + k, Y - k).
def side_set(X, Y, W, ks, vs):
    return {(X + W - 1 + k, Y + v - k) for k in ks for v in vs}


def top_set(X, Y, iis, ks):
    return {(X + i + k, Y - k) for i in iis for k in ks}


def rows_of(mask):
    d = {}
    for x, y in mask:
        d.setdefault(y, []).append(x)
    return d


def sdisc(X, Y, W, kc, vc, r):
    """disc of radius r in the side plane, projected (slanted ellipse)."""
    return {(X + W - 1 + k, Y + v - k) for k in range(int(kc - r - 1), int(kc + r + 2))
            for v in range(int(vc - r - 1), int(vc + r + 2)) if (k - kc) ** 2 + (v - vc) ** 2 <= r * r + 0.2}


GLYPH = {
    "6": ["###", "#..", "###", "#.#", "###"],
    "3": ["###", "..#", "###", "..#", "###"],
    "9": ["###", "#.#", "###", "..#", "###"],
}


def glyph(c, x, y, ch, col):
    for j, r in enumerate(GLYPH[ch]):
        for i, v in enumerate(r):
            if v == "#":
                c.px(x + i, y + j, col)




def fan_pixels(dw, dh=None, n=5, hub_r=1.6, ringw=1.0, swirl=0.9, wid=0.62, rot=0.0):
    """Fan as dict {(i, j): role} in a dw x dh box (ellipse when dw != dh); role: ring hub blade_l blade_b blade_s gap."""
    dh = dh or dw
    Rx, Ry = dw / 2.0, dh / 2.0
    Rm = min(Rx, Ry)
    out = {}
    for (x, y) in ellipse_mask(0, 0, dw, dh):
        dx, dy = (x + .5 - Rx) / Rx, (y + .5 - Ry) / Ry     # normalised, ellipse -> unit circle
        r = math.hypot(dx, dy)
        if r > 1 - ringw / Rm:
            out[(x, y)] = "ring"
        elif r <= hub_r / Rm:
            out[(x, y)] = "hub"
        else:
            t = (r - hub_r / Rm) / max(.01, (1 - ringw / Rm - hub_r / Rm))
            ang = math.atan2(dy, dx) + rot - swirl * t
            u = (ang / (2 * math.pi / n)) % 1.0
            if u < wid:
                side = (dx + dy) / 1.4
                out[(x, y)] = "blade_l" if side < -0.3 else ("blade_s" if side > 0.5 else "blade_b")
            else:
                out[(x, y)] = "gap"
    return out


def draw_fan(c, x, y, dw, dh, cols, **kw):
    """Draw a fan with its top-left corner at (x, y). cols: dict role -> colour."""
    for (i, j), role in fan_pixels(dw, dh, **kw).items():
        if cols[role] is not None:
            c.px(x + i, y + j, cols[role])


def fan_cols(ring, hub, bl, bb, bs, gap):
    return dict(ring=ring, hub=hub, blade_l=bl, blade_b=bb, blade_s=bs, gap=gap)


# hand-drawn small fans: o ring, a blade, h hub, g gap (dark body)
FANS = {
    "f5": [".ooo.",
           "oggao",
           "ogHgo",
           "oaggo",
           ".ooo."],
    "f6": [".oooo.",
           "oggaao",
           "oaHHgo",
           "ogHHao",
           "oaaggo",
           ".oooo."],
    "i4": [".oo.",
           "oHHo",
           "oHHo",
           ".oo."],
    "i5": [".ooo.",
           "ogHgo",
           "oHHHo",
           "ogHgo",
           ".ooo."],
    "i6": [".oooo.",
           "oggggo",
           "ogHHgo",
           "ogHHgo",
           "oggggo",
           ".oooo."],
    "f8": ["..oooo..",
           ".oggaao.",
           "oaagaago",
           "oaahhggo",
           "oggHHaao",
           "ogaagaao",
           ".oaaggo.",
           "..oooo.."],
}


def draw_afan(c, x, y, name, ring, blade, hub, gap, blade2=None):
    """hand-drawn fan from FANS. 'a' = blade (blade2 on the lower right when given), 'H'/'h' hub."""
    for j, row in enumerate(FANS[name]):
        for i, ch in enumerate(row):
            if ch == ".":
                continue
            col = {"o": ring, "a": blade, "h": hub, "H": hub, "g": gap}[ch]
            if ch == "a" and blade2 is not None and i + j > len(row) + 1:
                col = blade2
            if col is not None:
                c.px(x + i, y + j, col)


def sfan_a(c, X, Y, W, kc, vc, name, *a, **kw):
    """hand-drawn fan, upright on screen, centred on the side-plane point (kc, vc)"""
    h = len(FANS[name])
    w = len(FANS[name][0])
    cx, cy = X + W - 1 + kc, Y + vc - kc
    draw_afan(c, cx - w // 2, cy - h // 2, name, *a, **kw)



def sprect(c, X, Y, W, k0, k1, v0, v1, col):
    """parallelogram on the side face: depth k0..k1, rows v0..v1 (inclusive)"""
    c.paint(side_set(X, Y, W, range(k0, k1 + 1), range(v0, v1 + 1)), col)


def tprect(c, X, Y, i0, i1, k0, k1, col):
    """parallelogram on the top face: columns i0..i1, depth k0..k1 (inclusive)"""
    c.paint(top_set(X, Y, range(i0, i1 + 1), range(k0, k1 + 1)), col)


def checker(c, mask, a, b):
    for (x, y) in mask:
        c.px(x, y, a if (x + y) % 2 == 0 else b)


def window(c, X, Y, W, H, Dp, S, GLS, v0=4, v1=None, k0=2, base=None, frame=None):
    """Glass window on the right face: 1 px frame in S[0], interior GLS[1]. v1 exclusive. Returns the interior mask (use merge() to clip content to it)."""
    v1 = H - 3 if v1 is None else v1
    c.paint(side_set(X, Y, W, range(k0, Dp), range(v0, v1)), frame if frame is not None else S[0])
    ks, vs = range(k0 + 1, Dp - 1), range(v0 + 1, v1 - 1)
    mask = side_set(X, Y, W, ks, vs)
    c.paint(mask, base if base is not None else GLS[1])
    return mask


def merge(c, layer, mask=None):
    """paste the opaque pixels of `layer` (a Canvas) onto c, only inside `mask` when given (clipping)"""
    for x in range(layer.w):
        for y in range(layer.h):
            p = layer.pix[x, y]
            if p[3] and (mask is None or (x, y) in mask):
                c.px(x, y, p)


def sfan(c, X, Y, W, kc, vc, dw, dh, cols, **kw):
    """fan drawn upright (screen space) centred on the side-plane point (kc, vc)"""
    cx, cy = X + W - 1 + kc, Y + vc - kc
    draw_fan(c, cx - dw // 2, cy - dh // 2, dw, dh, cols, **kw)


def mk(name, shell, trim, glow, glow2=None, **kw):
    """Standard PC theme: shell (case plastic), panel (ink), trim (accent trim), glow / glow2 (LED / fan light ramps)."""
    return Theme(name, shell=shell, panel=P["ink"], trim=trim, glow=glow, glow2=glow2 or glow, glass=P["glass_dk"],
                 metal=ST, card=P["pcb_black"], **kw)


_ALLOWED = set(ALLOW_ISOLATED)
for _r in PAL.values():
    _ALLOWED.add(_r[4])


def despeckle(c, rounds=2):
    """Replace every single pixel that has no same-coloured 8-neighbour (and is not an LED / glint / ramp highlight)
    by the most common colour among its neighbours - the same rule qa.py flags. Run on the canvas before finish()."""
    import collections
    for _ in range(rounds):
        fix = {}
        for y in range(c.h):
            for x in range(c.w):
                p = c.pix[x, y]
                if p[3] == 0 or p in _ALLOWED:
                    continue
                nb = [c.pix[x + i, y + j] for j in (-1, 0, 1) for i in (-1, 0, 1)
                      if (i or j) and 0 <= x + i < c.w and 0 <= y + j < c.h and c.pix[x + i, y + j][3] > 0]
                if not nb or p in nb:
                    continue
                fix[(x, y)] = collections.Counter(nb).most_common(1)[0][0]
        for (x, y), col in fix.items():
            c.pix[x, y] = col
    return c
