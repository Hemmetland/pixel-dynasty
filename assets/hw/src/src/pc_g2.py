"""pc g2: black tower with window (2004-2011)."""
from pc_common import *  # noqa: F401,F403

THEMES = {}
THEMES[2] = {
    1: mk("Graphite", P["graphite"], BLUE, BLUE),
    2: mk("Ljus", WH, BLUE, BLUE),
    3: mk("Bla", BLUE, P["graphite"], P["led_blue"]),
}


def g2_model(th):
    c = Canvas(64, 64)
    S, D, T, G_, GLS = th.shell, th.panel, th.trim, th.glow, th.glass
    X, Y, W, H, Dp = 9, 19, 17, 32, 15
    geo = c.box(X, Y, W, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    # carry handle on the top, at the back edge: raised bar with a dark slot
    c.box(X + 12, Y - 14, 9, 4, 3, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.hline(X + 14, Y - 12, 5, D[0])
    c.hline(X + 14, Y - 11, 5, S[1])
    # front bevel
    c.vline(X, Y + 1, H - 2, S[3])
    c.hline(X, Y, W, S[4])
    # --- optical drive behind a flap
    c.rect(X + 2, Y + 3, W - 4, 7, D[0])
    c.rect(X + 3, Y + 4, W - 6, 5, ST[2])
    c.hline(X + 3, Y + 4, W - 6, ST[4])
    c.hline(X + 3, Y + 8, W - 6, ST[1])
    c.hline(X + 5, Y + 6, 6, D[0])
    c.rect(X + 12, Y + 5, 2, 2, ST[1])
    c.hline(X + 12, Y + 8, 2, G_[3])
    # --- mesh panel with the blue ring fan
    mesh = rect_mask(X + 2, Y + 12, W - 4, 15)
    c.paint(mesh, D[0])
    checker(c, erode(mesh, 1), D[1], D[2])
    draw_fan(c, X + 3, Y + 14, 11, 12, fan_cols(G_[2], D[0], D[4], D[3], D[2], None), n=5, hub_r=2.0)
    # --- power button, ports, angular trim wedge
    c.ellipse(X + 3, Y + 28, 4, 4, D[0])
    c.ellipse(X + 4, Y + 29, 2, 2, G_[3])
    c.rect(X + 8, Y + 29, 3, 2, D[0])
    c.polygon([(X + W - 8, Y + H - 1), (X + W - 2, Y + H - 6), (X + W - 2, Y + H - 1)], T[2])
    # --- window on the right face (content is drawn on a layer and clipped to the glass)
    wm = window(c, X, Y, W, H, Dp, S, GLS, 3, H - 2, frame=S[2])
    L = Canvas(64, 64)
    sprect(L, X, Y, W, 3, Dp - 2, 4, 5, GLS[2])
    sfan(L, X, Y, W, 8, 12, 13, 15, fan_cols(G_[0], G_[0], G_[0], G_[0], G_[0], G_[0]), ringw=0, hub_r=0)
    sfan(L, X, Y, W, 8, 12, 9, 11, fan_cols(G_[3], D[0], G_[3], G_[2], G_[1], GLS[0]), hub_r=1.5)
    # graphics card: plain bar with an under-glow strip
    sprect(L, X, Y, W, 3, Dp - 2, 19, 24, ST[0])
    sprect(L, X, Y, W, 3, Dp - 2, 19, 19, ST[3])
    sprect(L, X, Y, W, 3, Dp - 2, 24, 24, G_[2])
    sprect(L, X, Y, W, 5, 7, 21, 22, D[0])
    sprect(L, X, Y, W, 9, 11, 21, 22, D[0])
    sprect(L, X, Y, W, 3, Dp - 2, 27, 28, D[2])
    sprect(L, X, Y, W, 3, 4, 4, 4, GLINT[0])
    merge(c, L, wm)
    return c


def g2_icon(th):
    c = Canvas(32, 32)
    S, D, T, G_, GLS = th.shell, th.panel, th.trim, th.glow, th.glass
    X, Y, W, H, Dp = 4, 12, 11, 16, 8
    c.box(X, Y, W, H, Dp, S[3], S[2], S[1], hi=S[4], lo=S[0])
    # handle bump on the top
    c.box(X + 6, Y - 7, 4, 1, 2, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.hline(X, Y, W, S[4])
    c.vline(X, Y + 1, H - 2, S[3])
    # optical drive
    c.rect(X + 2, Y + 2, W - 4, 3, D[0])
    c.hline(X + 3, Y + 3, 4, ST[2])
    c.hline(X + 7, Y + 3, 2, G_[3])
    # mesh panel with the blue ring fan
    c.rect(X + 2, Y + 6, W - 4, 9, D[1])
    draw_afan(c, X + 3, Y + 7, "i6", G_[2], None, G_[3], None)
    # window: lit blue with one big fan and the graphics card edge
    wm = window(c, X, Y, W, H, Dp, S, GLS, 2, H - 1, k0=1, frame=S[2], base=G_[0])
    L = Canvas(32, 32)
    sfan_a(L, X, Y, W, 4, 6, "i5", G_[3], G_[2], D[0], G_[1])
    sprect(L, X, Y, W, 2, Dp - 2, 11, 12, ST[0])
    sprect(L, X, Y, W, 2, Dp - 2, 11, 11, ST[3])
    sprect(L, X, Y, W, 2, Dp - 2, 12, 12, G_[3])
    merge(c, L, wm)
    return c
