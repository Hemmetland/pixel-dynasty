"""pc g4: dual-chamber glass showcase (2020 and later)."""
from pc_common import *  # noqa: F401,F403

THEMES = {}
THEMES[4] = {
    1: mk("Graphite", P["graphite"], BLUE, BLUE, P["led_violet"], rgb=(P["led_violet"], BLUE, P["led_blue"])),
    2: mk("Ljus", WH, BLUE, BLUE, P["led_violet"], rgb=(P["led_violet"], BLUE, P["led_blue"])),
    3: mk("Bla", BLUE, P["graphite"], P["led_blue"], P["led_amber"], rgb=(P["led_amber"], P["led_blue"], P["led_white"])),
}


def tube(c, pts, G_):
    """2 px tube along axis-aligned points: light top/left row, base lower/right row"""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if y0 == y1:
            c.hline(min(x0, x1), y0, abs(x1 - x0) + 2, G_[3])
            c.hline(min(x0, x1), y0 + 1, abs(x1 - x0) + 2, G_[2])
        else:
            c.vline(x0, min(y0, y1), abs(y1 - y0) + 2, G_[3])
            c.vline(x0 + 1, min(y0, y1), abs(y1 - y0) + 2, G_[2])


def g4_model(th):
    c = Canvas(64, 64)
    S, D, T, G_, G2, GLS = th.shell, th.panel, th.trim, th.glow, th.glow2, th.glass
    X, Y, W, H, Dp = 3, 18, 33, 30, 13
    for fx in (3, W - 8):
        c.box(X + fx, Y + H, 5, 3, 3, D[3], D[2], D[1], hi=D[4], lo=D[0])
    geo = c.box(X, Y, W, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.vline(X, Y + 1, H - 2, S[3])
    # power button on the top face, front right
    c.ellipse(X + W - 9, Y - 4, 5, 3, D[0])
    c.hline(X + W - 8, Y - 3, 3, G_[3])
    # front glass: dark chamber
    c.rect(X + 2, Y + 2, W - 4, H - 4, GLS[1])
    # underglow strip in the bottom frame
    c.hline(X + 4, Y + H - 2, W - 8, G2[2])
    # radiator + 3 RGB fans
    c.rect(X + 3, Y + 3, 10, 24, ST[0])
    c.vline(X + 3, Y + 3, 24, ST[1])
    for i in range(3):
        r = th.rgb[i]
        draw_afan(c, X + 4, Y + 3 + 8 * i, "f8", r[3], r[2], D[0], D[0], blade2=r[1])
    # tubes in the accent colour, pump / cpu block
    tube(c, [(X + 13, Y + 6), (X + 18, Y + 6), (X + 18, Y + 10)], G_)
    tube(c, [(X + 18, Y + 20), (X + 18, Y + 24), (X + 13, Y + 24)], G_)
    c.rect(X + 15, Y + 10, 8, 11, ST[1])
    c.rect(X + 16, Y + 11, 7, 10, ST[2])
    c.hline(X + 15, Y + 10, 8, ST[3])
    c.ellipse(X + 16, Y + 12, 6, 6, G_[2])
    c.ellipse(X + 17, Y + 13, 4, 4, D[1])
    c.px(X + 18, Y + 14, G_[4])
    c.hline(X + 16, Y + 19, 6, G_[1])
    # vertically mounted gpu on the right: backplate edge + two fans facing the glass
    c.rect(X + 25, Y + 3, 7, 24, D[2])
    c.vline(X + 25, Y + 3, 24, ST[2])
    c.vline(X + 26, Y + 3, 24, ST[0])
    draw_afan(c, X + 26, Y + 5, "f6", G2[3], G2[2], D[0], D[0])
    draw_afan(c, X + 26, Y + 12, "f6", G2[3], G2[2], D[0], D[0])
    c.vline(X + 29, Y + 19, 6, G2[3])
    c.vline(X + 30, Y + 19, 6, G2[1])
    # glass glints
    for i in range(4):
        c.px(X + 21 + i, Y + 3 + i, GLINT[0])
    # right glass: second chamber
    wm = window(c, X, Y, W, H, Dp, S, GLS, 3, H - 2, frame=S[2])
    L = Canvas(64, 64)
    sprect(L, X, Y, W, 3, Dp - 2, H - 10, H - 4, D[2])
    sprect(L, X, Y, W, 3, Dp - 2, H - 10, H - 10, ST[0])
    sprect(L, X, Y, W, 5, 6, 6, 18, G_[2])
    sprect(L, X, Y, W, 5, 5, 6, 18, G_[3])
    sprect(L, X, Y, W, 9, 9, 6, 20, G_[1])
    sprect(L, X, Y, W, 3, 4, 4, 4, GLINT[0])
    merge(c, L, wm)
    return c


def g4_icon(th):
    c = Canvas(32, 32)
    S, D, T, G_, G2, GLS = th.shell, th.panel, th.trim, th.glow, th.glow2, th.glass
    X, Y, W, H, Dp = 3, 10, 20, 15, 5
    for fx in (2, W - 5):
        c.box(X + fx, Y + H, 3, 1, 2, D[3], D[2], D[1], hi=D[4], lo=D[0])
    c.box(X, Y, W, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.vline(X, Y + 1, H - 2, S[3])
    c.rect(X + 1, Y + 1, W - 2, H - 2, GLS[1])
    # radiator with 3 rgb fans
    c.rect(X + 2, Y + 1, 6, 13, ST[0])
    for i in range(3):
        r = th.rgb[i]
        c.rect(X + 3, Y + 2 + 4 * i, 4, 3, r[3])
        c.hline(X + 4, Y + 3 + 4 * i, 2, D[0])
    # tubes, pump block, gpu strip
    c.hline(X + 8, Y + 3, 7, G_[3])
    c.vline(X + 14, Y + 3, 3, G_[3])
    c.rect(X + 11, Y + 5, 6, 5, ST[2])
    c.rect(X + 12, Y + 6, 4, 3, G_[2])
    c.vline(X + 14, Y + 10, 3, G_[3])
    c.hline(X + 8, Y + 12, 7, G_[3])
    c.rect(X + 17, Y + 2, 2, 11, D[2])
    c.vline(X + 18, Y + 2, 11, G2[3])
    # right glass
    wm = window(c, X, Y, W, H, Dp, S, GLS, 2, H - 1, k0=1, frame=S[2])
    L = Canvas(32, 32)
    sprect(L, X, Y, W, 3, 3, 4, 11, G_[3])
    sprect(L, X, Y, W, 2, 4, 2, 2, GLS[2])
    merge(c, L, wm)
    return c
