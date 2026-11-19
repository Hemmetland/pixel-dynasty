"""Print every colour (with pixel count) used by the shipped 32x32 icons.

usage: python3 extract_palette.py [folder-with-hw-*.png]
This is how the base of hwlib.PAL was gathered (see the comment block in hwlib.py).
"""
import collections
import glob
import os
import sys

from PIL import Image

DEFAULT = "/tmp/claude-0/-home-claude/2499982c-486e-50a2-8b19-dce1aca29e8a/scratchpad/work/assets/ui"


def main(folder=DEFAULT):
    cnt = collections.Counter()
    for f in sorted(glob.glob(os.path.join(folder, "hw-*.png")) + glob.glob(os.path.join(folder, "dock-*.png"))):
        im = Image.open(f).convert("RGBA")
        w, h = im.size
        px = im.load()
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if p[3] > 0:
                    cnt[p[:3]] += 1
    for c, n in cnt.most_common():
        print("#%02x%02x%02x  %5d" % (c + (n,)))


if __name__ == "__main__":
    main(*(sys.argv[1:2]))
