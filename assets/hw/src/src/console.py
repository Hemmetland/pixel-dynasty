"""Console (Paragon) hardware art: 3 generations x 3 styles, model 64x64 + icon 32x32.

run:  python3 src/console.py            -> writes out/console/model-gN-sS.png, icon-gN-sS.png, sheet.png
      python3 src/console.py g2         -> only one generation (also writes a preview strip into prev/)
"""
import os
import sys

import math

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "lib"))
from hwlib import *  # noqa: E402,F401,F403

P = PAL
V = P["console"]
G = P["graphite"]
W = P["white"]
ST = P["steel"]

# ------------------------------------------------------------------ themes
# roles: shell (body), panel (inset gloss/dark panels), trim (accent lines, emblem), glow (light bar / LED),
#        pad (controller body), pad_btn (controller accent), stick (sticks), port (ports/slots)
THEMES = {
    1: Theme("Graphite", shell=P["graphite_mid"], panel=P["glass_dk"], trim=V, glow=V, led=P["led_violet"], matte=P["ink"],
             pad=P["graphite_pad"], pad_dark=P["pcb_black"], pad_btn=V, pad_glow=V, plug=ST),
    2: Theme("Ljus", shell=W, panel=P["pcb_black"], trim=V, glow=V, led=P["led_violet"], matte=G,
             pad=G, pad_dark=P["pcb_black"], pad_btn=V, pad_glow=V, plug=ST),
    3: Theme("Violett", shell=V, panel=P["pcb_black"], trim=W, glow=P["led_blue"], led=P["led_blue"], matte=P["pcb_black"],
             pad=G, pad_dark=P["pcb_black"], pad_btn=V, pad_glow=P["led_blue"], plug=ST),
}


def buttons4(c, x, y, th):
    """Four face buttons as a diamond; (x, y) = top button. Pairs share a tone so no pixel is isolated."""
    c.px(x, y, th.pad_btn[3]); c.px(x - 1, y + 1, th.pad_btn[3])
    c.px(x + 1, y + 1, th.pad_btn[2]); c.px(x, y + 2, th.pad_btn[2])


def dpad(c, x, y, col):
    """Plus-shaped d-pad, (x, y) = its centre."""
    c.paint({(x, y - 1), (x - 1, y), (x, y), (x + 1, y), (x, y + 1)}, col)


def side_cols(side_mask):
    """dict column -> sorted rows of the side face (helper for vents drawn on the right face)."""
    d = {}
    for x, y in side_mask:
        d.setdefault(x, []).append(y)
    for k in d:
        d[k].sort()
    return d


# ------------------------------------------------------------------ g2 : sleek media box (2012-2019)
def pad_g2(c, ox, oy, th):
    """Wireless pad lying flat, seen from the front-above. Area 29 x 17 at (ox, oy), thickness 2."""
    S = th.pad
    D = th.pad_dark
    body = (rrect_mask(ox + 7, oy, 15, 11, 4) | ellipse_mask(ox, oy + 3, 12, 14) | ellipse_mask(ox + 17, oy + 3, 12, 14))
    under = (shift(body, 0, 2) | shift(body, 0, 1)) - body
    c.paint(under, S[1])
    c.paint(body, S[2])
    c.paint({p for p in edge_mask(body, "u") if p[0] > ox + 4}, S[3])
    c.paint({p for p in edge_mask(body, "l") if p[1] < oy + 12}, S[3])
    # light strip along the back edge between the shoulders
    for x in range(ox + 10, ox + 19):
        c.px(x, oy + 1, th.pad_glow[3])
    # d-pad (left), face buttons (right)
    dpad(c, ox + 6, oy + 6, D[1])
    buttons4(c, ox + 21, oy + 4, th)
    # touch pad, sticks
    c.rect(ox + 10, oy + 3, 8, 3, D[1])
    c.hline(ox + 10, oy + 3, 8, D[2])
    for sx, sy in ((ox + 7, oy + 9), (ox + 16, oy + 9)):
        c.ellipse(sx, sy, 5, 4, D[0])
        c.rect(sx + 1, sy + 1, 3, 2, D[2])
        c.px(sx + 1, sy + 1, D[4])
    return body | under


