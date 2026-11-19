"""PC (Forge) hardware art: 4 generations x 3 styles, model 64x64 + icon 32x32.

Drawing code: pc_common.py (helpers, fans), pc_g1.py .. pc_g4.py (one generation each: THEMES + draw_model/draw_icon).
run:  python3 src/pc.py                 -> writes out/pc/model-gN-sS.png, icon-gN-sS.png, sheet.png
      python3 src/pc.py g2              -> only generation 2
      python3 src/pc.py g2 prev         -> only a preview strip (8x model, 12x icon) into prev/pc/, nothing in out/
"""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pc_common import *  # noqa: E402,F401,F403

MODS = {}
for _g in (1, 2, 3, 4):
    try:
        MODS[_g] = importlib.import_module("pc_g%d" % _g)
    except ModuleNotFoundError:
        pass


def fns(g):
    m = MODS[g]
    return getattr(m, "g%d_model" % g), getattr(m, "g%d_icon" % g), m.THEMES[g]


def render(gen, which="model", scale=8, ks=(1, 2, 3)):
    mf, icf, themes = fns(gen)
    fn = mf if which == "model" else icf
    imgs = []
    for k in ks:
        c = despeckle(fn(themes[k]))
        imgs.append(place(finish(c), "icon" if c.w == 32 else "model"))
    W_ = sum(i.width * scale for i in imgs) + 8 * (len(imgs) + 1)
    sh = Image.new("RGBA", (W_, imgs[0].height * scale + 16), NAVY)
    x = 8
    for i in imgs:
        sh.alpha_composite(up(i, scale), (x, 8))
        x += i.width * scale + 8
    d = os.path.join(HERE, "..", "prev", "pc")
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "g%d_%s.png" % (gen, which))
    sh.save(p)
    return imgs


def build(gens=None):
    d = out_dir("pc")
    for g in sorted(MODS):
        if gens and g not in gens:
            continue
        mf, icf, themes = fns(g)
        for k, th in themes.items():
            save(place(finish(despeckle(mf(th))), "model"), os.path.join(d, "model-g%d-s%d.png" % (g, k)))
            save(place(finish(despeckle(icf(th))), "icon"), os.path.join(d, "icon-g%d-s%d.png" % (g, k)))
    return sheet("pc", gens=sorted(MODS), labels={1: "g1 -2003", 2: "g2 2004-11", 3: "g3 2012-19", 4: "g4 2020+"})


if __name__ == "__main__":
    want = [int(a[1:]) for a in sys.argv[1:] if a[0] == "g" and a[1:].isdigit()]
    if want and "prev" in sys.argv:
        for g in want:
            render(g, "model", 8)
            render(g, "icon", 12)
    else:
        build(want or None)
