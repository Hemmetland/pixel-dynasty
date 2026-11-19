"""qa.py - checks the PNGs of one product type.

usage: python3 qa.py <type> [--gens 1,2,3] [--styles 1,2,3] [-q]
Reads hw2/out/<type>/model-g<N>-s<S>.png (64x64) and icon-g<N>-s<S>.png (32x32).
Prints findings per file; ERROR lines make the exit code 1, WARN lines are advice.

Rules (strict but not silly):
  size            model 64x64, icon 32x32
  alpha           only 0 or 255
  silhouette      every opaque pixel that touches transparency (4-neighbour) or the image border is OUTLINE (#1c1c31)
                  or RIM (#82b2d0); a RIM pixel must have an OUTLINE pixel directly below or right of it (the rim is only
                  ever on the top/left edges); so there is no 1 px gap in the outline (diagonal 1 px staircases are fine)
  isolated        a pixel with no 8-neighbour of the same colour is WARN unless its colour is a marked LED / glint /
                  highlight tone (PAL led_* tones 2-4, glints, the 'high' tone of every ramp); outline/rim are exempt
  colours         at most 28 distinct colours per sprite
  placement       margin >= 2 px on every side; model motif <= 56 x 52, lowest row 58..60, horizontally centred within
                  2 px; icon motif <= 28 x 28 and centred within 1 px
  styles          the 3 styles of a generation have identical alpha masks (ERROR) and clearly different mean colour
                  (distance >= 30, ERROR below 20) and colour histogram (total-variation distance >= 0.35, ERROR below 0.2)
  generations     silhouettes of different generations differ (IoU < 0.85 for models, WARN above, ERROR above 0.95)
  icon vs model   the icon's bbox aspect ratio stays within 30 % of the model's (WARN)
"""
import os
import sys
import glob
import collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
import hwlib  # noqa: E402

OUT = hwlib.OUTLINE
RIM = hwlib.RIM
ALLOWED = set(hwlib.ALLOW_ISOLATED)
for _r in hwlib.PAL.values():
    ALLOWED.add(_r[4])
MAX_COLOURS = 28


def load(path):
    im = Image.open(path).convert("RGBA")
    return im, im.load()


def n8(x, y):
    return [(x + i, y + j) for j in (-1, 0, 1) for i in (-1, 0, 1) if i or j]


def n4(x, y):
    return [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]


def check_sprite(path, kind):
    """returns (errors, warns, info) for one sprite"""
    err, warn = [], []
    im, px = load(path)
    w, h = im.size
    want = (64, 64) if kind == "model" else (32, 32)
    if (w, h) != want:
        err.append("size %dx%d, expected %dx%d" % (w, h, want[0], want[1]))
    alphas = {px[x, y][3] for y in range(h) for x in range(w)}
    if not alphas <= {0, 255}:
        err.append("alpha values other than 0/255: %s" % sorted(alphas - {0, 255})[:6])
    op = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0}
    if not op:
        err.append("empty image")
        return err, warn, None

    def col(p):
        return tuple(px[p][:3]) + (255,)

    # silhouette rules
    bad = []
    for (x, y) in sorted(op):
        c = col((x, y))
        touches = any((q not in op) for q in n4(x, y))
        if c == OUT:
            continue
        if c == RIM:
            if (x, y + 1) in op and col((x, y + 1)) == OUT or (x + 1, y) in op and col((x + 1, y)) == OUT:
                continue
            bad.append(((x, y), "rim pixel without outline below/right"))
            continue
        if touches:
            bad.append(((x, y), "body pixel touches transparency/border"))
    if bad:
        err.append("silhouette not closed: %d pixels, first %s" % (len(bad), ["%s@%s" % (m, p) for p, m in bad[:4]]))
    # isolated pixels
    iso = []
    for (x, y) in sorted(op):
        c = col((x, y))
        if c in (OUT, RIM) or c in ALLOWED:
            continue
        if not any(((q in op) and col(q) == c) for q in n8(x, y)):
            iso.append((x, y))
    if iso:
        warn.append("%d isolated pixel(s) not marked as LED/glint: %s" % (len(iso), iso[:8]))
    # colours
    cols = collections.Counter(col(p) for p in op)
    if len(cols) > MAX_COLOURS:
        err.append("%d colours (max %d)" % (len(cols), MAX_COLOURS))
    # placement
    xs = [p[0] for p in op]
    ys = [p[1] for p in op]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    ml, mr, mt, mb = x0, w - 1 - x1, y0, h - 1 - y1
    if min(ml, mr, mt, mb) < 2:
        err.append("margin < 2 px (l%d r%d t%d b%d)" % (ml, mr, mt, mb))
    if kind == "model":
        if bw > 56 or bh > 52:
            err.append("motif %dx%d exceeds 56x52" % (bw, bh))
        if not (58 <= y1 <= 60):
            warn.append("lowest row %d, expected 58..60" % y1)
        if abs(ml - mr) > 2:
            warn.append("not centred horizontally (left %d, right %d)" % (ml, mr))
    else:
        if bw > 28 or bh > 28:
            err.append("motif %dx%d exceeds 28x28" % (bw, bh))
        if abs(ml - mr) > 1:
            warn.append("not centred horizontally (left %d, right %d)" % (ml, mr))
    info = dict(op=op, mask=frozenset(op), bw=bw, bh=bh, cols=cols, size=(w, h),
                mean=tuple(sum(col(p)[i] for p in op) / len(op) for i in range(3)))
    return err, warn, info