def diamond(c, x, y, col, mid, hi):
    """5x5 abstract emblem (a diamond with a bright centre) - an original mark, no real brand."""
    for dy, w in ((0, 1), (1, 3), (2, 5), (3, 3), (4, 1)):
        c.hline(x + 2 - w // 2, y + dy, w, col)
    c.px(x + 2, y + 2, hi)


def g2_model(th):
    c = Canvas(64, 64)
    S = th.shell
    X, Y, Wd, H, Dp = 4, 23, 42, 13, 11
    # base plinth (inset) first, the body overlaps it
    c.box(X + 3, Y + H, Wd - 6, 3, Dp - 3, S[1], S[0], S[0])
    geo = c.box(X, Y, Wd, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.hline(X + 3, Y + H + 1, Wd - 6, th.panel[1])
    # glossy top panel, inset
    Pn = th.panel
    top = geo["top"]
    inner = erode(top, 2)
    c.paint(inner, Pn[2])
    c.paint({p for p in inner if (p[0], p[1] + 1) not in inner or (p[0] - 1, p[1]) not in inner}, Pn[3])
    c.paint({p for p in inner if (p[0], p[1] - 1) not in inner or (p[0] + 1, p[1]) not in inner}, Pn[1])
    for (gx, gy, n) in ((X + 11, Y - 3, 5), (X + 19, Y - 3, 3)):
        for i in range(n):
            c.px(gx + i, gy - i, Pn[4])
    # front: chamfer band + light bar
    c.vline(X, Y + 1, H - 2, S[3])
    c.hline(X, Y, Wd, S[4])
    c.rect(X + 1, Y + 1, Wd - 1, 4, S[3])
    gl = th.glow
    c.hline(X + 4, Y + 2, Wd - 8, gl[1])
    c.hline(X + 4, Y + 3, Wd - 8, gl[1])
    c.hline(X + 5, Y + 2, Wd - 10, gl[3])
    c.hline(X + 8, Y + 2, Wd - 16, gl[4])
    # emblem, slot slit, touch buttons, ports
    diamond(c, X + 3, Y + 6, th.trim[2], th.trim[1], th.trim[4])
    c.hline(X + 12, Y + 7, 20, S[0])
    c.hline(X + 12, Y + 8, 20, S[3])
    for bx in (X + 35, X + 40):
        c.ellipse(bx, Y + 6, 4, 4, S[0])
        c.rect(bx + 1, Y + 7, 2, 2, S[2])
        c.px(bx + 1, Y + 7, S[4])
    for px_ in (X + 12, X + 18):
        c.rect(px_, Y + 10, 4, 2, S[0])
        c.hline(px_ + 1, Y + 10, 2, S[1])
    c.led(X + 25, Y + 10, th.led if th.name != "Violett" else th.led, 2, 1, halo=False)
    # right side vents
    sc = side_cols(geo["side"])
    for j in range(2, 9, 2):
        col = sc.get(X + Wd + j)
        if col:
            for y in col[3:-3]:
                c.px(X + Wd + j, y, S[0])
    # pad in front
    sub = Canvas(64, 64)
    pad_g2(sub, 0, 0, th)
    c.composite(sub, 17, 38, outline=S[0])
    return c


PAD_SMALL = [
    ".#########.",
    "###########",
    "###########",
    "####...####",
    "###.....###",
    ".##.....##.",
]
PAD_SMALL_BUMP = [
    "##.......##",
    "###########",
    "###########",
    "####...####",
    "###.....###",
    ".##.....##.",
]


def pad_icon_small(c, ox, oy, th, rows, strip):
    """11 x 6 (+1 px edge) pad for the icons, tucked into the lower-right corner. strip=True: light bar on the top edge,
    False: glowing centre badge (wired g1 pad with shoulder bumpers)."""
    S, D = th.pad, th.pad_dark
    body = ascii_mask(rows, ox, oy)
    under = shift(body, 0, 1) - body
    c.paint(under, S[1])
    c.paint(body, S[2])
    c.paint({p for p in edge_mask(body, "u") if p[0] > ox + 1}, S[3])
    c.paint({p for p in edge_mask(body, "l") if p[1] < oy + 4}, S[3])
    if strip:
        c.hline(ox + 4, oy, 3, th.pad_glow[3])
    else:
        c.hline(ox + 4, oy + 1, 3, th.pad_glow[3])
    dpad(c, ox + 2, oy + 2, D[1])
    buttons4(c, ox + 9, oy + 1, th)
    return body | under


def g2_icon(th):
    c = Canvas(32, 32)
    S = th.shell
    X, Y, Wd, H, Dp = 4, 10, 20, 9, 5
    geo = c.box(X, Y, Wd, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    Pn = th.panel
    inner = erode(geo["top"], 1)
    c.paint(inner, Pn[2])
    c.paint({p for p in inner if (p[0] - 1, p[1]) not in inner or (p[0], p[1] + 1) not in inner}, Pn[3])
    c.px(X + 9, Y - 2, Pn[4]); c.px(X + 10, Y - 3, Pn[4])
    c.hline(X, Y, Wd, S[4])
    c.vline(X, Y + 1, H - 2, S[3])
    gl = th.glow
    c.hline(X + 2, Y + 1, Wd - 4, gl[3])
    c.hline(X + 2, Y + 2, Wd - 4, gl[1])
    c.hline(X + 6, Y + 1, Wd - 12, gl[4])
    # slit, buttons, emblem
    c.hline(X + 7, Y + 5, 8, S[0])
    c.paint({(X + 3, Y + 4), (X + 2, Y + 5), (X + 4, Y + 5), (X + 3, Y + 6)}, th.trim[2])
    c.px(X + 3, Y + 5, th.trim[4])
    c.rect(X + 17, Y + 5, 2, 2, S[0])
    # vents on the side
    sc = side_cols(geo["side"])
    for j in (1, 3):
        col = sc.get(X + Wd + j)
        if col and len(col) > 4:
            for y in col[2:-2]:
                c.px(X + Wd + j, y, S[0])
    sub = Canvas(32, 32)
    pad_icon_small(sub, 0, 0, th, PAD_SMALL, True)
    c.composite(sub, 17, 20)
    return c


def render(fn, name, ks=(1, 2, 3), scale=8):
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
    p = os.path.join(HERE, "..", "prev", name + ".png")
    sh.save(p)
    return imgs


# ------------------------------------------------------------------ g1 : chunky disc console (2005-2011)
def pad_g1(c, ox, oy, th):
    """Wired pad lying flat, 27 x 18 at (ox, oy) (incl. 2 px thickness)."""
    S, D = th.pad, th.pad_dark
    body = (rrect_mask(ox + 6, oy + 1, 15, 10, 4) | ellipse_mask(ox, oy + 4, 11, 12) | ellipse_mask(ox + 16, oy + 4, 11, 12)
            | rrect_mask(ox + 3, oy, 6, 3, 1) | rrect_mask(ox + 18, oy, 6, 3, 1))  # shoulder bumpers
    under = (shift(body, 0, 2) | shift(body, 0, 1)) - body
    c.paint(under, S[1])
    c.paint(body, S[2])
    c.paint({p for p in edge_mask(body, "u") if p[0] > ox + 2}, S[3])
    c.paint({p for p in edge_mask(body, "l") if p[1] < oy + 12}, S[3])
    # left stick (upper left), d-pad (lower left)
    c.ellipse(ox + 4, oy + 4, 5, 4, D[0])
    c.rect(ox + 5, oy + 5, 3, 2, D[2]); c.px(ox + 5, oy + 5, D[4])
    dpad(c, ox + 9, oy + 9, D[1])
    # four face buttons (right), right stick (lower right)
    buttons4(c, ox + 19, oy + 3, th)
    c.ellipse(ox + 14, oy + 8, 5, 4, D[0])
    c.rect(ox + 15, oy + 9, 3, 2, D[2]); c.px(ox + 15, oy + 9, D[4])
    # centre badge
    c.ellipse(ox + 11, oy + 3, 5, 4, D[0])
    c.rect(ox + 12, oy + 4, 3, 2, th.pad_glow[3]); c.px(ox + 12, oy + 4, th.pad_glow[4])
    return body | under


def cable(c, pts, col, hi):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        c.line(x0, y0, x1, y1, col)


def plug(c, x, y, th):
    """Wired-pad plug lying on the floor, tip pointing left: steel tip with a gold contact strip + dark sleeve. 9 x 5."""
    g = P["gold"]
    c.rect(x, y + 1, 5, 3, ST[2])
    c.hline(x, y + 1, 5, ST[4])
    c.hline(x, y + 3, 5, ST[0])
    c.hline(x + 1, y + 2, 3, g[2])
    c.rect(x + 5, y, 4, 5, th.pad_dark[2])
    c.hline(x + 5, y, 4, th.pad_dark[3])
    c.hline(x + 5, y + 4, 4, th.pad_dark[0])


def g1_model(th):
    c = Canvas(64, 64)
    S = th.shell
    X, Y, Wd, H, Dp, R = 4, 22, 40, 20, 12, 5
    geo = c.rbox(X, Y, Wd, H, Dp, R, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    # pillow bevel on the front face
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    inner = erode(F, 1)
    c.paint(edge_mask(inner, "u") & {p for p in inner if p[0] < X + Wd - 5}, S[3])
    # glossy top glints + emblem plate
    for (gx, gy, n) in ((X + 14, Y - 3, 6), (X + 21, Y - 3, 3)):
        for i in range(n):
            c.px(gx + i, gy - i, S[4])
    # emblem plate on top (original mark: ring + bright core)
    ex, ey = X + 22, Y - 9
    c.ellipse(ex, ey, 9, 5, th.trim[1])
    c.ellipse(ex + 1, ey + 1, 7, 3, th.trim[2])
    c.hline(ex + 3, ey + 2, 3, th.trim[4])
    # slot loading drive
    c.rrect(X + 8, Y + 3, 26, 4, 1, S[0])
    c.hline(X + 9, Y + 4, 24, th.matte[1])
    c.hline(X + 9, Y + 6, 24, S[3])
    c.led(X + 36, Y + 4, th.led, 1, 1, halo=False)
    # matte lower panel
    M = th.matte
    pm = rrect_mask(X + 3, Y + 9, 34, 7, 2)
    c.paint(pm, M[2])
    c.paint(edge_mask(pm, "u"), M[3])
    c.paint(edge_mask(pm, "d"), M[1])
    # power button with LED ring, eject
    c.ellipse(X + 4, Y + 9, 7, 7, th.led[1])
    c.ellipse(X + 5, Y + 10, 5, 5, S[3])
    c.rect(X + 6, Y + 11, 3, 3, S[2])
    c.px(X + 6, Y + 11, S[4])
    c.ellipse(X + 14, Y + 11, 4, 4, M[0])
    c.rect(X + 15, Y + 12, 2, 2, S[2])
    c.px(X + 15, Y + 12, S[4])
    # vents
    for i in range(3):
        c.vline(X + 21 + 2 * i, Y + 11, 3, M[0])
    # usb flap + ports
    c.rect(X + 28, Y + 10, 8, 5, S[2])
    c.hline(X + 28, Y + 10, 8, S[4])
    for i in range(2):
        c.rect(X + 29 + 3 * i, Y + 12, 2, 2, M[0])
    c.hline(X + 29, Y + 14, 5, P["gold"][2])
    # right side vents
    sc = side_cols(geo["side"])
    for j in range(3, 10, 2):
        col = sc.get(X + Wd + j)
        if col and len(col) > 8:
            for y in col[3:-4]:
                c.px(X + Wd + j, y, S[0])
    # cable + plug, pad
    cable(c, [(31, 47), (27, 49), (22, 50), (17, 51), (15, 51)], th.pad_dark[2], None)
    plug(c, 7, 49, th)
    sub = Canvas(64, 64)
    pad_g1(sub, 0, 0, th)
    c.composite(sub, 29, 39, outline=S[0])
    return c


def g1_icon(th):
    c = Canvas(32, 32)
    S, M = th.shell, th.matte
    X, Y, Wd, H, Dp, R = 4, 11, 18, 10, 6, 3
    geo = c.rbox(X, Y, Wd, H, Dp, R, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    c.px(X + 6, Y - 2, S[4]); c.px(X + 7, Y - 3, S[4]); c.px(X + 8, Y - 4, S[4])
    c.hline(X + 3, Y + 2, 10, S[0])
    c.hline(X + 4, Y + 3, 8, S[3])
    c.px(X + 14, Y + 2, th.led[3])
    pm = rrect_mask(X + 2, Y + 5, 14, 4, 1)
    c.paint(pm, M[2])
    c.paint(edge_mask(pm, "u"), M[3])
    c.paint({(X + 4, Y + 5), (X + 3, Y + 6), (X + 5, Y + 6), (X + 4, Y + 7)}, th.led[1])
    c.px(X + 4, Y + 6, S[3])
    c.vline(X + 8, Y + 6, 2, M[0]); c.vline(X + 10, Y + 6, 2, M[0])
    c.rect(X + 12, Y + 6, 3, 2, S[2]); c.hline(X + 12, Y + 6, 3, S[4])
    sc = side_cols(geo["side"])
    for j in (1, 3):
        col = sc.get(X + Wd + j)
        if col and len(col) > 4:
            for y in col[2:-2]:
                c.px(X + Wd + j, y, S[0])
    sub = Canvas(32, 32)
    pad_icon_small(sub, 0, 0, th, PAD_SMALL_BUMP, False)
    c.composite(sub, 16, 22)
    return c


# ------------------------------------------------------------------ g3 : monolith (2020+)
PAD_G3 = [
    ".....############.....",
    "...################...",
    "..##################..",
    ".####################.",
    "######################",
    "######################",
    "######################",
    "######################",
    "######################",
    "#########....#########",
    "########......########",
    "#######........#######",
    "######..........######",
    ".#####..........#####.",
    "..####..........####..",
    "...##............##...",
]


def ascii_mask(rows, ox, oy, ch="#"):
    return {(ox + x, oy + y) for y, r in enumerate(rows) for x, v in enumerate(r) if v == ch}


def pad_g3(c, ox, oy, th):
    """Compact modern pad standing upright (frontal view, 2 px oblique thickness). 22 x 16 at (ox, oy)."""
    S, D = th.pad, th.pad_dark
    body = ascii_mask(PAD_G3, ox, oy)
    thick = set()
    for k in range(1, 3):
        thick |= shift(body, k, -k)
    thick -= body
    c.paint(thick, S[1])
    c.paint(body, S[2])
    c.paint({p for p in edge_mask(body, "u") if p[0] > ox + 2}, S[3])
    c.paint({p for p in edge_mask(body, "l") if p[1] < oy + 12}, S[3])
    c.paint({p for p in edge_mask(body, "d") if p[1] > oy + 8}, S[1])
    # light bar along the top, touch pad
    c.hline(ox + 7, oy + 1, 8, th.pad_glow[3])
    c.rect(ox + 8, oy + 3, 6, 3, D[1])
    c.hline(ox + 8, oy + 3, 6, D[2])
    # left stick, d-pad, buttons, right stick
    c.ellipse(ox + 2, oy + 3, 4, 4, D[0])
    c.rect(ox + 3, oy + 4, 2, 2, D[2]); c.px(ox + 3, oy + 4, D[4])
    dpad(c, ox + 6, oy + 9, D[1])
    buttons4(c, ox + 19, oy + 3, th)
    c.ellipse(ox + 13, oy + 6, 4, 4, D[0])
    c.rect(ox + 14, oy + 7, 2, 2, D[2]); c.px(ox + 14, oy + 7, D[4])
    return body | thick


def g3_model(th):
    c = Canvas(64, 64)
    S, M, Pn = th.shell, th.matte, th.panel
    X, Y, Wd, H, Dp = 7, 19, 17, 37, 7
    # stand
    c.box(X - 2, Y + H, Wd + 4, 3, 9, M[3], M[2], M[1], hi=M[4], lo=M[0])
    geo = c.rbox(X, Y, Wd, H, Dp, 5, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    # dark panel with a curved fin edge
    pan = set()
    for r in range(3, H - 3):
        xb = X + 7 + int(round(1.6 * math.sin(math.pi * (r - 3) / (H - 7))))
        for x in range(xb + 1, X + Wd - 2):
            pan.add((x, Y + r))
    pan &= rrect_mask(X + 6, Y + 3, Wd - 8, H - 6, 4)
    c.paint(pan, M[2])
    edge_l = {p for p in pan if (p[0] - 1, p[1]) not in pan}
    c.paint({p for p in pan if (p[0] + 1, p[1]) not in pan}, M[1])
    c.paint({p for p in pan if (p[0], p[1] - 1) not in pan}, M[3])
    gl = th.glow
    for (x, y) in edge_l:
        c.px(x, y, gl[3])
        c.px(x - 1, y, gl[1])
    # vents in the panel
    for i in range(4):
        c.hline(X + 11, Y + 8 + 2 * i, 3, M[0])
    # disc slot + power button on the shell area
    c.hline(X + 2, Y + 28, 4, S[0])
    c.hline(X + 2, Y + 29, 4, S[3])
    c.ellipse(X + 2, Y + 31, 4, 4, S[0])
    c.rect(X + 3, Y + 32, 2, 2, S[3])
    c.px(X + 3, Y + 32, S[4])
    c.led(X + 9, Y + 32, th.led, 1, 2, halo=False)
    # top curved vent with glow
    cx_, cy_ = X + 9, Y - 4
    slot = ellipse_mask(cx_ - 5, cy_ - 1, 11, 3)
    c.paint(slot, S[0])
    c.paint({p for p in edge_mask(slot, "d")}, gl[2])
    # side seam glow
    sc = side_cols(geo["side"])
    col = sc.get(X + Wd + 3)
    if col:
        for y in col[3:-4]:
            c.px(X + Wd + 3, y, gl[3])
    sub = Canvas(64, 64)
    pad_g3(sub, 0, 0, th)
    c.composite(sub, 32, 41, outline=S[0])
    return c


PAD_G3_ICON = [
    "..########..",
    ".##########.",
    "############",
    "############",
    "####....####",
    "###......###",
    ".##......##.",
]


def pad_icon_g3(c, ox, oy, th):
    """12 x 7 upright pad for the icon."""
    S, D = th.pad, th.pad_dark
    body = ascii_mask(PAD_G3_ICON, ox, oy)
    under = shift(body, 0, 1) - body
    c.paint(under, S[1])
    c.paint(body, S[2])
    c.paint({p for p in edge_mask(body, "u") if p[0] > ox + 1}, S[3])
    c.paint({p for p in edge_mask(body, "l") if p[1] < oy + 5}, S[3])
    c.hline(ox + 4, oy, 4, th.pad_glow[3])
    dpad(c, ox + 2, oy + 3, D[1])
    buttons4(c, ox + 9, oy + 2, th)
    c.hline(ox + 5, oy + 2, 2, D[1])
    return body | under


def g3_icon(th):
    c = Canvas(32, 32)
    S, M = th.shell, th.matte
    X, Y, Wd, H, Dp = 5, 9, 8, 18, 4
    c.box(X - 2, Y + H, Wd + 4, 2, 5, M[3], M[2], M[1], hi=M[4], lo=M[0])
    geo = c.rbox(X, Y, Wd, H, Dp, 2, S[3], S[2], S[1], hi=S[4], lo=S[0])
    F = geo["front"]
    c.paint(edge_mask(F, "d") | edge_mask(F, "r"), S[1])
    c.paint(edge_mask(F, "u") | edge_mask(F, "l"), S[3])
    pan = rrect_mask(X + 4, Y + 2, 3, H - 5, 1)
    c.paint(pan, M[2])
    gl = th.glow
    for r in range(3, H - 3):
        c.px(X + 3, Y + r, gl[3])
    for i in range(3):
        c.hline(X + 5, Y + 4 + 2 * i, 2, M[0])
    c.hline(X + 1, Y + 12, 2, S[0])
    c.rect(X + 1, Y + 14, 2, 2, S[0])
    c.px(X + 1, Y + 14, S[3])
    c.hline(X + 5, Y - 3, 3, S[0])
    c.hline(X + 5, Y - 2, 3, gl[2])
    sc = side_cols(geo["side"])
    col = sc.get(X + Wd + 1)
    if col:
        for y in col[2:-3]:
            c.px(X + Wd + 1, y, gl[3])
    sub = Canvas(32, 32)
    pad_icon_g3(sub, 0, 0, th)
    c.composite(sub, 15, 21, outline=S[0])
    return c


GENS = {}


def build(gens=None):
    d = out_dir("console")
    for g, (mf, icf) in sorted(GENS.items()):
        if gens and g not in gens:
            continue
        for k, th in THEMES.items():
            save(place(finish(mf(th)), "model"), os.path.join(d, "model-g%d-s%d.png" % (g, k)))
            save(place(finish(icf(th)), "icon"), os.path.join(d, "icon-g%d-s%d.png" % (g, k)))
    return sheet("console", gens=sorted(GENS), labels={1: "g1 2005-11", 2: "g2 2012-19", 3: "g3 2020+"})


GENS[1] = (g1_model, g1_icon)
GENS[3] = (g3_model, g3_icon)
GENS[2] = (g2_model, g2_icon)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("dev:"):
        _, fn, ks, sc = sys.argv[1].split(":")
        render(globals()[fn], fn + "_dev", ks=tuple(int(k) for k in ks), scale=int(sc))
    else:
        want = [int(a[1:]) for a in sys.argv[1:] if a[0] == "g"]
        build(want or None)
