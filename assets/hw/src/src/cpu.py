"""CPU (Quark) hardware art: 4 generations x 3 styles, model 64x64 + icon 32x32.

run:  python3 src/cpu.py            -> writes out/cpu/model-gN-sS.png, icon-gN-sS.png, sheet.png
      python3 src/cpu.py g2         -> only one generation (also writes preview strips into prev/)

Geometry: every part is a "slab": a plan (set of (u, v) cells, u = along the front edge, v = depth) extruded by `hgt` px.
Plan cell (u, v) lies on screen at (x + u + v, y - v): the oblique 3/4 view of the shared catalogue (depth shifts +1 right,
-1 up per cell).  Walls hang below the top surface; raised parts are slabs drawn with y lifted by their height.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "lib"))
from hwlib import *  # noqa: E402,F401,F403

P = PAL
CER = P["beige"]
ST = P["steel"]
GD = P["gold"]
K = P["cpu"]
G = P["graphite"]

# ------------------------------------------------------------------ themes
# roles: ceramic (g1 package), lid (g1 lid / g2-g4 spreader), sub (g2 substrate), sub2 (g3/g4 darker substrate),
#        ihs (heat spreader), ihs2 (second spreader tone family for g4 frame), trim (accent marking), ink (engraving),
#        cap (capacitors), glow (g4 traces / die glow), win (g4 window glass)
THEMES = {
    1: Theme("Silver", ceramic=CER, lid=ST, sub=P["sub_green"], sub2=P["sub_deep"], ihs=ST, trim=K, ink=ST,
             cap=CER, glow=K, win=P["glass"], die=ST),
    2: Theme("Mörk", ceramic=G, lid=P["graphite_pad"], sub=P["pcb_black"], sub2=P["ink"], ihs=P["graphite_lt"], trim=K,
             ink=G, cap=ST, glow=K, win=P["glass_dk"], die=P["graphite_pad"]),
    3: Theme("Rosa", ceramic=Ramp([P["rose"][1], K[0], K[1], K[2], K[3]]), lid=P["white"], sub=P["rose"], sub2=P["rose"], ihs=K, trim=G, ink=G,
             cap=G, glow=G, win=P["glass"], die=ST),
}


# ------------------------------------------------------------------ slab machinery
def slab(c, plan, x, y, hgt, top, front, side, hi=None, lo=True, edge2=None):
    """Extrude a plan by hgt px. top/front/side are colours. hi = colour of the lit top edges (front + left edge of the
    top surface). lo=True darkens the lowest wall row by one tone (given as colours via lo=(front_lo, side_lo)).
    Returns dict(top=set, front=set, side=set) of screen pixels."""
    tops = {(x + u + v, y - v) for (u, v) in plan}
    walls = {}
    for (u, v) in sorted(plan, key=lambda p: -p[1]):
        ft = (u, v - 1) not in plan
        st = (u + 1, v) not in plan
        for k in range(1, hgt + 1):
            p = (x + u + v, y - v + k)
            if p in tops:
                continue
            walls[p] = "f" if (ft or not st) else "s"
    fr = {p for p, t in walls.items() if t == "f"}
    sd = {p for p, t in walls.items() if t == "s"}
    c.paint(fr, front)
    c.paint(sd, side)
    if lo and lo is not True:
        for p in fr | sd:
            if (p[0], p[1] + 1) not in walls and (p[0], p[1] + 1) not in tops:
                c.px(p[0], p[1], lo[0] if p in fr else lo[1])
    c.paint(tops, top)
    if edge2 is not None:
        e = {(x + u + v, y - v) for (u, v) in plan if (u + 1, v) not in plan or (u, v + 1) not in plan}
        c.paint(e, edge2)
    if hi is not None:
        e = {(x + u + v, y - v) for (u, v) in plan if (u, v - 1) not in plan or (u - 1, v) not in plan}
        c.paint(e, hi)
    return {"top": tops, "front": fr, "side": sd}


def at(x, y, u, v):
    """screen position of plan cell (u, v)"""
    return (x + u + v, y - v)


def pp(c, x, y, u, v, col):
    c.px(x + u + v, y - v, col)


def pline(c, x, y, u, v, n, col):
    """n cells along u at depth v"""
    for i in range(n):
        pp(c, x, y, u + i, v, col)


def pbits(c, x, y, u, v, bits, col):
    for i, ch in enumerate(bits):
        if ch == "#":
            pp(c, x, y, u + i, v, col)


def pcells(c, x, y, cells, col):
    for (u, v) in cells:
        pp(c, x, y, u, v, col)


def prect(c, x, y, u, v, w, d, col):
    for j in range(d):
        for i in range(w):
            pp(c, x, y, u + i, v + j, col)


def sub_mask(a, *others):
    m = set(a)
    for o in others:
        m -= set(o)
    return m


def notch_rect(u, v, w, d, nw, nd, corners="flrb"):
    """rect plan with rect notches nw x nd at corners: f=front-left, r=front-right, l=back-left, b=back-right"""
    m = rect_mask(u, v, w, d)
    if "f" in corners:
        m -= rect_mask(u, v, nw, nd)
    if "r" in corners:
        m -= rect_mask(u + w - nw, v, nw, nd)
    if "l" in corners:
        m -= rect_mask(u, v + d - nd, nw, nd)
    if "b" in corners:
        m -= rect_mask(u + w - nw, v + d - nd, nw, nd)
    return m


def caps(c, x, y, cells, th, horiz=True):
    """SMD capacitors (2 x 1 cells): tan body + dark end"""
    for (u, v) in cells:
        pp(c, x, y, u, v, th.cap[3])
        pp(c, x, y, u + 1, v, th.cap[1])


# ------------------------------------------------------------------ more helpers
def rs(c, plan, x, y, hgt, R, hi=True, edge2=True, lo=0):
    """slab shaded from one 5-tone ramp: top R[3], front R[2], side R[1], bottom row R[lo], lit edges R[4]"""
    return slab(c, plan, x, y, hgt, R[3], R[2], R[1], hi=R[4] if hi else None, lo=(R[lo], R[lo]),
                edge2=R[2] if edge2 else None)


def scoop_rect(u, v, w, d, r):
    """rect plan with a concave quarter-circle scooped out of every corner (rounded notches)."""
    m = rect_mask(u, v, w, d)
    for cu, cv in ((u, v), (u + w, v), (u, v + d), (u + w, v + d)):
        for i in range(-r, r):
            for j in range(-r, r):
                if (i + 0.5) ** 2 + (j + 0.5) ** 2 <= r * r - 0.5:
                    m.discard((cu + i, cv + j))
    return m


def bevel_bl(m, u0, v1, n):
    """cut the back-left corner of plan m (corner cell (u0, v1-1)) by an n-cell triangle"""
    for i in range(n):
        for j in range(n - i):
            m.discard((u0 + i, v1 - 1 - j))
    return m


def pins_front(c, x, y0, us, ln, w=2):
    """front pin row hanging under the package: w px wide at screen columns x+u, starting at row y0, length ln"""
    g = GD
    for u in us:
        for i in range(w):
            for k in range(ln):
                if w == 1:
                    col = g[2]
                else:
                    col = g[3] if i == 0 else g[2]
                if k == 0 or k == ln - 1:
                    col = g[1]
                c.px(x + u + i, y0 + k, col)


def pins_side(c, x, y, vs, y0, ln, W_):
    """right pin row: 1 px wide lines under the right wall, one per depth cell in vs"""
    g = GD
    for v in vs:
        for k in range(ln):
            c.px(x + W_ - 1 + v, y0 - v + k, g[1])


def caps(c, x, y, cells, th):
    """SMD capacitors, 2 x 1 cells, one tone"""
    for (u, v) in cells:
        pp(c, x, y, u, v, th.cap[2])
        pp(c, x, y, u + 1, v, th.cap[2])


def logo_ring(c, x, y, u, v, w, d, col, core=None):
    """ring mark in plan coordinates (w x d cells) with an optional core dot"""
    for j in range(d):
        for i in range(w):
            if i in (0, w - 1) or j in (0, d - 1):
                if (i in (0, w - 1)) and (j in (0, d - 1)):
                    continue
                pp(c, x, y, u + i, v + j, col)
    if core is not None:
        pp(c, x, y, u + w // 2, v + d // 2, core)


def ring_e(c, cx, cy, w, h, col, core=None, hi=None):
    """axis-aligned ellipse ring (the catalogue draws round things as ellipses) centred on screen (cx, cy)"""
    m = ellipse_mask(cx - w // 2, cy - h // 2, w, h)
    c.paint(edge_mask(m, "udlr"), col)
    if hi is not None:
        c.px(cx - w // 2 + 1, cy - h // 2 + 1, hi)
    if core is not None:
        c.px(cx, cy, core)
    return m


FONT = {
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "9": ["###", "#.#", "###", "..#", "###"],
    "7": ["###", "..#", ".#.", ".#.", ".#."],
    "5": ["###", "#..", "###", "..#", "###"],
}


def glyphs(c, x, y, u, v, text, col, shadow=None, shear=1.0):
    """embossed digits in plan coordinates: 3 x 5 cells per glyph, top of the glyph at the highest v"""
    for gi, ch in enumerate(text):
        rows = FONT[ch]
        for gy, row in enumerate(rows):
            for gx, bit in enumerate(row):
                if bit == "#":
                    uu, vv = u + gi * 4 + gx, v + (4 - gy)
                    sx = x + uu + int(vv * shear)
                    if shadow is not None:
                        c.px(sx + 1, y - vv + 1, shadow)
                    c.px(sx, y - vv, col)


# ------------------------------------------------------------------ g1 : ceramic PGA (until 2004)
def g1_model(th):
    c = Canvas(64, 64)
    X, Y = 5, 36
    W_, D_ = 32, 21
    CE = th.ceramic
    pins_front(c, X, Y + 4, range(2, W_ - 1, 3), 7)
    pins_side(c, X, Y, range(1, D_ - 1, 2), Y + 4, 7, W_)
    rs(c, bevel_bl(rect_mask(0, 0, W_, D_), 0, D_, 4), X, Y, 3, CE)
    rs(c, bevel_bl(rect_mask(2, 2, W_ - 4, D_ - 6), 2, D_ - 4, 3), X, Y - 2, 2, CE, lo=1)
    # pin-1 marker on the upper layer
    pcells(c, X, Y - 2, [(3, 13), (3, 12), (4, 13), (3, 11)], GD[2])
    L = th.lid
    rs(c, rect_mask(7, 4, 19, 12), X, Y - 4, 2, L)
    Yl = Y - 4
    ink = th.ink[1]
    pbits(c, X, Yl, 10, 13, "####.##.####", ink)
    pbits(c, X, Yl, 10, 11, "###.####.##", ink)
    pbits(c, X, Yl, 10, 9, "##.##.###", ink)
    pbits(c, X, Yl, 10, 7, "#######", th.trim[2])
    return c


def g1_icon(th):
    c = Canvas(32, 32)
    X, Y = 4, 13
    W_, D_ = 14, 11
    CE = th.ceramic
    pins_front(c, X, Y + 4, range(1, W_ - 1, 2), 4, w=1)
    pins_side(c, X, Y, range(1, D_ - 1, 2), Y + 4, 3, W_)
    plan = rect_mask(0, 0, W_, D_)
    for (u, v) in ((0, D_ - 1), (1, D_ - 1), (0, D_ - 2)):
        plan.discard((u, v))
    rs(c, plan, X, Y, 3, CE)
    pcells(c, X, Y, [(1, D_ - 3), (1, D_ - 4)], GD[2])
    L = th.lid
    rs(c, rect_mask(3, 3, 9, 6), X, Y - 1, 1, L)
    pbits(c, X, Y - 1, 5, 7, "####.#", th.ink[1])
    pbits(c, X, Y - 1, 5, 5, "###", th.trim[2])
    return c


# ------------------------------------------------------------------ g2 : heat spreader (2005-2013)
def g2_model(th):
    c = Canvas(64, 64)
    X, Y = 4, 47
    W_, D_, H_ = 28, 26, 4
    S = th.sub
    rs(c, rect_mask(0, 0, W_, D_), X, Y, H_, S)
    gd = GD
    for u in range(2, W_ - 1, 3):
        for yy in (Y + 2, Y + 3):
            c.px(X + u, yy, gd[2])
            c.px(X + u + 1, yy, gd[1])
    for v in range(2, D_ - 2, 3):
        for yy in (Y - v + 2, Y - v + 3):
            c.px(X + W_ - 1 + v, yy, gd[1])
    caps(c, X, Y, [(5, 2), (9, 2), (17, 2), (21, 2)], th)
    caps(c, X, Y, [(0, 7), (0, 11)], th)
    HI = 4
    I = th.ihs
    rs(c, notch_rect(6, 4, 20, 19, 3, 3), X, Y - HI, HI, I)
    Yi = Y - HI
    ink = th.ink[1]
    pbits(c, X, Yi, 9, 17, "#####.####", ink)
    pbits(c, X, Yi, 9, 14, "###.#####", ink)
    pbits(c, X, Yi, 9, 11, "####.##.##", ink)
    pbits(c, X, Yi, 9, 8, "##.####", ink)
    sx, sy = at(X, Yi, 20, 11)
    ring_e(c, sx, sy, 7, 5, th.trim[2], core=th.trim[4])
    return c


def g2_icon(th):
    c = Canvas(32, 32)
    X, Y = 4, 21
    W_, D_, H_ = 13, 12, 4
    S = th.sub
    rs(c, rect_mask(0, 0, W_, D_), X, Y, H_, S)
    for u in range(1, W_ - 1, 3):
        for yy in (Y + 2, Y + 3):
            c.px(X + u, yy, GD[2])
            c.px(X + u + 1, yy, GD[1])
    caps(c, X, Y, [(3, 1), (8, 1)], th)
    plan = notch_rect(4, 3, 8, 8, 1, 1)
    rs(c, plan, X, Y - 2, 2, th.ihs)
    pbits(c, X, Y - 2, 6, 9, "####", th.ink[1])
    pbits(c, X, Y - 2, 6, 7, "###.", th.ink[1])
    prect(c, X, Y - 2, 6, 5, 4, 1, th.trim[2])
    return c


# ------------------------------------------------------------------ g3 : big IHS (2014-2021)
def g3_model(th):
    c = Canvas(64, 64)
    X, Y = 4, 47
    W_, D_, H_ = 31, 22, 4
    S = th.sub2
    rs(c, rect_mask(0, 0, W_, D_), X, Y, H_, S)
    for u in range(0, W_):
        c.px(X + u, Y + 2, th.trim[2])
    caps(c, X, Y, [(0, 5), (0, 8), (0, 11)], th)
    caps(c, X, Y, [(27, 1), (24, 1)], th)
    HI = 5
    I = th.ihs
    plan = scoop_rect(8, 3, 21, 14, 3)
    rs(c, plan, X, Y - HI, HI, I)
    Yi = Y - HI
    ink = th.ink[1]
    # polished top: a darker reflection band with a bright edge
    for v in range(3, 16):
        for u in (11, 12):
            if ((u, v) in plan):
                pp(c, X, Yi, u, v, I[2])
        if (13, v) in plan:
            pp(c, X, Yi, 13, v, I[4])
    pbits(c, X, Yi, 16, 12, "####.##.##", ink)
    pbits(c, X, Yi, 16, 10, "##.###", ink)
    pbits(c, X, Yi, 15, 6, "####", th.trim[2])
    sx, sy = at(X, Yi, 24, 6)
    ring_e(c, sx, sy, 8, 5, th.trim[2], core=th.trim[4], hi=th.trim[4])
    return c


def g3_icon(th):
    c = Canvas(32, 32)
    X, Y = 3, 22
    W_, D_, H_ = 17, 9, 5
    S = th.sub2
    rs(c, rect_mask(0, 0, W_, D_), X, Y, H_, S)
    for u in range(0, W_):
        c.px(X + u, Y + 3, th.trim[2])
    I = th.ihs
    plan = scoop_rect(4, 2, 12, 7, 2)
    rs(c, plan, X, Y - 3, 3, I)
    for v in range(3, 9):
        if (6, v) in plan:
            pp(c, X, Y - 3, 6, v, I[2])
        if (7, v) in plan:
            pp(c, X, Y - 3, 7, v, I[4])
    pbits(c, X, Y - 3, 10, 7, "####", th.ink[1])
    pbits(c, X, Y - 3, 10, 5, "###", th.trim[2])
    return c


# ------------------------------------------------------------------ g4 : chiplet (2022+)
def g4_model(th):
    c = Canvas(64, 64)
    X, Y = 4, 47
    W_, D_, H_ = 36, 17, 4
    S = th.sub2
    rs(c, rect_mask(0, 0, W_, D_), X, Y, H_, S)
    # gold pad field along the front border (two staggered rows) and the right border
    for u in range(3, W_ - 3):
        for v in (0, 1):
            pp(c, X, Y, u, v, GD[2] if (u + 2 * v) % 2 == 0 else GD[1])
    for v in range(2, D_ - 2):
        if v % 3:
            pp(c, X, Y, W_ - 2, v, GD[1])
            pp(c, X, Y, W_ - 1, v, GD[0])
    # pink traces on the left border
    for v in range(3, 14):
        pp(c, X, Y, 0, v, th.glow[2])
    for v in range(5, 12):
        pp(c, X, Y, 2, v, th.glow[1])
    HI = 3
    I = th.ihs
    rs(c, rect_mask(6, 2, 28, 12), X, Y - HI, HI, I)
    Yi = Y - HI
    Wn = th.win
    wu, wv, ww, wd = 8, 4, 17, 9
    prect(c, X, Yi, wu, wv, ww, wd, Wn[1])
    # inner walls of the cut-out: back row and left column
    prect(c, X, Yi, wu, wv + wd - 1, ww, 1, Wn[0])
    prect(c, X, Yi, wu, wv, 1, wd, Wn[0])
    # four chiplets (2 x 2) with a pink interconnect between them
    for (du, dv) in ((10, 5), (17, 5), (10, 9), (17, 9)):
        prect(c, X, Yi, du, dv, 6, 3, th.die[1])
        prect(c, X, Yi, du, dv + 2, 6, 1, th.die[2])
        pp(c, X, Yi, du, dv + 2, th.die[4])
        pp(c, X, Yi, du + 1, dv + 2, th.die[4])
    prect(c, X, Yi, 9, 8, 15, 1, th.glow[2])
    glyphs(c, X + 6, Yi, 26, 4, "47", I[1], shear=0.0)
    return c


def g4_icon(th):
    c = Canvas(32, 32)
    X, Y = 3, 20
    W_, D_, H_ = 19, 7, 3
    S = th.sub2
    rs(c, rect_mask(0, 0, W_, D_), X, Y, H_, S)
    for u in range(2, W_ - 2):
        for v in (0, 1):
            pp(c, X, Y, u, v, GD[2] if (u + 2 * v) % 2 == 0 else GD[1])
    I = th.ihs
    rs(c, rect_mask(4, 2, 13, 5), X, Y - 2, 2, I)
    Yi = Y - 2
    prect(c, X, Yi, 6, 3, 9, 3, th.win[1])
    for (du, dv) in ((7, 3), (11, 3), (7, 5), (11, 5)):
        prect(c, X, Yi, du, dv, 3, 1, th.die[2])
    prect(c, X, Yi, 7, 4, 7, 1, th.glow[2])
    return c


ALLOWED = set(ALLOW_ISOLATED)
for _r in PAL.values():
    ALLOWED.add(_r[4])


def despeckle(c):
    """recolour stray 1 px specks (no 8-neighbour of the same colour) with the majority colour of their 4-neighbours;
    deliberate single pixels (LED / glint / highlight tones) are left alone"""
    changed = True
    while changed:
        changed = False
        for y in range(c.h):
            for x in range(c.w):
                col = c.pix[x, y]
                if col[3] == 0 or col in ALLOWED:
                    continue
                n8 = [c.get(x + i, y + j) for j in (-1, 0, 1) for i in (-1, 0, 1) if i or j]
                if col in n8:
                    continue
                n4 = [q for q in (c.get(x + 1, y), c.get(x - 1, y), c.get(x, y + 1), c.get(x, y - 1)) if q[3]]
                if not n4:
                    continue
                best = max(set(n4), key=n4.count)
                c.pix[x, y] = best
                changed = True


def wrap(fn):
    def w(th):
        c = fn(th)
        despeckle(c)
        return c
    return w


GENS = {}


def build(gens=None):
    d = out_dir("cpu")
    for g, (mf, icf) in sorted(GENS.items()):
        if gens and g not in gens:
            continue
        for k, th in THEMES.items():
            save(place(finish(mf(th)), "model"), os.path.join(d, "model-g%d-s%d.png" % (g, k)))
            save(place(finish(icf(th)), "icon"), os.path.join(d, "icon-g%d-s%d.png" % (g, k)))
    return sheet("cpu", gens=sorted(GENS), labels={1: "g1 -2004", 2: "g2 2005-13", 3: "g3 2014-21", 4: "g4 2022+"})


def preview(fn, name, scale=8):
    imgs = []
    for k in (1, 2, 3):
        c = fn(THEMES[k])
        despeckle(c)
        imgs.append(place(finish(c), "icon" if c.w == 32 else "model"))
    bb = [bbox(i) for i in imgs]
    y0 = max(0, min(b[1] for b in bb) - 3)
    y1 = min(imgs[0].height, max(b[3] for b in bb) + 3)
    imgs = [i.crop((0, y0, i.width, y1)) for i in imgs]
    W_ = sum(i.width * scale for i in imgs) + 8 * (len(imgs) + 1)
    sh = Image.new("RGBA", (W_, imgs[0].height * scale + 16), NAVY)
    x = 8
    for i in imgs:
        sh.alpha_composite(up(i, scale), (x, 8))
        x += i.width * scale + 8
    sh.save(os.path.join(HERE, "..", "prev", "cpu_" + name + ".png"))
    return imgs


GENS[1] = (wrap(g1_model), wrap(g1_icon))
GENS[2] = (wrap(g2_model), wrap(g2_icon))
GENS[3] = (wrap(g3_model), wrap(g3_icon))
GENS[4] = (wrap(g4_model), wrap(g4_icon))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("dev:"):
        _, fn, sc = sys.argv[1].split(":")
        preview(globals()[fn], fn, int(sc))
    else:
        want = [int(a[1:]) for a in sys.argv[1:] if a[0] == "g"]
        build(want or None)