def dist(a, b):
    return sum((a[i] - b[i]) ** 2 for i in range(3)) ** 0.5


def hist(info):
    """normalised colour histogram of the sprite (outline/rim excluded), colours quantised to 3 bits per channel"""
    h = collections.Counter()
    for k, n in info["cols"].items():
        if k not in (OUT, RIM):
            h[(k[0] >> 5, k[1] >> 5, k[2] >> 5)] += n
    t = float(sum(h.values()))
    return {k: v / t for k, v in h.items()}


def tv(a, b):
    """total-variation distance of two histograms: 0 = same colours, 1 = nothing in common"""
    ks = set(a) | set(b)
    return 0.5 * sum(abs(a.get(k, 0) - b.get(k, 0)) for k in ks)


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    typ = argv[0]
    gens = [1, 2, 3]
    styles = [1, 2, 3]
    quiet = "-q" in argv
    if "--gens" in argv:
        gens = [int(v) for v in argv[argv.index("--gens") + 1].split(",")]
    if "--styles" in argv:
        styles = [int(v) for v in argv[argv.index("--styles") + 1].split(",")]
    d = os.path.join(hwlib.OUT_ROOT, typ)
    total_err = total_warn = 0
    infos = {}
    for g in gens:
        for s in styles:
            for kind in ("model", "icon"):
                f = "%s-g%d-s%d.png" % (kind, g, s)
                p = os.path.join(d, f)
                if not os.path.exists(p):
                    print("%-18s ERROR missing file" % f)
                    total_err += 1
                    continue
                e, wn, info = check_sprite(p, kind)
                infos[(kind, g, s)] = info
                total_err += len(e)
                total_warn += len(wn)
                if e or wn or not quiet:
                    print("%-18s %s" % (f, "OK" if not (e or wn) else ""))
                for m in e:
                    print("    ERROR", m)
                for m in wn:
                    print("    warn ", m)
    # cross checks
    print("-- generations / styles")
    for kind in ("model", "icon"):
        for g in gens:
            ss = [s for s in styles if infos.get((kind, g, s))]
            for i in range(len(ss)):
                for j in range(i + 1, len(ss)):
                    a, b = infos[(kind, g, ss[i])], infos[(kind, g, ss[j])]
                    tag = "%s g%d s%d/s%d" % (kind, g, ss[i], ss[j])
                    if a["mask"] != b["mask"]:
                        diff = len(a["mask"] ^ b["mask"])
                        print("    ERROR %s: alpha masks differ (%d px)" % (tag, diff))
                        total_err += 1
                    dm = dist(a["mean"], b["mean"])
                    dd = tv(hist(a), hist(b))
                    if dm < 20 or dd < 0.20:
                        print("    ERROR %s: styles too similar (mean-dist %.0f, colour-hist distance %.2f)" % (tag, dm, dd))
                        total_err += 1
                    elif dm < 30 or dd < 0.35:
                        print("    warn  %s: styles close (mean-dist %.0f, colour-hist distance %.2f)" % (tag, dm, dd))
                        total_warn += 1
                    elif not quiet:
                        print("    %s mean-dist %.0f colour-hist distance %.2f" % (tag, dm, dd))
        gl = [g for g in gens if infos.get((kind, g, styles[0]))]
        for i in range(len(gl)):
            for j in range(i + 1, len(gl)):
                a, b = infos[(kind, gl[i], styles[0])]["mask"], infos[(kind, gl[j], styles[0])]["mask"]
                iou = len(a & b) / float(len(a | b))
                tag = "%s g%d vs g%d silhouette IoU %.2f" % (kind, gl[i], gl[j], iou)
                if iou > 0.95:
                    print("    ERROR", tag)
                    total_err += 1
                elif iou > 0.85:
                    print("    warn ", tag)
                    total_warn += 1
                elif not quiet:
                    print("    ", tag)
    for g in gens:
        for s in styles:
            m, i = infos.get(("model", g, s)), infos.get(("icon", g, s))
            if m and i:
                am, ai = m["bw"] / float(m["bh"]), i["bw"] / float(i["bh"])
                if abs(ai / am - 1) > 0.30:
                    print("    warn  g%d s%d: icon aspect %.2f vs model %.2f" % (g, s, ai, am))
                    total_warn += 1
    print("== %s: %d error(s), %d warning(s)" % (typ, total_err, total_warn))
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
