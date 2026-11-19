"""pc g3: tempered glass tower (2012-2019)."""
from pc_common import *  # noqa: F401,F403

THEMES = {}
THEMES[3] = {
    1: mk("Graphite", P["graphite"], BLUE, BLUE, P["led_violet"]),
    2: mk("Ljus", WH, BLUE, BLUE, P["led_violet"]),
    3: mk("Bla", BLUE, P["graphite"], P["led_blue"], P["led_amber"]),
}


def g3_model(th):
    c = Canvas(64, 64)
    S, D, T, G_, G2, GLS = th.shell, th.panel, th.trim, th.glow, th.glow2, th.glass
    X, Y, W, H, Dp = 6, 19, 20, 30, 17
    # slim plinth feet
    for fx in (2, W - 8):
        c.box(X + fx, Y + H, 6, 2, 3, D[3], D[2], D[1], hi=D[4], lo=D[0])
    geo = c.box(X, Y, W, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.vline(X, Y + 1, H - 2, S[3])
    # thin LED strip on the front, power button
    c.vline(X + 3, Y + 3, H - 8, S[1])
    c.vline(X + 4, Y + 3, H - 8, G_[3])
    c.vline(X + 5, Y + 3, H - 8, G_[1])
    c.ellipse(X + W - 8, Y + 4, 5, 5, D[0])
    c.ellipse(X + W - 7, Y + 5, 3, 3, G_[3])
    # intake slits, logo plate
    for j in range(0, 7, 2):
        c.hline(X + W - 8, Y + 13 + j, 5, S[1])
    c.rect(X + 8, Y + H - 5, 9, 2, T[2])
    c.hline(X + 8, Y + H - 4, 9, T[1])
    # vent slots on top (bars across the width)
    for k in (5, 8, 11):
        tprect(c, X, Y, 4, 14, k, k, S[0])
    # glass window on the right face
    wm = window(c, X, Y, W, H, Dp, S, GLS, 3, H - 2, frame=S[2])
    L = Canvas(64, 64)
    sprect(L, X, Y, W, 3, Dp - 2, 4, 5, GLS[2])
    sprect(L, X, Y, W, 3, Dp - 2, 7, 7, GLS[2])
    # motherboard
    sprect(L, X, Y, W, 4, Dp - 3, 8, 20, D[3])
    # RAM sticks
    for kk in (12, 14):
        sprect(L, X, Y, W, kk, kk, 5, 11, ST[2])
        sprect(L, X, Y, W, kk, kk, 5, 7, G2[3] if kk == 12 else G_[3])
    # cpu cooler block
    sprect(L, X, Y, W, 4, 9, 8, 12, ST[1])
    sprect(L, X, Y, W, 4, 9, 8, 8, ST[3])
    # graphics card with two glowing fans
    sprect(L, X, Y, W, 3, Dp - 2, 13, 22, ST[0])
    sprect(L, X, Y, W, 3, Dp - 2, 13, 13, ST[3])
    sprect(L, X, Y, W, 3, Dp - 2, 22, 22, G_[2])
    for kk in (7, 12):
        sfan(L, X, Y, W, kk, 17, 10, 10, fan_cols(G_[0], G_[0], G_[0], G_[0], G_[0], G_[0]), ringw=0, hub_r=0)
        sfan_a(L, X, Y, W, kk, 17, "f8", G_[3], G2[3] if kk == 12 else G_[2], D[0], D[0])
    # PSU shroud
    sprect(L, X, Y, W, 3, Dp - 2, 24, 26, D[2])
    sprect(L, X, Y, W, 3, 4, 5, 5, GLINT[0])
    merge(c, L, wm)
    return c


def g3_icon(th):
    c = Canvas(32, 32)
    S, D, T, G_, G2, GLS = th.shell, th.panel, th.trim, th.glow, th.glow2, th.glass
    X, Y, W, H, Dp = 4, 13, 13, 14, 9
    for fx in (2, W - 5):
        c.hline(X + fx, Y + H, 3, D[1])
    c.box(X, Y, W, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.hline(X, Y, W, S[4])
    c.vline(X, Y + 1, H - 2, S[3])
    # led strip, power button, logo plate
    c.vline(X + 2, Y + 2, H - 5, G_[3])
    c.rect(X + W - 6, Y + 2, 4, 4, D[0])
    c.rect(X + W - 5, Y + 3, 2, 2, G_[3])
    c.hline(X + 5, Y + H - 3, 4, T[2])
    # top vents
    tprect(c, X, Y, 2, 9, 3, 3, S[0])
    tprect(c, X, Y, 2, 9, 6, 6, S[0])
    # window with a gpu fan, ram glow and the gpu strip
    wm = window(c, X, Y, W, H, Dp, S, GLS, 2, H - 1, k0=1, frame=S[2], base=G_[0])
    L = Canvas(32, 32)
    sprect(L, X, Y, W, 7, 8, 3, 4, G2[3])
    sfan_a(L, X, Y, W, 4, 7, "i5", G_[3], G2[3], D[0], G_[1])
    sprect(L, X, Y, W, 2, Dp - 2, 11, 11, G_[3])
    merge(c, L, wm)
    return c
