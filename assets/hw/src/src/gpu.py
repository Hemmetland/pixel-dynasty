"""GPU (Spectra graphics card) hardware art: 4 generations x 3 styles, model 64x64 + icon 32x32.

run:  python3 src/gpu.py            -> writes out/gpu/model-gN-sS.png, icon-gN-sS.png, sheet.png
      python3 src/gpu.py g1 g3      -> only some generations
      python3 src/gpu.py dev:g1_model:123:8   -> quick preview strip into prev/gpu/
"""
import os
import sys
import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "lib"))
from hwlib import *  # noqa: E402,F401,F403
from hwlib import _n8  # noqa: E402

P = PAL
GR = P["gpu"]          # green accent
ST = P["steel"]
GD = P["gold"]
GL = P["glass"]

# s1 shroud: graphite lifted by one step (all colours already in the shipped palette family)
SLATE = Ramp(["#36314e", "#4a4561", "#625d7a", "#7a7595", "#9a95b5"])
INK = Ramp(["#1c1c31", "#1c1c31", "#26243d", "#36314e", "#4a4561"])   # s3 shroud: matte black (all shipped colours)
PIT = Ramp(["#1c1c31", "#1c1c31", "#1c1c31", "#26243d", "#36314e"])     # s3 fan recess

# roles: shroud (shell), well (dark recess behind fans / vents), pcb (board colour in g1/g2), pcb2 (board in g3/g4),
#        trim (accent), glow (lit strip / hub), blade (fan blades), chip (memory chips), plug (power plugs), metal
THEMES = {
    1: Theme("Grön", shroud=SLATE, well=P["pcb_black"], pcb=P["pcb_green"], pcb2=P["pcb_black"], trim=GR, glow=P["led_green"],
             blade=Ramp([P["graphite"][0], P["graphite"][1], P["graphite_lt"][1], P["graphite_lt"][3], P["graphite_lt"][4]]), chip=P["pcb_black"], plug=P["graphite"], metal=ST, sink=ST, label=P["white"], fanring=GR[2],
             trace=P["pcb_green"][1], hubglow=GR[3], gap=P["pcb_black"][1], ring=P["pcb_black"][0], hub=P["pcb_black"][0], hubring=None, sticker=P["white"], sticker_line=GR[1]),
    2: Theme("Ljus", shroud=P["white"], well=P["graphite"], pcb=P["white"], pcb2=P["graphite"], trim=GR, glow=P["led_green"],
             blade=ST, chip=P["pcb_black"], plug=P["graphite"], metal=ST, sink=ST, label=P["pcb_green"], fanring=GR[2],
             trace=P["white"][0], hubglow=GR[3], gap=P["graphite"][1], ring=P["pcb_black"][0], hub=P["pcb_black"][0], hubring=GR[2], sticker=P["pcb_green"], sticker_line=GR[3]),
    3: Theme("Mörk", shroud=INK, well=PIT, pcb=P["pcb_black"], pcb2=P["pcb_black"], trim=GR, glow=P["led_green"],
             blade=P["graphite_lt"], chip=Ramp(["#1c1c31", "#1c1c31", "#26243d", "#625d7a", "#8681a0"]), plug=P["graphite"], metal=P["graphite_lt"], sink=P["graphite_lt"], label=GR,
             trace=P["pcb_black"][3], hubglow=GR[3], gap=P["pcb_black"][0], ring=P["pcb_black"][0], hub=P["pcb_black"][0], hubring=GR[1], iring=P["graphite_lt"][1], iglow=GR[3], sticker=GR, sticker_line=GR[0]),
}


# ------------------------------------------------------------------ shared helpers
def part(c, fn, outline=None):
    """draw fn(sub) on a sub canvas (same coordinates) and composite it with a separation outline"""
    sub = Canvas(c.w, c.h)
    fn(sub)
    return c.composite(sub, 0, 0, outline=outline)


