"""pc g1: beige tower (until 2003)."""
from pc_common import *  # noqa: F401,F403

THEMES = {}

# g1 roles: shell (bezel), cover (top/side metal), drv (drive faces), panel (dark slots), trim (badge), disp (7 segment)
THEMES[1] = {
    1: Theme("Graphite", shell=P["graphite_mid"], cover=P["graphite"], drv=P["graphite_lt"], panel=P["ink"], trim=BLUE,
             disp=P["led_blue"], led_a=P["led_green"], led_b=P["led_amber"], foot=P["ink"]),
    2: Theme("Putty", shell=BG, cover=BG, drv=BG, panel=P["ink"], trim=BLUE,
             disp=P["led_red"], led_a=P["led_green"], led_b=P["led_amber"], foot=P["graphite"]),
    3: Theme("Blue", shell=BLUE, cover=BLUE, drv=P["graphite_lt"], panel=P["ink"], trim=P["graphite"],
             disp=P["led_amber"], led_a=P["led_green"], led_b=P["led_red"], foot=P["graphite"]),
}


# ------------------------------------------------------------------ g1 : beige tower (until 2003)
def g1_model(th):
    c = Canvas(64, 64)
    S, M, D, T, V = th.shell, th.cover, th.panel, th.trim, th.drv
    X, Y, W, H, Dp = 8, 16, 27, 36, 9
    # rubber feet (drawn first, the case overlaps them)
    for fx in (2, W - 8):
        c.box(X + fx, Y + H, 6, 2, 3, th.foot[3], th.foot[2], th.foot[1], hi=th.foot[4], lo=th.foot[0])
    c.box(X, Y, W, H, Dp, M[3], M[2], M[1], hi=M[4], lo=M[0])
    # plastic bezel slab (3 px deep) in front of the metal cover
    c.box(X, Y, W, H, 3, S[3], S[2], S[1], hi=S[4], lo=S[0])
    c.hline(X + 3, Y - 3, W - 1, M[0])                    # seam on top
    c.paint(side_set(X, Y, W, [3], range(1, H)), M[0])    # seam on side
    # front bevel
    c.hline(X, Y, W, S[4])
    c.vline(X, Y + 1, H - 2, S[3])
    c.vline(X + W - 1, Y + 1, H - 1, S[1])
    c.hline(X + 1, Y + H - 1, W - 1, S[0])

    def drive(ax, ay, aw, ah):
        c.rect(X + ax, Y + ay, aw, ah, V[0])
        c.rect(X + ax + 1, Y + ay + 1, aw - 2, ah - 2, V[3])
        c.hline(X + ax + 1, Y + ay + 1, aw - 2, V[4])
        c.hline(X + ax + 1, Y + ay + ah - 2, aw - 2, V[2])

    # bay A: CD-ROM drive
    drive(3, 2, 21, 7)
    c.hline(X + 5, Y + 5, 11, D[0])
    c.hline(X + 5, Y + 6, 11, V[1])
    c.rect(X + 18, Y + 4, 3, 2, V[1])
    c.hline(X + 18, Y + 4, 3, V[4])
    c.led(X + 18, Y + 7, th.led_a, 1, 1, halo=False)
    # bay B: flip door over a blank 5.25" bay
    c.rect(X + 3, Y + 10, 21, 6, S[0])
    c.rect(X + 4, Y + 11, 19, 4, S[2])
    c.hline(X + 4, Y + 11, 19, S[3])
    c.hline(X + 4, Y + 14, 19, S[1])
    c.vline(X + 3, Y + 11, 4, S[1])
    c.hline(X + 9, Y + 12, 9, S[1])             # handle recess
    c.hline(X + 9, Y + 13, 9, S[4])
    # floppy drive 3.5"
    drive(3, 17, 8, 5)
    c.hline(X + 5, Y + 19, 5, D[0])
    c.led(X + 9, Y + 20, th.led_a, 1, 1, halo=False)
    # turbo display
    c.rect(X + 13, Y + 17, 11, 8, D[0])
    c.rect(X + 14, Y + 18, 9, 6, D[1])
    glyph(c, X + 15, Y + 18, "3", th.disp[3])
    glyph(c, X + 19, Y + 18, "3", th.disp[3])
    # power button, reset button, LEDs
    c.rect(X + 3, Y + 26, 7, 6, S[0])
    c.rect(X + 4, Y + 26, 5, 4, S[3])
    c.hline(X + 4, Y + 26, 5, S[4])
    c.hline(X + 4, Y + 29, 5, S[1])
    c.rect(X + 11, Y + 27, 3, 3, S[0])
    c.rect(X + 11, Y + 27, 2, 2, S[3])
    c.led(X + 17, Y + 27, th.led_a, 2, 1)
    c.led(X + 21, Y + 27, th.led_b, 2, 1)
    c.hline(X + 16, Y + 30, 8, T[2])
    c.hline(X + 16, Y + 31, 8, T[1])
    # front vent strip
    c.grille(X + 3, Y + 33, 21, 2, S[0], step=2)
    # side: rear screws, vent slats
    c.paint(side_set(X, Y, W, [Dp - 2], [4, 5]), M[0])
    c.paint(side_set(X, Y, W, [Dp - 2], [H - 6, H - 5]), M[0])
    for v in (H - 14, H - 11, H - 8):
        c.paint(side_set(X, Y, W, range(4, 8), [v]), M[0])
    return c


def g1_icon(th):
    c = Canvas(32, 32)
    S, M, D, T, V = th.shell, th.cover, th.panel, th.trim, th.drv
    X, Y, W, H, Dp = 5, 8, 16, 19, 4
    for fx in (2, W - 5):
        c.hline(X + fx, Y + H, 3, th.foot[1])
    c.box(X, Y, W, H, Dp, M[3], M[2], M[1], hi=M[4], lo=M[0])
    c.hline(X, Y, W, S[4])
    c.vline(X, Y + 1, H - 2, S[3])
    c.vline(X + W - 1, Y + 1, H - 1, S[1])
    # CD-ROM drive: frame, tray slot, led
    c.rect(X + 2, Y + 2, W - 4, 4, V[0])
    c.rect(X + 3, Y + 3, W - 6, 2, V[3])
    c.hline(X + 3, Y + 4, 7, D[0])
    c.hline(X + 11, Y + 4, 2, th.led_a[3])
    # flip door
    c.rect(X + 2, Y + 7, W - 4, 3, S[0])
    c.hline(X + 3, Y + 8, W - 6, S[3])
    # floppy + display
    c.rect(X + 2, Y + 11, 4, 3, V[0])
    c.hline(X + 3, Y + 12, 2, D[0])
    c.rect(X + 7, Y + 11, 7, 3, D[0])
    c.hline(X + 8, Y + 12, 5, th.disp[3])
    # power button, leds
    c.rect(X + 2, Y + 15, 3, 3, S[0])
    c.rect(X + 2, Y + 15, 2, 2, S[3])
    c.hline(X + 7, Y + 16, 2, th.led_a[3])
    c.hline(X + 10, Y + 16, 2, th.led_b[3])
    c.hline(X + 2, Y + 18, W - 4, S[0])
    # side vent slats
    for v in (9, 12, 15):
        c.paint(side_set(X, Y, W, range(2, 4), [v]), M[0])
    return c
