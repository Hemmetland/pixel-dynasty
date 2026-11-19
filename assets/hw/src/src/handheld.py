"""Handheld (Nomad) hardware art: 3 generations x 3 styles, model 64x64 + icon 32x32.

run:  python3 src/handheld.py            -> writes out/handheld/model-gN-sS.png, icon-gN-sS.png, sheet.png
      python3 src/handheld.py g2         -> only one generation (+ preview strips in prev/hh_gN_model.png / _icon.png)
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "lib"))
from hwlib import *  # noqa: E402,F401,F403

P = PAL
G = P["graphite"]
GL = P["graphite_lt"]
W = P["white"]
LCD = P["lcd"]
BLK = P["pcb_black"]
ST = P["steel"]

# ------------------------------------------------------------------ themes
# roles: shell (body), bezel (dark screen surround), ctrl (d-pad / sticks / pills), btn (face buttons),
#        led (power LED), cart (g1 cartridge), label (cartridge label), grip (g3 side grips)
CTRL_LT = Ramp([GL[1], GL[2], GL[3], GL[4], W[3]])  # brighter graphite for pads on the dark shell
_h = P["handheld"]
BTN_DEEP = Ramp([_h[0], _h[0], _h[1], _h[2], _h[3]])  # deeper teal for buttons on the white shell
THEMES = {
    1: Theme("Graphite", shell=G, bezel=BLK, ctrl=CTRL_LT, btn=P["handheld"], led=P["led_teal"], cart=GL, label=P["handheld"],
             grip=P["pcb_black"], glow=P["handheld"]),
    2: Theme("Ljus", shell=W, bezel=BLK, ctrl=G, btn=BTN_DEEP, led=P["led_teal"], cart=ST, label=P["handheld"],
             grip=P["white"], glow=P["handheld"]),
    3: Theme("Turkos", shell=P["handheld"], bezel=BLK, ctrl=G, btn=P["led_violet"], led=P["led_violet"], cart=W,
             label=P["led_violet"], grip=P["handheld"], glow=P["led_violet"]),
}


# ------------------------------------------------------------------ shared helpers
class Box:
    """Geometry of an oblique box: front rect (X, Y, w, h), depth d. Helpers map 'face coordinates' to pixels."""

    def __init__(self, X, Y, w, h, d):
        self.X, self.Y, self.w, self.h, self.d = X, Y, w, h, d

    def tp(self, u, k):  # point on the top face: u along the width, k = depth 1..d
        return (self.X + u + k, self.Y - k)

    def sp(self, v, k):  # point on the right side face: v down the height, k = depth 1..d
        return (self.X + self.w - 1 + k, self.Y + v - k)


def pillow(c, geo, S):
    """Bevel on a front face: top/left edge light, bottom/right edge shade (as in the console pilot)."""
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])


def plus(c, cx, cy, arm, thick, R):
    """Plus-shaped d-pad centred on (cx, cy): arm = half length incl. centre, thick = arm thickness (odd).
    base R[2], lit top/left edges R[3], shade bottom/right edges R[1]."""
    t = thick // 2
    m = {(cx + i, cy + j) for i in range(-t, t + 1) for j in range(-arm, arm + 1)}
    m |= {(cx + j, cy + i) for i in range(-t, t + 1) for j in range(-arm, arm + 1)}
    c.paint(m, R[2])
    c.paint(edge_mask(m, "ul"), R[3])
    c.paint(edge_mask(m, "dr"), R[1])
    return m


def round_btn(c, x, y, R, w=4):
    """Round face button: w = 4 (12 px) or 3 (plus-less rounded square). Light top-left, shade bottom-right."""
    m = ellipse_mask(x, y, w, w)
    c.paint(m, R[2])
    c.paint({p for p in m if p[0] == x + w - 1 or p[1] == y + w - 1}, R[1])
    c.paint({p for p in edge_mask(m, "ul") if p[0] < x + w - 1 and p[1] < y + w - 1}, R[3])
    c.px(x + 1, y + 1, R[4])
    return m


def stick(c, x, y, w, R, Dk):
    """Analog stick seen head-on: dark socket ring (Dk[0]) with a lighter round cap. w >= 5."""
    sock = ellipse_mask(x, y, w, w)
    c.paint(sock, Dk[0])
    cap = ellipse_mask(x + 1, y + 1, w - 2, w - 2)
    c.paint(cap, R[2])
    c.paint({p for p in cap if p[0] == x + w - 2 or p[1] == y + w - 2}, R[1])
    c.paint({p for p in edge_mask(cap, "ul") if p[0] < x + w - 2 and p[1] < y + w - 2}, R[3])
    c.px(x + 1 + (w - 2) // 3, y + 1 + (w - 2) // 3, R[4])
    return sock


def pill(c, x, y, w, R, h=2):
    c.rect(x, y, w, h, R[1])
    c.hline(x, y, w, R[3])


def slit_top(c, B, u0, u1, k0, k1, col):
    """Slot on the top face: parallelogram from u0..u1, depth k0..k1."""
    for k in range(k0, k1 + 1):
        x, y = B.tp(u0, k)
        c.hline(x, y, u1 - u0 + 1, col)


# ------------------------------------------------------------------ g1 : brick with tiny LCD (2004-2009)
BLOB = [
    "...00000...",
    "..0000000..",
    ".000000000.",
    ".0..000..0.",
    ".000000000.",
    "00000000000",
    ".000000000.",
]
SHIP = [
    "..0..",
    ".000.",
    "00000",
]


def lcd_scene_g1(c, x, y, w, h):
    """Tiny LCD game: a pixel blob creature drifts down on a player ship, lives counter on top (18 x 16)."""
    L = LCD
    c.rect(x, y, w, h, L[3])
    c.rect(x, y + h - 3, w, 3, L[2])
    c.hline(x, y + h - 1, w, L[1])
    for j, row in enumerate(BLOB):
        for i, ch in enumerate(row):
            if ch == "0":
                c.px(x + 3 + i, y + 3 + j, L[0])
    for j, row in enumerate(SHIP):
        for i, ch in enumerate(row):
            if ch == "0":
                c.px(x + 7 + i, y + h - 5 + j, L[0])
    for i in range(3):
        c.hline(x + 2 + 3 * i, y + 1, 2, L[0])
    c.hline(x + 1, y + 3, 2, L[4])  # glass glint


def g1_model(th):
    c = Canvas(64, 64)
    S, Bz, R = th.shell, th.bezel, th.ctrl
    X, Y, Wd, H, Dp = 3, 22, 46, 28, 7
    B = Box(X, Y, Wd, H, Dp)
    geo = c.rbox(X, Y, Wd, H, Dp, 5, S[3], S[2], S[1], hi=S[4], lo=S[0])
    pillow(c, geo, S)
    # top face: cartridge slot, with the cartridge sticking out of it
    slit_top(c, B, 14, 31, 3, 4, S[0])
    ct = th.cart
    cx_, cy_ = X + 14 + 4, Y - 3 - 6
    cf = rect_mask(cx_, cy_, 16, 6) - {(cx_, cy_), (cx_ + 1, cy_), (cx_, cy_ + 1)}
    c.solid(cf, 3, ct[3], ct[2], ct[1], hi=ct[4], lo=ct[0])
    c.rect(cx_ + 3, cy_ + 2, 10, 3, th.label[2])
    c.hline(cx_ + 3, cy_ + 2, 10, th.label[3])
    c.hline(cx_ + 3, cy_ + 4, 10, th.label[1])
    c.hline(cx_ + 2, cy_ + 1, 12, ct[3])
    # shoulder buttons L / R: small raised blocks on the front corners of the top face
    for u0 in (3, Wd - 14):
        sub = Canvas(64, 64)
        sub.box(0, 3, 10, 2, 2, S[4], S[2], S[1], hi=S[4], lo=S[1])
        x, y = B.tp(u0, 2)
        c.composite(sub, x, y - 5, outline=S[1])
    # bezel + lcd
    bx, by, bw, bh = X + 10, Y + 3, 26, 22
    bz = rrect_mask(bx, by, bw, bh, 3)
    c.paint(bz, Bz[1])
    c.paint(edge_mask(bz, "ul"), Bz[0])
    c.paint(edge_mask(bz, "dr"), S[3])
    lx, ly, lw, lh = bx + 4, by + 3, 18, 16
    lcd_scene_g1(c, lx, ly, lw, lh)
    c.frame(lx - 1, ly - 1, lw + 2, lh + 2, Bz[0])
    # d-pad (left), A / B (right), pills, speaker, led
    plus(c, X + 5, Y + 15, 3, 3, R)
    round_btn(c, X + 37, Y + 17, th.btn)
    round_btn(c, X + 41, Y + 12, th.btn)
    pill(c, X + 2, Y + 23, 6, R)
    pill(c, X + 38, Y + 24, 6, R)
    for i in range(3):
        c.vline(X + 3 + 2 * i, Y + 3, 2, S[0])
        c.vline(X + 3 + 2 * i, Y + 6, 2, S[0])
    c.led(X + 40, Y + 5, th.led, 1, 1, halo=True)
    # right side: a link port (dark block, lit lower lip)
    for k in range(2, 6):
        for v in (8, 9):
            c.px(*B.sp(v, k), S[0])
        c.px(*B.sp(10, k), S[2])
    for k in range(3, 5):
        c.px(*B.sp(15, k), S[0])
    return c


LCD_ICON_G1 = [
    "34333333",
    "33000033",
    "30300303",
    "30000003",
    "33030303",
    "22222222",
    "11111111",
]


def g1_icon(th):
    c = Canvas(32, 32)
    S, Bz, R = th.shell, th.bezel, th.ctrl
    X, Y, Wd, H, Dp = 2, 12, 21, 14, 4
    B = Box(X, Y, Wd, H, Dp)
    geo = c.rbox(X, Y, Wd, H, Dp, 3, S[3], S[2], S[1], hi=S[4], lo=S[0])
    pillow(c, geo, S)
    # cartridge in the top slot
    ct = th.cart
    cx_, cy_ = X + 6 + 2, Y - 2 - 4
    cf = rect_mask(cx_, cy_, 9, 4) - {(cx_, cy_)}
    c.solid(cf, 2, ct[3], ct[2], ct[1], hi=ct[4], lo=ct[0])
    c.hline(cx_ + 2, cy_ + 1, 5, th.label[3])
    c.hline(cx_ + 2, cy_ + 2, 5, th.label[1])
    # bezel + lcd
    bz = rrect_mask(X + 5, Y + 1, 12, 12, 2)
    c.paint(bz, Bz[1])
    c.paint(edge_mask(bz, "ul"), Bz[0])
    for j, row in enumerate(LCD_ICON_G1):
        for i, ch in enumerate(row):
            c.px(X + 7 + i, Y + 3 + j + 1, LCD[int(ch)])
    # d-pad, buttons, pills
    c.paint({(X + 2, Y + 5), (X + 1, Y + 6), (X + 3, Y + 6), (X + 2, Y + 7)}, R[2])
    c.px(X + 2, Y + 6, R[3])
    for (bx, by) in ((X + 18, Y + 4), (X + 17, Y + 7)):
        c.rect(bx, by, 2, 2, th.btn[2])
        c.px(bx, by, th.btn[4])
    c.hline(X + 1, Y + 11, 3, R[1])
    c.hline(X + 17, Y + 12, 3, R[1])
    return c


# ------------------------------------------------------------------ g2 : big glossy screen slab (2010-2017)
def scene_g2(c, x, y, w, h):
    """Colourful tiny scene: sky bands, sun, clouds, two green hills, a road with a little red car."""
    SB, PG, AM, RD = P["pcb_blue"], P["pcb_green"], P["led_amber"], P["pcb_red"]
    c.rect(x, y, w, h, SB[2])
    c.rect(x, y, w, 4, SB[1])
    c.rect(x, y + 8, w, 3, SB[3])
    # sun
    sun = ellipse_mask(x + w - 9, y + 2, 5, 5)
    c.paint(sun, AM[2])
    c.paint({(x + w - 8, y + 3), (x + w - 9 + 1, y + 2)}, AM[3])
    # clouds
    c.hline(x + 3, y + 5, 6, W[3]); c.hline(x + 4, y + 4, 3, W[3]); c.hline(x + 2, y + 6, 8, W[3])
    # hills
    for i in range(w):
        far = 3 + int(round(2.2 * math.sin((i + 4) / 4.0)))
        c.vline(x + i, y + h - 6 - far, far + 3, PG[1])
        near = 1 + int(round(1.6 * math.sin((i - 5) / 3.5 + 1.0)))
        c.vline(x + i, y + h - 6 - near + 1, near + 2, PG[2])
    # road + car
    c.rect(x, y + h - 4, w, 4, G[1])
    for i in range(1, w, 6):
        c.hline(x + i, y + h - 2, 3, W[2])
    cx, cy = x + 5, y + h - 6
    c.rect(cx, cy + 1, 7, 3, RD[2])
    c.rect(cx + 1, cy, 5, 1, RD[2])
    c.rect(cx + 2, cy, 3, 1, SB[3])
    c.px(cx + 1, cy + 3, BLK[0]); c.px(cx + 5, cy + 3, BLK[0])


def btn4(c, x, y, th, spread=3):
    """Four 2x2 face buttons in a diamond; (x, y) = top-left of the 8x8 cluster (spread 3 = 1 px gaps)."""
    pos = ((x + spread, y), (x, y + spread), (x + 2 * spread, y + spread), (x + spread, y + 2 * spread))
    for (bx, by) in pos:
        c.rect(bx, by, 2, 2, th.btn[2])
        c.px(bx, by, th.btn[4])


def g2_model(th):
    c = Canvas(64, 64)
    S, Bz, R = th.shell, th.bezel, th.ctrl
    X, Y, Wd, H, Dp = 3, 24, 48, 25, 5
    B = Box(X, Y, Wd, H, Dp)
    geo = c.rbox(X, Y, Wd, H, Dp, 6, S[3], S[2], S[1], hi=S[4], lo=S[0])
    pillow(c, geo, S)
    # top face: memory-card slot with a gold-contact card peeking out, shoulder plates
    slit_top(c, B, 22, 33, 2, 3, S[0])
    for u in range(24, 32):
        c.px(*B.tp(u, 3), P["gold"][2])
    for u0 in (3, Wd - 14):
        sub = Canvas(64, 64)
        sub.box(0, 2, 11, 2, 1, S[4], S[2], S[1], hi=S[4], lo=S[1])
        x, y = B.tp(u0, 3)
        c.composite(sub, x, y - 3, outline=S[1])
    # glossy bezel with a big screen and a camera dot
    bx, by, bw, bh = X + 10, Y + 2, 28, 22
    bz = rrect_mask(bx, by, bw, bh, 3)
    c.paint(bz, Bz[1])
    c.paint(edge_mask(bz, "ul"), Bz[2])
    c.paint(edge_mask(bz, "dr"), S[3])
    sx, sy, sw, sh = bx + 2, by + 3, 24, 17
    scene_g2(c, sx, sy, sw, sh)
    c.frame(sx - 1, sy - 1, sw + 2, sh + 2, Bz[0])
    c.px(sx + 1, sy + 1, GLINT[0]); c.px(sx + 2, sy + 1, GLINT[0]); c.px(sx + 1, sy + 2, GLINT[0])
    c.px(sx + sw - 2, sy + sh - 2, GLINT[0])
    c.rect(bx + 13, by + 1, 2, 2, P["glass"][2])
    c.px(bx + 13, by + 1, P["glass"][4])
    # left: stick (top), d-pad, speaker grille; right: four buttons, stick
    stick(c, X + 2, Y + 3, 6, R, BLK)
    plus(c, X + 5, Y + 16, 3, 3, R)
    for j in (21, 23):
        c.hline(X + 2, Y + j, 6, S[0])
    btn4(c, X + 39, Y + 3, th)
    stick(c, X + 40, Y + 14, 6, R, BLK)
    for j in (21, 23):
        c.hline(X + 39, Y + j, 6, S[0])
    return c


def g2_icon(th):
    c = Canvas(32, 32)
    S, Bz, R = th.shell, th.bezel, th.ctrl
    X, Y, Wd, H, Dp = 2, 12, 22, 14, 3
    geo = c.rbox(X, Y, Wd, H, Dp, 3, S[3], S[2], S[1], hi=S[4], lo=S[0])
    pillow(c, geo, S)
    bz = rrect_mask(X + 5, Y + 1, 12, 12, 2)
    c.paint(bz, Bz[1])
    SB, PG, AM = P["pcb_blue"], P["pcb_green"], P["led_amber"]
    sx, sy = X + 6, Y + 3
    c.rect(sx, sy, 10, 9, SB[2])
    c.rect(sx, sy, 10, 3, SB[1])
    c.rect(sx + 6, sy + 1, 2, 2, AM[2])
    c.hline(sx + 1, sy + 3, 3, W[3])
    c.rect(sx, sy + 6, 10, 3, PG[2])
    c.hline(sx, sy + 5, 4, PG[2]); c.hline(sx + 6, sy + 5, 4, PG[2])
    c.hline(sx + 3, sy + 7, 4, PG[1])
    c.px(sx, sy, GLINT[0])
    c.px(X + 10, Y + 1, P["glass"][4])
    # controls
    c.rect(X + 1, Y + 2, 3, 3, BLK[0]); c.px(X + 2, Y + 3, R[3])
    c.paint({(X + 2, Y + 8), (X + 1, Y + 9), (X + 3, Y + 9), (X + 2, Y + 10)}, R[2]); c.px(X + 2, Y + 9, R[3])
    for (bx, by) in ((X + 18, Y + 2), (X + 18, Y + 5)):
        c.rect(bx, by, 2, 2, th.btn[2])
        c.px(bx, by, th.btn[4])
    c.rect(X + 18, Y + 9, 3, 3, BLK[0]); c.px(X + 19, Y + 10, R[3])
    return c


# ------------------------------------------------------------------ g3 : thin full-screen slab with grips (2018+)
def ui_g3(c, x, y, w, h):
    """Bright home-screen UI on a w x h interior: status bar, hero banner, 4 app tiles, dock."""
    SB, PG, AM, RD, VI = P["pcb_blue"], P["pcb_green"], P["led_amber"], P["pcb_red"], P["led_violet"]
    c.rect(x, y, w, h, SB[1])
    c.rect(x, y, w, 3, SB[0])
    c.hline(x + 2, y + 1, 3, W[3])
    c.hline(x + w - 7, y + 1, 2, W[3]); c.hline(x + w - 4, y + 1, 2, W[3]) if w > 20 else None
    # hero banner: tiny sunny game cover
    bx, by, bw, bh = x + 2, y + 4, 13, 9
    ban = rrect_mask(bx, by, bw, bh, 2)
    c.paint(ban, SB[3])
    c.paint({p for p in ban if p[1] >= by + 5}, PG[2])
    c.paint({p for p in ban if p[1] >= by + 7}, PG[1])
    c.paint(ellipse_mask(bx + 8, by + 1, 3, 3), AM[2])
    c.paint({(bx + 2, by + 4), (bx + 3, by + 4), (bx + 3, by + 3), (bx + 4, by + 4), (bx + 5, by + 5)}, PG[2])
    c.hline(bx + 1, by + 2, 3, W[3])
    c.paint(edge_mask(ban, "ul") & {p for p in ban if p[1] < by + 4}, W[3]) if False else None
    # app tiles (2 x 2)
    for i, col in enumerate((AM[2], RD[2], PG[3], VI[2])):
        tx, ty = x + 16 + (i % 2) * 5, y + 4 + (i // 2) * 5
        t = rrect_mask(tx, ty, 4, 4, 2) if False else rect_mask(tx, ty, 4, 4)
        c.paint(t, col)
        c.px(tx, ty, W[3])
    # dock
    c.rect(x, y + h - 4, w, 4, SB[0])
    for i in range(5):
        c.rect(x + 3 + 5 * i, y + h - 3, 3, 2, W[3] if i == 2 else SB[3])


def g3_front(X, Y, L=False):
    main = rrect_mask(X, Y, 49, 24, 6)
    return main | rrect_mask(X, Y + 8, 11, 21, 5) | rrect_mask(X + 38, Y + 8, 11, 21, 5)


def g3_model(th):
    c = Canvas(64, 64)
    S, Bz, R = th.shell, th.bezel, th.ctrl
    X, Y, Wd, H, Dp = 3, 21, 49, 24, 4
    B = Box(X, Y, Wd, H, Dp)
    front = g3_front(X, Y)
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    pillow(c, geo, S)
    # top: thin vent slits + shoulder seam
    for u0 in (18, 23, 28):
        for k in (2,):
            x, y = B.tp(u0, k)
            c.hline(x, y, 4, S[0])
    for u0 in (2, Wd - 12):
        x, y = B.tp(u0, 2)
        c.hline(x, y, 10, S[1])
    # side: seam
    for v in range(5, 19):
        c.px(*B.sp(v, 2), S[2])
    # glass: bright screen, rounded corners, thin dark bezel
    gx, gy, gw, gh = X + 10, Y + 1, 28, 20
    gl = rrect_mask(gx, gy, gw, gh, 3)
    c.paint(gl, Bz[0])
    inner = rrect_mask(gx + 1, gy + 1, gw - 2, gh - 2, 2)
    c.paint(inner, Bz[2])
    ui_g3(c, gx + 1, gy + 1, gw - 2, gh - 2)
    # re-clip UI corners to the rounded glass
    for (xx, yy) in rect_mask(gx + 1, gy + 1, gw - 2, gh - 2) - inner:
        c.px(xx, yy, Bz[0])
    c.px(gx + 3, gy + 2, GLINT[0]); c.px(gx + 4, gy + 2, GLINT[0]); c.px(gx + 3, gy + 3, GLINT[0])
    # light strip
    gl_ = th.glow
    c.hline(X + 12, Y + 22, 24, gl_[1])
    c.hline(X + 14, Y + 22, 20, gl_[3])
    # left grip: d-pad, stick; right grip: buttons, stick
    plus(c, X + 5, Y + 9, 3, 3, R)
    stick(c, X + 2, Y + 16, 6, R, BLK)
    btn4(c, X + 39, Y + 3, th)
    stick(c, X + 41, Y + 16, 6, R, BLK)
    return c


UI_ICON_G3 = [
    "00ww00000ww00",
    "1333333311aa1",
    "1333a33311aa1",
    "1ggggggg11rr1",
    "1GGGGGGG11rr1",
    "1111111111111",
    "0330330330330",
    "0000000000000",
]


def g3_icon(th):
    c = Canvas(32, 32)
    S, Bz, R = th.shell, th.bezel, th.ctrl
    SB, PG, AM, RD = P["pcb_blue"], P["pcb_green"], P["led_amber"], P["pcb_red"]
    X, Y, Wd, H, Dp = 2, 11, 23, 12, 2
    front = rrect_mask(X, Y, 23, 12, 4) | rrect_mask(X, Y + 4, 6, 14, 3) | rrect_mask(X + 17, Y + 4, 6, 14, 3)
    geo = c.solid(front, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    pillow(c, geo, S)
    glass = rrect_mask(X + 4, Y + 1, 15, 10, 2)
    c.paint(glass, Bz[0])
    inner = rrect_mask(X + 5, Y + 2, 13, 8, 1)
    cmap = {"0": SB[0], "1": SB[1], "3": SB[3], "w": W[4], "a": AM[2], "r": RD[2], "g": PG[2], "G": PG[1]}
    for j, row in enumerate(UI_ICON_G3):
        for i, ch in enumerate(row):
            if (X + 5 + i, Y + 2 + j) in inner:
                c.px(X + 5 + i, Y + 2 + j, cmap[ch])
    c.hline(X + 6, Y + 11, 11, th.glow[3])
    # controls
    c.paint({(X + 2, Y + 4), (X + 1, Y + 5), (X + 3, Y + 5), (X + 2, Y + 6)}, R[2]); c.px(X + 2, Y + 5, R[3])
    c.rect(X + 1, Y + 12, 3, 3, BLK[0]); c.px(X + 2, Y + 13, R[3])
    for (bx, by) in ((X + 19, Y + 3), (X + 19, Y + 6)):
        c.rect(bx, by, 2, 2, th.btn[2])
        c.px(bx, by, th.btn[4])
    c.rect(X + 19, Y + 12, 3, 3, BLK[0]); c.px(X + 20, Y + 13, R[3])
    return c


# ------------------------------------------------------------------ driver
GENS = {1: (g1_model, g1_icon), 2: (g2_model, g2_icon), 3: (g3_model, g3_icon)}


def dev(gen, scale_m=6, scale_i=10):
    mf, icf = GENS[gen]
    ms, ics = [], []
    for k in (1, 2, 3):
        ms.append(place(finish(despeckle(mf(THEMES[k]))), "model"))
        ics.append(place(finish(despeckle(icf(THEMES[k]))), "icon"))
    for name, imgs, sc in (("model", ms, scale_m), ("icon", ics, scale_i)):
        W_ = sum(i.width * sc for i in imgs) + 8 * (len(imgs) + 1)
        sh = Image.new("RGBA", (W_, imgs[0].height * sc + 16), NAVY)
        x = 8
        for i in imgs:
            sh.alpha_composite(up(i, sc), (x, 8))
            x += i.width * sc + 8
        sh.save(os.path.join(HERE, "..", "prev", "hh_g%d_%s.png" % (gen, name)))


def despeckle(c):
    """Recolour stray 1 px specks (no 8-neighbour of the same colour) with the most common 4-neighbour colour.
    LED / glint / highlight tones (hwlib.ALLOW_ISOLATED and every ramp's top tone) are left alone."""
    allowed = set(ALLOW_ISOLATED)
    for r in PAL.values():
        allowed.add(r[4])
    for _ in range(2):
        for y in range(c.h):
            for x in range(c.w):
                p = c.get(x, y)
                if p[3] == 0 or p in allowed:
                    continue
                if any(c.get(x + i, y + j) == p for j in (-1, 0, 1) for i in (-1, 0, 1) if i or j):
                    continue
                nb = [c.get(x + i, y + j) for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                nb = [q for q in nb if q[3] > 0]
                if nb:
                    c.px(x, y, max(set(nb), key=nb.count))
    return c


def build(gens=None):
    d = out_dir("handheld")
    for g, (mf, icf) in sorted(GENS.items()):
        if gens and g not in gens:
            continue
        for k, th in THEMES.items():
            save(place(finish(despeckle(mf(th))), "model"), os.path.join(d, "model-g%d-s%d.png" % (g, k)))
            save(place(finish(despeckle(icf(th))), "icon"), os.path.join(d, "icon-g%d-s%d.png" % (g, k)))
    return sheet("handheld", gens=sorted(GENS), labels={1: "g1 2004-09", 2: "g2 2010-17", 3: "g3 2018+"})


if __name__ == "__main__":
    want = [int(a[1:]) for a in sys.argv[1:] if a[0] == "g"]
    for g in want:
        dev(g)
    build(want or None)