def fan(c, x, y, d, n, th, hub_r=None, swirl=1.0, wid=0.78, lead=0.4, rot=0.0, ringw=1.0, glow=True, hubring=True, clean=True, ring=None):
    """Axial fan in the bbox (x, y, d, d), seen straight on (the card front is flat).
    theme roles: blade (Ramp: 3 lit leading edge, 2 blade), gap (dark between blades), ring (1 px frame),
    hub (dark disc), hubring (1 px ring around the hub or None), hubglow (centre pixel or None)."""
    R = d / 2.0
    cx, cy = x + R, y + R
    hub_r = hub_r if hub_r is not None else max(1.4, R * 0.32)
    kind = {}
    for (px, py) in ellipse_mask(x, y, d, d):
        dx, dy = px + 0.5 - cx, py + 0.5 - cy
        r = math.hypot(dx, dy)
        if r > R - ringw:
            kind[(px, py)] = "ring"
        elif r <= hub_r:
            kind[(px, py)] = "hub"
        elif hubring and th.hubring is not None and r <= hub_r + 0.9:
            kind[(px, py)] = "hubring"
        else:
            t = (r - hub_r) / max(0.01, (R - ringw - hub_r))
            ang = math.atan2(dy, dx) + rot - swirl * t
            u = (ang / (2 * math.pi / n)) % 1.0
            kind[(px, py)] = ("lead" if u < lead else "blade") if u < wid else "gap"
    if clean:
        for _ in range(2):
            for (px, py), k in list(kind.items()):
                if k in ("gap", "lead"):
                    same = sum(1 for q in _n8((px, py)) if kind.get(q) == k)
                    if same == 0:
                        kind[(px, py)] = "blade"
    col = {"ring": ring if ring is not None else th.get("fanring", th.ring), "hub": th.hub, "hubring": th.hubring, "lead": th.blade[3], "blade": th.blade[2], "gap": th.gap}
    for (px, py), k in kind.items():
        c.px(px, py, col[k])
    if glow and th.hubglow is not None:
        c.px(int(cx - 0.5), int(cy - 0.5), th.hubglow)


FAN5 = [".ooo.",
        "ollgo",
        "olglo",
        "ogllo",
        ".ooo."]
FAN10 = ["...oooo...",
         ".oogllloo.",
         ".ogblbggo.",
         "olgbbgbbgo",
         "olbgHHbllo",
         "ollbHHgblo",
         "ogbbgbbglo",
         ".oggblbgo.",
         ".oolllgoo.",
         "...oooo..."]
FAN7 = ["..ooo..",
        ".ollgo.",
        "oglgllo",
        "olggglo",
        "ollglgo",
        ".ogllo.",
        "..ooo.."]


