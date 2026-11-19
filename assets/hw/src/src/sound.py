"""Sound card (Sonora) hardware art: 3 generations x 3 styles, model 64x64 + icon 32x32.

g1 ISA (until 1995), g2 PCI (1996-2002), g3 premium PCIe (2003+).
run:  python3 src/sound.py                -> writes out/sound/model-gN-sS.png, icon-gN-sS.png, sheet.png
      python3 src/sound.py g2             -> only one generation
      python3 src/sound.py dev:g1_model:123:8   -> preview strip in prev/
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "lib"))
from hwlib import *  # noqa: E402,F401,F403

P = PAL
if "pcb_brown" not in P:  # guard: the central palette normally has it
    P["pcb_brown"] = Ramp(["#3a2418", "#5e3b24", "#8a5230", "#b0713f", "#d99a5b"])
AMB = P["sound"]
ST = P["steel"]
GO = P["gold"]
BK = P["pcb_black"]
GR = P["graphite"]
GL = P["graphite_lt"]
LA = P["led_amber"]


# ------------------------------------------------------------------ themes
# roles: pcb (board: 0 dark/trace-shadow, 1 side, 2 front, 3 top/trace, 4 rim), chip (IC plastic: 0 low,1 shade,2 body,3 top,4 mark),
#        lid (big chip / EMI shield metal), can (electrolytic sleeve), cap (SMD caps), stick (sticker), knob (wheel plastic),
#        glow (accent glow ramp), jackb (pcb-blue jack tone is fixed per g2)
def _ramp(*c):
    return Ramp(list(c))


def _green(gen=1):
    p = P["pcb_green"]
    if gen == 3:  # deep green, premium
        return _ramp(OUTLINE, OUTLINE, p[0], p[1], p[2])
    return _ramp(p[0], p[0], p[1], p[2], p[3])


def _black(gen=1):
    p = P["pcb_black"]
    return _ramp(p[0], p[0], p[1], p[3], p[4])


def _blue(gen=1):
    p = P["pcb_blue"]
    pc = P["pc"]
    if gen == 3:
        return _ramp(OUTLINE, p[0], pc[0], pc[1], pc[2])
    return _ramp(p[0], pc[0], pc[1], pc[2], pc[3])


def _brown(gen=1):
    p = P["pcb_brown"]
    return _ramp(p[1], p[2], p[3], p[4], p[4])


def mk(name, pcb, chip, lid, can, stick, trace=None, knob=GL, brk=ST):
    return Theme(name, pcb=pcb, chip=chip, lid=lid, can=can, cap=can, stick=stick, knob=knob, glow=AMB, brk=brk,
                 trace=trace if trace is not None else pcb[3])


THEMES = {
    1: {
        1: mk("Classic", _green(), BK, BK, AMB, AMB),
        2: mk("Night", _black(), GR, GR, AMB, AMB, trace=AMB[0], brk=GL),
        3: mk("Walnut", _brown(), P["glass"], P["glass"], P["pcb_blue"], P["pcb_blue"], brk=P["white"]),
    },
    2: {
        1: mk("Classic", _green(2), BK, BK, AMB, AMB),
        2: mk("Night", _black(2), GR, GR, AMB, AMB, trace=AMB[0], brk=GL),
        3: mk("Azure", _blue(2), BK, BK, AMB, ST),
    },
    3: {
        1: mk("Classic", _green(3), BK, ST, AMB, AMB),
        2: mk("Night", _black(3), GR, GL, AMB, AMB, trace=AMB[0], brk=GL),
        3: mk("Azure", _blue(3), BK, P["white"], AMB, AMB),
    },
}


# ------------------------------------------------------------------ shared parts
def poly_line(c, pts, col):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        c.line(x0, y0, x1, y1, col)


def shade_under(c, mask, col, onto, tones):
    """1 px cast shadow of a part (light from the top left -> shadow falls down/right) only onto `onto` pixels."""
    for (x, y) in shift(mask, 1, 1) - mask:
        if (x, y) in onto and c.get(x, y) in tones:
            c.px(x, y, col)


def dip(c, x, y, w, th, h=4, pins=True):
    """DIP chip: body w x h with lit top edge, darker right/bottom edge, pin-1 notch dot and a pin strip below."""
    C = th.chip
    c.rect(x, y, w, h, C[2])
    c.hline(x, y, w, C[3])
    c.vline(x + w - 1, y + 1, h - 1, C[1])
    c.hline(x + 1, y + h - 1, w - 1, C[1])
    c.hline(x + 1, y + 1, 2, C[1])  # pin-1 mark (2 px so it never stands alone)
    if pins:
        c.hline(x, y + h, w, ST[0])
    return rect_mask(x, y, w, h + (1 if pins else 0))


def qfp(c, x, y, s, th, label=True, ring=True):
    """Square flat-pack main chip s x s (body) with a dark pin ring and lighter pin pairs."""
    C = th.chip
    if ring:
        rm = rect_mask(x - 1, y - 1, s + 2, s + 2)
        c.paint(rm, C[1])
        for o in range(1, s - 1, 4):
            for (px_, py_) in ((x + o, y - 1), (x + o + 1, y - 1), (x + o, y + s), (x + o + 1, y + s),
                               (x - 1, y + o), (x - 1, y + o + 1), (x + s, y + o), (x + s, y + o + 1)):
                c.px(px_, py_, ST[0])
    c.rect(x, y, s, s, C[2])
    c.hline(x, y, s, C[3])
    c.vline(x, y + 1, s - 1, C[3])
    c.vline(x + s - 1, y + 1, s - 1, C[1])
    c.hline(x + 1, y + s - 1, s - 2, C[1])
    c.hline(x + 2, y + 2, 2, C[1])
    c.px(x + 2, y + 3, C[1])
    if label:
        c.hline(x + 3, y + s - 5, s - 6, C[4])
        c.hline(x + 3, y + s - 3, s - 8, C[4])


def can(c, x, y, D, h, th, onto=None, silver=True):
    """Electrolytic can standing towards the viewer: silver end face (ellipse D x D), sleeve extruded h px up/right."""
    face = ellipse_mask(x, y, D, D)
    sleeve = set()
    for k in range(1, h + 1):
        sleeve |= shift(face, k, -k)
    sleeve -= face
    S = th.can
    if onto is not None:
        shade_under(c, face | sleeve, th.pcb[0], onto, {rgba(th.pcb[2]), rgba(th.trace)})
    c.paint(sleeve, S[2])
    cx = x + D / 2.0
    c.paint({p for p in sleeve if p[0] + 0.5 - cx > D * 0.22 and p[1] > y - h + 1}, S[1])
    c.paint({p for p in sleeve if (p[0] - 1, p[1] + 1) not in face and (p[0] - 1, p[1] + 1) not in sleeve}, S[3])
    F = ST if silver else S  # icons: the end face takes the sleeve colour so the can stays one amber/blue object
    c.paint(face, F[2] if silver else S[3])
    c.paint(edge_mask(face, "udlr"), F[1])
    c.paint({p for p in edge_mask(face, "ul") if p[0] < x + D * 0.6 and p[1] < y + D * 0.6}, F[3] if silver else S[4])
    # score mark
    cx_, cy_ = x + D // 2, y + D // 2
    if D >= 7:
        c.px(cx_, cy_, ST[0])
        c.px(cx_ - 1, cy_, ST[0]); c.px(cx_ + 1, cy_, ST[0]); c.px(cx_, cy_ - 1, ST[0]); c.px(cx_, cy_ + 1, ST[0])
    elif D == 6:
        c.hline(cx_ - 1, cy_, 2, ST[0])
    return face | sleeve


def gold_strip(c, x, y, w, h):
    """Edge-connector fingers: vertical stripes (pairs when only 2 px tall), lit top row."""
    for i in range(w):
        if h >= 3:
            col = GO[2] if i % 2 == 0 else GO[1]
        else:
            col = GO[2] if min(i // 2, max(w // 2 - 1, 0)) % 2 == 0 else GO[1]
        c.vline(x + i, y, h, col)
    c.hline(x, y, w, GO[3])


def jumper(c, x, y, th):
    """Jumper block: black cap 4 x 2 on gold pins (2 px bar above)."""
    c.hline(x, y, 4, GO[2])
    c.rect(x, y + 1, 4, 2, th.chip[0])
    c.hline(x, y + 1, 4, th.chip[2])


def led2(c, x, y, w=1):
    """amber LED: pale core (marked tone, may stand alone) + darker 1 px halo."""
    for j in range(-1, 2):
        for i in range(-1, w + 1):
            if (i in (-1, w)) and j != 0:
                continue
            c.px(x + i, y + j, AMB[1])
    c.rect(x, y, w, 1, AMB[4])


def smd(c, x, y, w, h, th):
    """SMD capacitor/resistor: body + 1 px darker right end (+ lit top edge when wide enough)."""
    S = th.cap
    c.rect(x, y, w, h, S[2])
    if w >= 3:
        c.hline(x, y, w, S[3])
    c.vline(x + w - 1, y, h, S[1])


def sticker(c, x, y, w, h, th, lines=2):
    S = th.stick
    c.rect(x, y, w, h, S[2])
    c.hline(x, y, w, S[3])
    c.vline(x, y, h, S[3])
    c.hline(x + 1, y + h - 1, w - 1, S[1])
    c.vline(x + w - 1, y + 1, h - 1, S[1])
    for i in range(lines):
        c.hline(x + 2, y + 2 + 2 * i, w - 5 - (i % 2) * 2, S[0])


class Bracket:
    """Metal slot bracket: thin front edge + wide side plate (depth d) that carries the jacks. Parts are placed in
    plate coordinates (k = depth column 1..d, v = height from the front top) and sheared like the box side face."""

    def __init__(self, c, x, y, h, d, th, wf=2, lo=True):
        self.c, self.x, self.y, self.h, self.d, self.wf = c, x, y, h, d, wf
        R = self.R = th.brk
        self.geo = c.box(x, y, wf, h, d, R[3], R[2], R[1], hi=R[3], lo=R[0] if lo else None)

    def xy(self, k, v):
        return (self.x + self.wf - 1 + k, self.y + v - k)

    def mask(self, kv):
        return {self.xy(k, v) for (k, v) in kv}

    def blk(self, k, v, w, h, col):
        """w x h screen-space rectangle whose top-left sits on plate coordinate (k, v) (a flat decal on the plate)."""
        x0, y0 = self.xy(k, v)
        self.c.rect(x0, y0, w, h, col)

    def jack(self, k, v, r, hole, ring, hi=None, lo=None):
        """round jack drawn in screen space (a clean circle), centred on plate coordinate (k, v)."""
        cx, cy = self.xy(k, v)
        d = int(2 * r)
        ox, oy = cx - d // 2, cy - d // 2
        circ = ellipse_mask(ox, oy, d, d)
        self.c.paint(circ, ring)
        hm = ellipse_mask(ox + 1, oy + 1, d - 2, d - 2)
        self.c.paint(hm, hole)
        if lo is not None:
            self.c.paint({p for p in circ if p not in hm and p[0] + p[1] >= ox + oy + d}, lo)
        if hi is not None:
            self.c.px(ox + 1, oy, hi)
            self.c.px(ox, oy + 1, hi)
        return circ



NOTE7 = [  # 8 x 7 beamed double note
    "...#####",
    "..######",
    "..#...#.",
    "..#...#.",
    "..#...#.",
    "###.###.",
    "###.###.",
]
NOTE5 = [  # 5 x 5 beamed double note for the icons
    ".####",
    ".#..#",
    ".#..#",
    "##.##",
    "##.##",
]


def glyph(c, rows, x, y, col, ch="#"):
    for j, r in enumerate(rows):
        for i, v in enumerate(r):
            if v == ch:
                c.px(x + i, y + j, col)


def header(c, x, y, n, th):
    """Pale n-pin header (CD-in / aux): body 2n+1 wide, 4 tall, dark pin holes."""
    w = 2 * n + 1
    c.rect(x, y, w, 4, ST[2])
    c.hline(x, y, w, ST[3])
    c.hline(x, y + 3, w, ST[1])
    c.vline(x + w - 1, y + 1, 3, ST[1])
    for i in range(n):
        c.rect(x + 1 + 2 * i, y + 1, 1, 2, BK[0])
    return rect_mask(x, y, w, 4)


def crystal(c, x, y, w):
    """Metal crystal can lying on the board: pill 3 tall."""
    m = rrect_mask(x, y, w, 4, 2)
    c.paint(m, ST[2])
    c.hline(x + 1, y, w - 2, ST[3])
    c.hline(x + 1, y + 3, w - 2, ST[0])
    c.vline(x + w - 1, y + 1, 2, ST[1])
    return m


JACK_G = P["led_green"]
JACK_B = P["led_blue"]
JACK_P = P["led_violet"]


# ------------------------------------------------------------------ g1 : ISA (long board, DIP forest, DB15)
def g1_model(th):
    c = Canvas(64, 64)
    B = th.pcb
    X, Y, W, H = 4, 22, 40, 26
    tab = 4
    board = rect_mask(X, Y, W, H) | rect_mask(X + 4, Y + H, 15, tab) | rect_mask(X + 23, Y + H, W - 4 - 23 + 0, tab)
    geo = c.solid(board, 2, B[3], B[2], B[1], hi=B[4], lo=B[0])
    front = geo["front"]
    c.paint({p for p in geo["side"] if p[1] >= Y + H and p[0] < X + W}, OUTLINE)
    L = lambda u, v: (X + u, Y + v)  # noqa: E731
    # traces (lighter copper lines)
    t = th.trace
    poly_line(c, [L(12, 5), L(13, 5), L(13, 8)], t)
    poly_line(c, [L(23, 5), L(24, 5), L(24, 9)], t)
    poly_line(c, [L(26, 12), L(27, 12), L(27, 15), L(29, 15)], t)
    poly_line(c, [L(11, 14), L(12, 14)], t)
    poly_line(c, [L(11, 18), L(13, 18), L(13, 21)], t)
    poly_line(c, [L(26, 18), L(29, 18), L(29, 21)], t)
    poly_line(c, [L(8, 9), L(8, 10)], t)
    # gold fingers
    gold_strip(c, X + 4, Y + H, 15, tab)
    gold_strip(c, X + 23, Y + H, W - 27, tab)
    # chips and parts
    dip(c, *L(3, 2), 9, th)
    dip(c, *L(14, 2), 9, th)
    dip(c, *L(3, 21), 9, th)
    dip(c, *L(14, 22), 10, th)
    dip(c, *L(26, 22), 6, th)
    qfp(c, *L(15, 9), 10, th)
    # ROM chip with the amber sticker
    c.rect(X + 28, Y + 5, 10, 8, th.chip[2])
    c.hline(X + 28, Y + 5, 10, th.chip[3])
    c.vline(X + 37, Y + 6, 7, th.chip[1])
    c.hline(X + 29, Y + 12, 8, th.chip[1])
    sticker(c, X + 29, Y + 6, 7, 5, th)
    jumper(c, *L(28, 15), th)
    jumper(c, *L(34, 15), th)
    smd(c, *L(26, 3), 2, 2, th)
    smd(c, *L(26, 6), 2, 2, th)
    can(c, X + 3, Y + 11, 8, 3, th, onto=front)
    can(c, X + 31, Y + 18, 6, 2, th, onto=front)
    # volume wheel (thumb wheel seen edge-on) poking out of the top edge
    wx, wy = X + 21, Y - 5
    wheel = rrect_mask(wx, wy, 7, 10, 3)
    K = th.knob
    sub = Canvas(64, 64)
    sub.paint(wheel, K[2])
    for j in range(wy + 1, wy + 10, 2):
        sub.hline(wx + 1, j, 6, K[1])
    sub.paint({p for p in edge_mask(wheel, "l") if p[1] > wy + 1}, K[3])
    sub.hline(wx + 2, wy, 3, K[3])
    c.composite(sub, 0, 0, outline=B[0])
    # bracket
    XB, YB, HB, D = X + W, Y - 3, H + tab + 3, 9
    br = Bracket(c, XB, YB, HB, D, th)
    br.jack(5, 6, 2.5, BK[0], th.brk[3])
    br.jack(5, 13, 2.5, BK[0], th.brk[3])
    # DB15 joystick / MIDI port: flange, dark opening, two rows of pin dots
    kv = {(k, v) for k in range(2, 8) for v in range(18, 30)}
    c.paint(br.mask(kv), th.brk[3])
    kv2 = {(k, v) for k in range(3, 7) for v in range(19, 29)}
    c.paint(br.mask(kv2), BK[0])
    for i in range(4):
        c.px(*br.xy(4, 20 + 2 * i), BK[3])
        c.px(*br.xy(5, 21 + 2 * i), BK[3])
    for v in (2, 32):
        c.hline(*br.xy(4, v), 2, th.brk[0])
    return c


# ------------------------------------------------------------------ g2 : PCI (squarer board, big square chip, 3 colour jacks)
def g2_model(th):
    c = Canvas(64, 64)
    B = th.pcb
    X, Y, W, H = 4, 20, 34, 30
    tab = 4
    board = rect_mask(X, Y, W, H) | rect_mask(X + 3, Y + H, 17, tab) | rect_mask(X + 23, Y + H, 7, tab)
    c.solid(board, 2, B[3], B[2], B[1], hi=B[4], lo=B[0])
    L = lambda u, v: (X + u, Y + v)  # noqa: E731
    t = th.trace
    poly_line(c, [L(9, 12), L(7, 12), L(7, 17)], t)
    poly_line(c, [L(9, 16), L(5, 16)], t)
    poly_line(c, [L(24, 16), L(27, 16)], t)
    poly_line(c, [L(14, 22), L(14, 25)], t)
    poly_line(c, [L(20, 22), L(20, 25), L(23, 25)], t)
    poly_line(c, [L(10, 5), L(18, 5), L(18, 6)], t)
    gold_strip(c, X + 3, Y + H, 17, tab)
    gold_strip(c, X + 23, Y + H, 7, tab)
    # small chips, crystal, header
    dip(c, *L(2, 2), 6, th, h=3)
    dip(c, *L(2, 8), 6, th, h=3)
    crystal(c, *L(2, 15), 7)
    header(c, *L(2, 22), 4, th)
    dip(c, *L(25, 24), 7, th, h=3)
    # big square chip with the sticker
    qx, qy, qs = X + 10, Y + 7, 14
    qfp(c, qx, qy, qs, th, label=False)
    S = th.stick
    c.rect(qx + 2, qy + 2, 10, 10, S[2])
    c.hline(qx + 2, qy + 2, 10, S[3])
    c.vline(qx + 2, qy + 3, 9, S[3])
    c.hline(qx + 3, qy + 11, 9, S[1])
    c.vline(qx + 11, qy + 3, 9, S[1])
    glyph(c, NOTE7, qx + 3, qy + 4, S[0])
    # SMD caps
    for (u, v, w, h) in ((26, 4, 3, 2), (26, 8, 3, 2), (30, 5, 2, 3), (26, 12, 3, 2), (6, 26, 3, 2), (10, 26, 3, 2), (14, 26, 3, 2),
                         (18, 26, 3, 2), (30, 10, 2, 3)):
        smd(c, *L(u, v), w, h, th)
    led2(c, X + 29, Y + 19)
    # bracket with the three colour-coded jacks
    XB, YB, HB, D = X + W, Y - 2, H + tab + 2, 8
    br = Bracket(c, XB, YB, HB, D, th)
    br.jack(4, 8, 2.5, BK[0], JACK_G[2])
    br.jack(4, 16, 2.5, BK[0], JACK_B[2])
    br.jack(4, 24, 2.5, BK[0], JACK_P[3])
    c.hline(*br.xy(4, 2), 2, th.brk[0])
    c.hline(*br.xy(4, 33), 2, th.brk[0])
    return c


# ------------------------------------------------------------------ g3 : premium PCIe (EMI shield, amp daughter board, gold jacks)
def g3_model(th):
    c = Canvas(64, 64)
    B = th.pcb
    X, Y, W, H = 4, 28, 34, 26
    tab = 4
    board = rect_mask(X, Y, W, H) | rect_mask(X + 13, Y + H, 9, tab) | rect_mask(X + 24, Y + H, 5, tab)
    geo = c.solid(board, 2, B[3], B[2], B[1], hi=B[4], lo=B[0])
    front = geo["front"]
    L = lambda u, v: (X + u, Y + v)  # noqa: E731
    t = th.trace
    poly_line(c, [L(9, 14), L(11, 14)], t)
    poly_line(c, [L(9, 18), L(12, 18), L(12, 22)], t)
    poly_line(c, [L(28, 10), L(31, 10), L(31, 20)], t)
    poly_line(c, [L(14, 22), L(14, 24)], t)
    poly_line(c, [L(24, 22), L(24, 24)], t)
    gold_strip(c, X + 13, Y + H, 9, tab)
    gold_strip(c, X + 24, Y + H, 5, tab)
    # electrolytic caps in the accent colour
    can(c, X + 2, Y + 9, 6, 2, th, onto=front)
    can(c, X + 2, Y + 15, 6, 2, th, onto=front)
    # SMD parts + small chip
    for (u, v, w, h) in ((4, 23, 3, 2), (9, 23, 3, 2), (16, 22, 3, 2), (20, 22, 3, 2)):
        smd(c, *L(u, v), w, h, th)
    dip(c, *L(25, 21), 6, th, h=3)
    # EMI shield over the DAC section (own metal box)
    Lm = th.lid
    sx, sy, sw, sh_ = X + 10, Y + 5, 18, 15
    sg = c.box(sx, sy, sw, sh_, 3, Lm[3], Lm[2], Lm[1], hi=Lm[4], lo=Lm[0])
    inner = erode(sg["front"], 2)
    c.paint(edge_mask(inner, "u") | edge_mask(inner, "l"), Lm[3])
    c.paint(edge_mask(inner, "d") | edge_mask(inner, "r"), Lm[1])
    for i in range(4):
        c.hline(sx + 3 + 3 * i, sy + 1, 2, Lm[0])
    # badge with the pale double note
    bx, by = sx + 3, sy + 2
    badge = ellipse_mask(bx, by, 12, 12)
    c.paint(badge, BK[0])
    c.paint(edge_mask(badge, "udlr"), AMB[2])
    glyph(c, NOTE7, bx + 2, by + 3, GLINT[1])
    # amber glow strip + LED beside the shield
    gl = th.glow
    c.hline(sx + 2, sy + sh_, sw - 4, gl[3])
    c.hline(sx + 4, sy + sh_, sw - 8, gl[4])
    led2(c, X + 29, Y + 12, 2)
    # amp daughter board standing at the top edge
    dx, dy, dw, dh = X + 1, Y - 8, 12, 13
    sub = Canvas(64, 64)
    sub.box(dx, dy, dw, dh, 1, B[4], B[3], B[2], lo=B[0])
    dip(sub, dx + 2, dy + 2, 8, th, h=3)
    dip(sub, dx + 2, dy + 6, 8, th, h=3)
    sub.hline(dx + 2, dy + 12, 8, GO[2])
    sub.hline(dx + 2, dy + 11, 8, GO[1])
    c.composite(sub, 0, 0, outline=B[0])
    # bracket
    XB, YB, HB, D = X + W, Y - 2, H + tab + 2, 6
    br = Bracket(c, XB, YB, HB, D, th)
    for v in (7, 14, 21):
        br.jack(3, v, 2.5, BK[0], GO[2], hi=GO[3], lo=GO[1])
    return c


def g1_icon(th):
    c = Canvas(32, 32)
    B = th.pcb
    C = th.chip
    X, Y, W, H = 3, 10, 18, 12
    tab = 2
    board = rect_mask(X, Y, W, H) | rect_mask(X + 2, Y + H, 8, tab) | rect_mask(X + 12, Y + H, 4, tab)
    geo = c.solid(board, 1, B[3], B[2], B[1], hi=B[4], lo=B[0])
    c.paint({p for p in geo["side"] if p[1] >= Y + H and p[0] < X + W}, OUTLINE)
    L = lambda u, v: (X + u, Y + v)  # noqa: E731
    poly_line(c, [L(7, 11), L(14, 11)], th.trace)
    gold_strip(c, X + 2, Y + H, 8, tab)
    gold_strip(c, X + 12, Y + H, 4, tab)
    dip(c, *L(1, 1), 6, th, h=3, pins=False)
    dip(c, *L(11, 1), 6, th, h=3, pins=False)
    # main chip
    qfp(c, X + 9, Y + 5, 6, th, label=False, ring=False)
    c.hline(X + 11, Y + 8, 2, C[4])
    # ROM with sticker
    c.rect(X + 15, Y + 5, 3, 5, C[2])
    c.rect(X + 15, Y + 6, 3, 3, th.stick[2])
    c.hline(X + 15, Y + 6, 3, th.stick[3])
    can(c, X + 1, Y + 6, 5, 3, th, silver=False)
    # thumb wheel between the chips
    wx, wy = X + 7, Y - 3
    K = th.knob
    sub = Canvas(32, 32)
    sub.paint(rrect_mask(wx, wy, 3, 6, 1), K[2])
    sub.hline(wx, wy + 2, 3, K[1])
    sub.hline(wx, wy + 4, 3, K[1])
    sub.vline(wx, wy, 6, K[3])
    c.composite(sub, 0, 0, outline=B[0])
    # bracket: two jacks + DB15
    br = Bracket(c, X + W, Y - 2, H + tab + 2, 5, th, wf=1, lo=False)
    br.jack(3, 3, 2, BK[0], th.brk[3])
    br.jack(3, 8, 2, BK[0], th.brk[3])
    br.blk(1, 10, 4, 6, th.brk[3])
    br.blk(2, 11, 2, 4, BK[0])
    return c


def g2_icon(th):
    c = Canvas(32, 32)
    B = th.pcb
    C = th.chip
    X, Y, W, H = 4, 9, 17, 15
    tab = 2
    board = rect_mask(X, Y, W, H) | rect_mask(X + 2, Y + H, 8, tab) | rect_mask(X + 12, Y + H, 3, tab)
    geo = c.solid(board, 1, B[3], B[2], B[1], hi=B[4], lo=B[0])
    c.paint({p for p in geo["side"] if p[1] >= Y + H and p[0] < X + W}, OUTLINE)
    L = lambda u, v: (X + u, Y + v)  # noqa: E731
    poly_line(c, [L(1, 5), L(1, 9)], th.trace)
    gold_strip(c, X + 2, Y + H, 8, tab)
    gold_strip(c, X + 12, Y + H, 3, tab)
    # big square chip with the amber sticker
    c.rect(X + 2, Y + 2, 10, 10, C[2])
    c.hline(X + 2, Y + 2, 10, C[3])
    c.vline(X + 2, Y + 3, 9, C[3])
    c.vline(X + 11, Y + 3, 9, C[1])
    c.hline(X + 3, Y + 11, 9, C[1])
    S = th.stick
    c.rect(X + 4, Y + 4, 6, 6, S[2])
    c.hline(X + 4, Y + 4, 6, S[3])
    c.vline(X + 4, Y + 5, 5, S[3])
    glyph(c, NOTE5, X + 5, Y + 5, S[0])
    dip(c, *L(13, 2), 3, th, h=3, pins=False)
    dip(c, *L(13, 6), 3, th, h=3, pins=False)
    header(c, *L(2, 12), 2, th)
    smd(c, *L(8, 12), 3, 2, th)
    smd(c, *L(12, 11), 3, 2, th)
    br = Bracket(c, X + W, Y - 2, H + tab + 2, 4, th, wf=1, lo=False)
    br.blk(1, 3, 2, 2, JACK_G[2])
    br.blk(1, 7, 2, 2, JACK_B[2])
    br.blk(1, 11, 2, 2, JACK_P[3])
    return c


def g3_icon(th):
    c = Canvas(32, 32)
    B = th.pcb
    X, Y, W, H = 4, 11, 18, 12
    tab = 2
    board = rect_mask(X, Y, W, H) | rect_mask(X + 8, Y + H, 5, tab) | rect_mask(X + 14, Y + H, 3, tab)
    geo = c.solid(board, 1, B[3], B[2], B[1], hi=B[4], lo=B[0])
    c.paint({p for p in geo["side"] if p[1] >= Y + H and p[0] < X + W}, OUTLINE)
    L = lambda u, v: (X + u, Y + v)  # noqa: E731
    gold_strip(c, X + 8, Y + H, 5, tab)
    gold_strip(c, X + 14, Y + H, 3, tab)
    # small amber caps (cans seen as short sleeves) + SMD
    S = th.can
    c.rect(X + 1, Y + 6, 4, 4, S[2])
    c.hline(X + 1, Y + 6, 4, S[3])
    c.vline(X + 4, Y + 7, 3, S[1])
    smd(c, *L(15, 9), 2, 2, th)
    # shield with the note badge
    Lm = th.lid
    sx, sy = X + 5, Y + 3
    c.box(sx, sy, 11, 9, 2, Lm[3], Lm[2], Lm[1], hi=Lm[4], lo=Lm[0])
    c.paint(ellipse_mask(sx + 2, sy + 1, 7, 7), BK[0])
    glyph(c, NOTE5, sx + 3, sy + 2, GLINT[1])
    c.hline(sx + 2, sy + 9, 7, th.glow[3])
    # daughter board standing at the top edge
    dx, dy = X + 1, Y - 5
    sub = Canvas(32, 32)
    sub.box(dx, dy, 6, 8, 1, B[4], B[3], B[2], lo=B[0])
    sub.rect(dx + 1, dy + 2, 4, 2, th.chip[2])
    sub.hline(dx + 1, dy + 2, 4, th.chip[3])
    sub.hline(dx + 1, dy + 6, 4, GO[2])
    c.composite(sub, 0, 0, outline=B[0])
    br = Bracket(c, X + W, Y - 2, H + tab + 2, 5, th, wf=1, lo=False)
    br.jack(3, 3, 2, BK[0], GO[2], hi=GO[3])
    br.jack(3, 8, 2, BK[0], GO[2], hi=GO[3])
    br.jack(3, 13, 2, BK[0], GO[2], hi=GO[3])
    return c


# ------------------------------------------------------------------ build / preview
GENS = {}


def render(fn, name, ks=(1, 2, 3), scale=8, g=1):
    imgs = []
    for k in ks:
        c = fn(THEMES[g][k])
        imgs.append(place(finish(c), "icon" if c.w == 32 else "model"))
    W_ = sum(i.width * scale for i in imgs) + 8 * (len(imgs) + 1)
    sh = Image.new("RGBA", (W_, imgs[0].height * scale + 16), NAVY)
    x = 8
    for i in imgs:
        sh.alpha_composite(up(i, scale), (x, 8))
        x += i.width * scale + 8
    p = os.path.join(HERE, "..", "prev", "sound_" + name + ".png")
    sh.save(p)
    return imgs


def build(gens=None):
    d = out_dir("sound")
    for g, (mf, icf) in sorted(GENS.items()):
        if gens and g not in gens:
            continue
        for k, th in THEMES[g].items():
            save(place(finish(mf(th)), "model"), os.path.join(d, "model-g%d-s%d.png" % (g, k)))
            save(place(finish(icf(th)), "icon"), os.path.join(d, "icon-g%d-s%d.png" % (g, k)))
    return sheet("sound", gens=sorted(GENS), labels={1: "g1 ISA -1995", 2: "g2 PCI 96-02", 3: "g3 PCIe 03+"})


GENS[1] = (g1_model, g1_icon)
GENS[2] = (g2_model, g2_icon)
GENS[3] = (g3_model, g3_icon)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("dev:"):
        _, fn, ks, sc = sys.argv[1].split(":")
        gen = int(fn[1])
        render(globals()[fn], fn + "_dev", ks=tuple(int(k) for k in ks), scale=int(sc), g=gen)
    else:
        want = [int(a[1:]) for a in sys.argv[1:] if a[0] == "g"]
        build(want or None)