def fan_ascii(c, x, y, rows, th, ring=None, glow=True):
    """small hand drawn fans for the 32 px icons. o ring, l lit blade, b blade, g gap, H hub"""
    col = {"o": ring or th.get("fanring", th.ring), "l": th.blade[3], "b": th.blade[2], "g": th.gap, "H": th.hub}
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != ".":
                c.px(x + i, y + j, col[ch])
    if glow and th.get("iglow") is not None:
        c.px(x + len(rows[0]) // 2, y + len(rows) // 2, th.iglow)


def fingers(c, x, y, w, notch, th, h=3):
    """gold PCIe edge connector strip (front view): 2 px fingers with a 1 px dark gap, a wider gap at the key notch."""
    g = GD
    c.rect(x, y, w, h, g[0])
    xs = []
    cx_ = x
    while cx_ + 1 < x + w:
        if cx_ + 1 >= notch[0] and cx_ < notch[1]:
            cx_ = notch[1]
            continue
        xs.append(cx_)
        cx_ += 3
    for fx in xs:
        c.rect(fx, y, 2, h, g[2])
        c.px(fx, y + h - 1, g[1]); c.px(fx + 1, y + h - 1, g[1])
        c.px(fx, y, g[3]); c.px(fx + 1, y, g[3])


def chip(c, x, y, w, h, th, pins=True):
    """flat memory chip: dark body, light top-left edge, pin ticks left/right"""
    K = th.chip
    c.rect(x, y, w, h, K[1])
    c.hline(x, y, w, K[3])
    c.vline(x, y, h, K[2])
    c.hline(x + 1, y + h - 1, w - 1, K[0])
    if pins and h >= 4:
        c.vline(x - 1, y + 1, h - 2, th.metal[2])
        c.vline(x + w, y + 1, h - 2, th.metal[1])


# ------------------------------------------------------------------ g1 : 3D accelerator (until 2000)
def vga(c, x, y, w=5, shell=None, hole=None):
    """D-sub 15 seen face-on: trapezoid w wide, 3 rows"""
    c.hline(x, y, w, shell[3])
    c.rect(x, y + 1, w, 1, shell[3])
    c.hline(x + 1, y + 1, w - 2, hole)
    c.hline(x + 1, y + 2, w - 2, shell[1])


def heatsink(c, x, y, w, h, d, th, fin_step=3):
    """steel block with a fin pattern on its top face; returns the geometry dict"""
    K = th.sink
    geo = c.box(x, y, w, h, d, K[3], K[2], K[1], hi=K[4], lo=K[0])
    for i in range(1, w, fin_step):
        for k in range(1, d):
            c.px(x + i + k, y - k, K[1])
    c.vline(x, y + 1, h - 1, K[3])
    return geo


def g1_model(th):
    c = Canvas(64, 64)
    B = th.pcb
    X, Y, W, H, D = 14, 22, 31, 22, 4
    tr = th.trace
    # bracket (metal strip on the left end)
    bx, by, bw, bh = X - 7, Y - 3, 6, H + 8
    c.rect(bx, by, bw, bh, th.metal[2])
    c.hline(bx, by, bw, th.metal[4])
    c.vline(bx, by, bh, th.metal[3])
    c.vline(bx + bw - 1, by, bh, th.metal[0])
    c.hline(bx, by + bh - 1, bw, th.metal[1])
    vga(c, bx + 1, by + 6, 5, th.metal, GL[0])
    vga(c, bx + 1, by + 12, 5, th.metal, GL[0])
    c.rect(bx + 2, by + 19, 3, 3, th.metal[0])
    # board
    geo = c.box(X, Y, W, H, D, B[3], B[2], B[1], hi=B[4], lo=B[0])
    # traces (behind the parts)
    c.hline(X + 6, Y + 7, 4, tr)
    c.hline(X + 6, Y + 13, 4, tr)
    c.vline(X + 7, Y + 7, 8, tr)
    c.hline(X + 7, Y + 17, 14, tr)
    # memory chips around the GPU
    for cy_ in (Y + 3, Y + 9, Y + 15):
        chip(c, X + 1, cy_, 6, 4, th)
    for cy_ in (Y + 6, Y + 12):
        chip(c, X + 25, cy_, 5, 4, th)
    # GPU heatsink + fan
    hx, hy, hw, hh = X + 8, Y + 4, 13, 13
    def hs(sub):
        heatsink(sub, hx, hy, hw, hh, 4, th)
        sub.rect(hx + 1, hy + 1, hw - 2, hh - 2, th.sink[1])
        fan(sub, hx + 2, hy + 2, 9, 5, th, hub_r=1.6, swirl=0.9, hubring=False, ring=th.ring, clean=True)
    part(c, hs, outline=B[0])
    # capacitors + label along the bottom
    for i in range(5):
        x0 = X + 2 + 3 * i
        c.rect(x0, Y + 18, 2, 3, th.chip[1])
        c.hline(x0, Y + 18, 2, th.metal[3])
    c.rect(X + 21, Y + 17, 9, 4, th.sticker[2])
    c.hline(X + 21, Y + 17, 9, th.sticker[3])
    c.hline(X + 22, Y + 19, 5, th.sticker_line)
    # gold fingers
    fingers(c, X + 7, Y + H, 18, (X + 15, X + 17), th)
    return c


def g1_icon(th):
    c = Canvas(32, 32)
    B = th.pcb
    X, Y, W, H, D = 10, 11, 17, 14, 3
    tr = th.trace
    bx, by, bw, bh = X - 3, Y - 2, 3, H + 6
    c.rect(bx, by, bw, bh, th.metal[2])
    c.hline(bx, by, bw, th.metal[4])
    c.vline(bx, by, bh, th.metal[3])
    c.vline(bx + bw - 1, by, bh, th.metal[0])
    c.hline(bx + 1, by + 5, 2, GL[0])
    c.hline(bx + 1, by + 9, 2, GL[0])
    geo = c.box(X, Y, W, H, D, B[3], B[2], B[1], hi=B[4], lo=B[0])
    c.hline(X + 4, Y + 12, 8, tr)
    for cy_ in (Y + 2, Y + 6, Y + 10):
        chip(c, X + 1, cy_, 3, 2, th, pins=False)
    for cy_ in (Y + 4, Y + 8):
        chip(c, X + 14, cy_, 3, 2, th, pins=False)
    hx, hy, hw, hh = X + 4, Y + 2, 9, 9
    def hs(sub):
        heatsink(sub, hx, hy, hw, hh, 2, th, fin_step=99)
        sub.rect(hx + 1, hy + 1, hw - 2, hh - 2, th.sink[1])
        fan_ascii(sub, hx + 1, hy + 1, FAN7, th, ring=th.ring, glow=False)
    part(c, hs, outline=B[0])
    c.rect(X + 12, Y + 11, 4, 2, th.sticker[2])
    c.hline(X + 12, Y + 11, 4, th.sticker[3])
    fingers(c, X + 3, Y + H, 11, (X + 8, X + 9), th, h=2)
    return c


# ------------------------------------------------------------------ g2 : big single fan (2001-2009)
def pipe(c, x, y, w, th, h=2):
    """copper heatpipe stub lying along x: 2 px tall, rounded cap on the right"""
    cu = GD
    c.rect(x, y, w, h, cu[1])
    c.hline(x, y, w, cu[2])
    c.hline(x, y + h - 1, w, cu[0])
    c.px(x + w - 1, y, cu[1]); c.px(x + w - 1, y + h - 1, cu[0])


def dvi(c, x, y, w, h, th):
    """DVI port seen face-on: white shell, two rows of dark pin holes"""
    c.rect(x, y, w, h, P["white"][2])
    c.hline(x, y, w, P["white"][3])
    c.hline(x, y + h - 1, w, P["white"][0])
    for j in range(1, h - 1, 2):
        c.hline(x + 1, y + j, w - 2, GL[0])


def svideo(c, x, y, th):
    """S-video: 4x4 round dark socket"""
    c.rect(x, y + 1, 4, 2, th.metal[0])
    c.rect(x + 1, y, 2, 4, th.metal[0])
    c.px(x + 1, y + 1, th.metal[2])


def g2_model(th):
    c = Canvas(64, 64)
    S = th.shroud
    B = th.pcb
    X, Y, W, H, D = 15, 17, 34, 26, 8
    # 2-slot bracket
    bx, by, bw, bh = X - 8, Y, 7, H + 7
    c.rect(bx, by, bw, bh, th.metal[2])
    c.hline(bx, by, bw, th.metal[4])
    c.vline(bx, by, bh, th.metal[3])
    c.vline(bx + bw - 1, by, bh, th.metal[0])
    c.hline(bx, by + bh - 1, bw, th.metal[1])
    dvi(c, bx + 1, by + 4, 5, 5, th)
    svideo(c, bx + 2, by + 11, th)
    vga(c, bx + 1, by + 17, 5, th.metal, GL[0])
    for j in range(24, 30, 2):
        c.hline(bx + 1, by + j, 5, th.metal[1])
    # body: rounded plastic shroud + PCB strip
    front = {q for q in rrect_mask(X, Y, W, H + 10, 6) if q[1] < Y + H}
    geo = c.solid(front, D, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.rect(X, Y + H - 3, W, 3, B[2])
    c.hline(X, Y + H - 3, W, B[3])
    c.hline(X, Y + H - 1, W, B[1])
    c.vline(X, Y + H - 3, 3, B[3])
    # heatpipe stubs poking out of the top face
    for sx in (X + 5, X + 10):
        c.cyl(sx, Y - 6, 4, 3, 3, GD[3], GD[1], hi=GD[4], rim=None)
        c.vline(sx + 3, Y - 4, 3, GD[0])
        c.hline(sx + 1, Y - 5, 2, GD[0])
    # 4-pin power plug on the top face (right part)
    def plug(sub):
        px, py = X + 21, Y - 5
        sub.box(px, py, 8, 3, 3, P["white"][3], P["white"][2], P["white"][1], hi=P["white"][4], lo=P["white"][0])
        for k in range(3):
            sub.px(px + 1 + 2 * k, py - 2, GL[0])
    part(c, plug, outline=S[1])
    # big fan with accent ring
    fx, fy, fd = X + 13, Y + 2, 19
    fan(c, fx, fy, fd, 7, th, hub_r=3.4, swirl=0.9, wid=0.8)
    # left section: vents, emblem
    for j in range(3):
        c.hline(X + 3, Y + 5 + 3 * j, 8, S[0])
        c.hline(X + 3, Y + 6 + 3 * j, 8, S[3])
    for k in range(5):
        c.px(X + 3 + k, Y + 18 - k, th.trim[2])
        c.px(X + 4 + k, Y + 18 - k, th.trim[1])
    fingers(c, X + 8, Y + H, 21, (X + 17, X + 19), th)
    return c


def g2_icon(th):
    c = Canvas(32, 32)
    S = th.shroud
    B = th.pcb
    X, Y, W, H, D = 8, 11, 17, 14, 4
    bx, by, bw, bh = X - 4, Y - 1, 3, H + 4
    c.rect(bx, by, bw, bh, th.metal[2])
    c.hline(bx, by, bw, th.metal[4])
    c.vline(bx, by, bh, th.metal[3])
    c.vline(bx + bw - 1, by, bh, th.metal[0])
    c.hline(bx + 1, by + 3, 2, GL[0])
    c.hline(bx + 1, by + 6, 2, GL[0])
    c.hline(bx + 1, by + 12, 2, th.metal[1])
    front = {q for q in rrect_mask(X, Y, W, H + 6, 3) if q[1] < Y + H}
    geo = c.solid(front, D, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.rect(X, Y + H - 2, W, 2, B[2])
    c.hline(X, Y + H - 2, W, B[3])
    c.hline(X, Y + H - 1, W, B[1])
    # heatpipe stubs + power plug on top
    for sx in (X + 3, X + 6):
        c.rect(sx, Y - 5, 2, 2, GD[1])
        c.hline(sx, Y - 5, 2, GD[3])
    c.rect(X + 12, Y - 5, 4, 2, P["white"][2])
    c.hline(X + 12, Y - 5, 4, P["white"][4])
    fan_ascii(c, X + 6, Y + 1, FAN10, th, ring=th.get('iring', th.get('fanring')))
    for j in range(2):
        c.hline(X + 2, Y + 3 + 3 * j, 3, S[0])
    for k in range(3):
        c.px(X + 2 + k, Y + 9 - k, th.trim[2])
    fingers(c, X + 3, Y + H, 12, (X + 8, X + 9), th, h=2)
    return c


# ------------------------------------------------------------------ g3 : dual fan (2010-2018)
def dp_port(c, x, y, th):
    """DisplayPort 4x2: dark socket, one cut corner"""
    c.hline(x, y, 4, th.metal[0])
    c.hline(x, y + 1, 3, th.metal[0])
    c.px(x + 3, y + 1, th.metal[2])


def hdmi_port(c, x, y, th):
    """HDMI 5x2: dark trapezoid"""
    c.hline(x, y, 5, th.metal[0])
    c.hline(x + 1, y + 1, 3, th.metal[0])
    c.px(x, y + 1, th.metal[2]); c.px(x + 4, y + 1, th.metal[2])


def plug8(sub, px, py, th, led=False):
    """PCIe 8-pin plug standing on the top edge: dark body, 2 rows of pin holes on its top face, latch ridge"""
    K = th.plug
    sub.box(px, py, 6, 4, 3, K[3], K[2], K[1], hi=K[4], lo=K[0])
    for k in range(3):
        sub.px(px + 2 + k, py - 1, K[0])
    sub.hline(px + 1, py + 1, 4, K[3])
    if led:
        sub.rect(px + 2, py + 2, 2, 1, th.glow[3])


def chamfered(x, y, w, h, tl=0, tr=0, bl=0, br=0):
    """rect mask with cut corners (cut sizes in px)"""
    m = rect_mask(x, y, w, h)
    for k in range(tl):
        m -= {(x + i, y + k - i) for i in range(k + 1)} if False else set()
    out = set()
    for (px, py) in m:
        i, j = px - x, py - y
        if tl and i + j < tl: continue
        if tr and (w - 1 - i) + j < tr: continue
        if bl and i + (h - 1 - j) < bl: continue
        if br and (w - 1 - i) + (h - 1 - j) < br: continue
        out.add((px, py))
    return out


def backplate(c, geo, X, Y, W, D, th, n):
    """metal backplate edge: the far n columns of the side face and the far n rows of the top face"""
    M = th.metal
    for (x_, y_) in geo["side"]:
        k = x_ - (X + W - 1)
        if k > D - n:
            c.px(x_, y_, M[1] if k == D else M[2])
    for (x_, y_) in geo["top"]:
        k = Y - y_
        if k > D - n:
            c.px(x_, y_, M[3] if k == D else M[2])


def g3_model(th):
    c = Canvas(64, 64)
    S = th.shroud
    B = th.pcb2
    X, Y, W, H, D = 14, 22, 37, 21, 8
    # bracket with HDMI + 3x DP and vent
    bx, by, bw, bh = X - 8, Y + 1, 7, H + 6
    c.rect(bx, by, bw, bh, th.metal[2])
    c.hline(bx, by, bw, th.metal[4])
    c.vline(bx, by, bh, th.metal[3])
    c.vline(bx + bw - 1, by, bh, th.metal[0])
    c.hline(bx, by + bh - 1, bw, th.metal[1])
    hdmi_port(c, bx + 1, by + 4, th)
    for k in range(3):
        dp_port(c, bx + 1, by + 8 + 3 * k, th)
    for j in range(19, 26, 2):
        c.hline(bx + 1, by + j, 5, th.metal[1])
    # shroud body (chamfered front)
    front = chamfered(X, Y, W, H, tl=4, br=3)
    geo = c.solid(front, D, S[3], S[2], S[1], hi=S[4], lo=S[0])
    # black PCB strip along the bottom
    c.rect(X, Y + H - 3, W - 3, 3, B[2])
    c.hline(X, Y + H - 3, W - 3, B[3])
    c.hline(X, Y + H - 1, W - 3, B[1])
    # backplate hint: the far part of the side face and the back rows of the top face
    backplate(c, geo, X, Y, W, D, th, 2)
    # one dark recess for both fans, accent stripe along the top edge band
    well = rrect_mask(X + 1, Y + 4, W - 3, 15, 6)
    c.paint(well, th.well[1])
    c.paint(edge_mask(well, "u") | edge_mask(well, "l"), th.well[0])
    for fx in (X + 3, X + 19):
        fan(c, fx, Y + 4, 15, 7, th, hub_r=2.6, swirl=0.9, wid=0.8)
    c.hline(X + 6, Y + 1, W - 12, th.trim[3])
    c.hline(X + 6, Y + 2, W - 12, th.trim[1])
    # heatpipes on the top face
    for (yy, x0, w) in ((Y - 6, X + 14, 17), (Y - 3, X + 9, 17)):
        c.rect(x0, yy, w, 2, th.metal[2])
        c.hline(x0, yy, w, th.metal[4])
        c.hline(x0, yy + 1, w, th.metal[1])
    # 2 power plugs top right
    def plugs(sub):
        plug8(sub, X + 21, Y - 5, th)
        plug8(sub, X + 28, Y - 5, th)
    part(c, plugs, outline=S[0])
    fingers(c, X + 9, Y + H, 24, (X + 20, X + 22), th)
    return c


# ------------------------------------------------------------------ g4 : triple fan, lit (2019+)
def mesh(c, x, y, w, h, th):
    """perforated bracket area: dark/light checker"""
    c.rect(x, y, w, h, th.metal[1])
    for j in range(h):
        for i in range(w):
            if (i + j) % 2 == 0:
                c.px(x + i, y + j, th.metal[0])


def g4_model(th):
    c = Canvas(64, 64)
    S = th.shroud
    B = th.pcb2
    X, Y, W, H, D = 16, 16, 37, 28, 10
    # mesh bracket (4 px wide)
    bx, by, bw, bh = X - 5, Y, 4, H + 6
    c.rect(bx, by, bw, bh, th.metal[2])
    c.hline(bx, by, bw, th.metal[4])
    c.vline(bx, by, bh, th.metal[3])
    c.vline(bx + bw - 1, by, bh, th.metal[0])
    c.hline(bx, by + bh - 1, bw, th.metal[1])
    c.hline(bx + 1, by + 3, 3, th.metal[0])
    for k in range(3):
        c.hline(bx + 1, by + 6 + 3 * k, 3, th.metal[0])
    mesh(c, bx + 1, by + 16, 2, 16, th)
    front = chamfered(X, Y, W, H, tl=7, br=7)
    geo = c.solid(front, D, S[3], S[2], S[1], hi=S[4], lo=S[0])
    # PCB strip along the bottom
    c.rect(X, Y + H - 3, W - 7, 3, B[2])
    c.hline(X, Y + H - 3, W - 7, B[3])
    c.hline(X, Y + H - 1, W - 7, B[1])
    backplate(c, geo, X, Y, W, D, th, 3)
    gl = th.glow
    # pill recess for the three fans
    well = rrect_mask(X + 1, Y + 6, W - 4, 13, 6)
    c.paint(well, th.well[1])
    c.paint(edge_mask(well, "u") | edge_mask(well, "l"), th.well[0])
    for fx in (X + 2, X + 13, X + 24):
        fan(c, fx, Y + 7, 11, 5, th, hub_r=1.7, swirl=0.9, wid=0.76, hubring=False, clean=True)
    # sharp cut lines on the lower band: a lit slash and a glowing step
    for k in range(0, 18):
        x_, y_ = X + 4 + k, Y + 21
        c.px(x_, y_, S[0]); c.px(x_, y_ + 1, gl[3]); c.px(x_, y_ + 2, gl[1])
    for k in range(0, 4):
        x_, y_ = X + 22 + k, Y + 21 + k
        c.px(x_, y_, S[0]); c.px(x_, y_ + 1, gl[2]); c.px(x_, y_ + 2, gl[1])
    # two sharp slash cuts in the top band (dark cut + lit twin)
    for x0 in (X + 21, X + 27):
        for k in range(5):
            c.px(x0 - k, Y + 1 + k, S[0])
            c.px(x0 - k + 1, Y + 1 + k, S[3])
    # glowing edge along the chamfer + light strip on the top face
    for i in range(W - 7, W):
        j = H - 1 - (7 - (W - 1 - i)) if (W - 1 - i) < 7 else None
        if j is not None:
            c.px(X + i, Y + j - 1, gl[3])
    c.hline(X + 10, Y - 4, 14, gl[3])
    c.hline(X + 10, Y - 3, 14, gl[1])
    def plugs(sub):
        plug8(sub, X + 25, Y - 6, th, led=False)
        sub.rect(X + 28, Y - 8, 2, 1, th.glow[3])
    part(c, plugs, outline=S[0])
    fingers(c, X + 9, Y + H, 24, (X + 20, X + 22), th)
    return c


def bracket_icon(c, bx, by, bh, th, ports=(), w=3):
    c.rect(bx, by, w, bh, th.metal[2])
    c.hline(bx, by, w, th.metal[4])
    c.vline(bx, by, bh, th.metal[3])
    c.vline(bx + w - 1, by, bh, th.metal[0])
    for j in ports:
        c.hline(bx + (1 if w > 2 else 0), by + j, w - (1 if w > 2 else 0), GL[0])


def g3_icon(th):
    c = Canvas(32, 32)
    S = th.shroud
    B = th.pcb2
    X, Y, W, H, D = 8, 12, 17, 14, 4
    bracket_icon(c, X - 4, Y - 1, H + 4, th, ports=(2, 5, 8), w=3)
    front = chamfered(X, Y, W, H, tl=2, br=2)
    geo = c.solid(front, D, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.rect(X, Y + H - 2, W - 2, 2, B[2])
    c.hline(X, Y + H - 2, W - 2, B[3])
    c.hline(X, Y + H - 1, W - 2, B[1])
    backplate(c, geo, X, Y, W, D, th, 1)
    well = rrect_mask(X + 1, Y + 3, W - 2, 9, 3)
    c.paint(well, th.well[1])
    c.paint(edge_mask(well, "u") | edge_mask(well, "l"), th.well[0])
    for fx in (X + 2, X + 9):
        fan_ascii(c, fx, Y + 4, FAN7, th, ring=th.get("iring"))
    c.rect(X, Y + H - 2, 0, 0, S[0])
    c.hline(X + 3, Y + 1, W - 6, th.trim[2])
    c.px(X + 3, Y + 1, th.trim[3]); c.px(X + 4, Y + 1, th.trim[3])
    c.hline(X + 5, Y - 2, 6, th.metal[3])
    def plugs(sub):
        for px in (X + 10, X + 14):
            sub.rect(px, Y - 4, 3, 2, th.plug[2])
            sub.hline(px, Y - 4, 3, th.plug[4])
    part(c, plugs, outline=S[0])
    fingers(c, X + 3, Y + H, 11, (X + 8, X + 9), th, h=2)
    return c


def g4_icon(th):
    c = Canvas(32, 32)
    S = th.shroud
    B = th.pcb2
    X, Y, W, H, D = 8, 9, 17, 17, 5
    bracket_icon(c, X - 3, Y - 1, H + 4, th, ports=(2, 5, 8), w=2)
    for j in range(11, 19, 3):
        c.hline(X - 3, Y - 1 + j, 2, th.metal[1])
    front = chamfered(X, Y, W, H, tl=4, br=4)
    geo = c.solid(front, D, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.rect(X, Y + H - 2, W - 4, 2, B[2])
    c.hline(X, Y + H - 2, W - 4, B[3])
    c.hline(X, Y + H - 1, W - 4, B[1])
    backplate(c, geo, X, Y, W, D, th, 2)
    well = rrect_mask(X + 1, Y + 4, W - 2, 8, 3)
    c.paint(well, th.well[1])
    c.paint(edge_mask(well, "u") | edge_mask(well, "l"), th.well[0])
    for fx in (X + 1, X + 6, X + 11):
        fan_ascii(c, fx, Y + 5, FAN5, th, ring=th.get("iring"))
    gl = th.glow
    c.hline(X + 2, Y + 14, 7, gl[3])
    c.hline(X + 2, Y + 15, 7, gl[1])
    c.px(X + 9, Y + 15, gl[3]); c.px(X + 10, Y + 16, gl[3])
    c.hline(X + 4, Y - 2, 6, gl[3])
    def plugs(sub):
        sub.rect(X + 11, Y - 5, 4, 2, th.plug[2])
        sub.hline(X + 11, Y - 5, 4, th.plug[4])
        sub.px(X + 13, Y - 4, gl[3])
    part(c, plugs, outline=S[0])
    fingers(c, X + 3, Y + H, 11, (X + 8, X + 9), th, h=2)
    return c


def build_preview(fn, name, ks=(1, 2, 3), scale=8):
    imgs = []
    for k in ks:
        c = fn(THEMES[k])
        imgs.append(place(finish(c), "icon" if c.w == 32 else "model"))
    W_ = sum(i.width * scale for i in imgs) + 8 * (len(imgs) + 1)
    sh = Image.new("RGBA", (W_, imgs[0].height * scale + 16), NAVY)
    x = 8
    for i in imgs:
        sh.alpha_composite(up(i, scale), (x, 8))
        x += i.width * scale + 8
    sh.save(os.path.join(HERE, "..", "prev", "gpu", name + ".png"))
    return imgs


GENS = {}


def build(gens=None):
    d = out_dir("gpu")
    for g, (mf, icf) in sorted(GENS.items()):
        if gens and g not in gens:
            continue
        for k, th in THEMES.items():
            save(place(finish(mf(th)), "model"), os.path.join(d, "model-g%d-s%d.png" % (g, k)))
            save(place(finish(icf(th)), "icon"), os.path.join(d, "icon-g%d-s%d.png" % (g, k)))
    return sheet("gpu", gens=sorted(GENS), labels={1: "g1 -2000", 2: "g2 2001-09", 3: "g3 2010-18", 4: "g4 2019+"})


GENS[1] = (g1_model, g1_icon)
GENS[2] = (g2_model, g2_icon)
GENS[3] = (g3_model, g3_icon)
GENS[4] = (g4_model, g4_icon)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("dev:"):
        _, fn, ks, sc = sys.argv[1].split(":")
        build_preview(globals()[fn], fn, ks=tuple(int(k) for k in ks), scale=int(sc))
    else:
        want = [int(a[1:]) for a in sys.argv[1:] if a[0] == "g"]
        build(want or None)
