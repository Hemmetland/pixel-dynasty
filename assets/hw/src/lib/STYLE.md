# hw2 pixel conventions (settled by the console pilot)

Tools: `lib/hwlib.py` (Canvas, PAL, Theme, finish, place, sheet), `lib/qa.py <type>`, worked example `src/console.py`.
Write your drawings in `src/<type>.py`: `sys.path.insert(0, ".../hw2/lib"); from hwlib import *`.

## View and light
- Oblique 3/4: FRONT face flat and straight on, TOP and RIGHT-SIDE faces with 1:1 diagonal depth d. Back edge = +d right, -d up.
  `box(x, y, w, h, d, ...)`: (x, y, w, h) is the front face, bbox = x..x+w+d-1, y-d..y+h-1. d = 10-12 (model), 5-6 (icon).
- Light top-left: top = ramp[3], front = ramp[2], side = ramp[1], shadow/bottom edges = ramp[0], lit edges = ramp[4].
- Cylinders/fans/discs are ellipses (`ellipse`, `cyl`, `disc`). Same view for every type and generation.
- Pixel-corner coordinates: `Canvas.ellipse(x, y, w, h)` is the ellipse inscribed in the bbox; masks are plain sets of (x, y).

## Outline and rim (finish())
- Draw the product on a transparent Canvas WITHOUT outline, then `img = place(finish(canvas), "model"|"icon")`.
- finish(): 1 px #1c1c31 outline around the silhouette (4-neighbour, so 45 degree staircases stay 1 px thin; a corner pixel is
  added only at true 90 degree convex corners) and the rim #82b2d0 on the transparent pixel directly ABOVE or LEFT of every
  outline pixel. As in the shipped icons the rim is the OUTERMOST line on top/left, never on the lower right.
  (common.txt says "just inside the outline"; the shipped hw-*.png have it outside, finish() copies the shipped look.)
  The inner light edge of a face is yours: paint it with ramp[3]/[4] (`hi=` in box/rbox does it for the top face).
- The sprite grows 2 px top/left, 1 px bottom/right: keep >= 3 px free around the drawing on the canvas.
- Parts overlapping parts: draw the part on a sub-Canvas, then `canvas.composite(sub, ox, oy, outline=dark)`; that draws a
  1 px separation line only where it overlaps something (use a dark TONE of the local colour, e.g. shell[0], not #1c1c31).
- `place()` moves the finished sprite by whole pixels: model centred, lowest row 59; icon centred. So you may design off-centre.

## Sizes (checked by qa.py)
- Model 64x64: motif <= 56 x 52 (rim + outline included), margin >= 2, lowest row 58-60. Icon 32x32: motif <= 28 x 28.
- Body budget before finish(): model <= 53 x 49, icon <= 25 x 25. Design the icon separately with its own coordinates
  (d = 5, details 1-2 px); never resize the model.

## Themes: one drawing, three styles
- `Theme(name, shell=Ramp, panel=Ramp, trim=Ramp, glow=Ramp, ...)`, attribute access `th.shell[2]`. Ramps are 5 tones:
  0 dark, 1 shade, 2 base, 3 light, 4 highlight (`.dark .shade .base .light .high`). Geometry never depends on the theme
  (qa.py demands identical alpha masks), only colours do. Never hardcode shell/trim colours inside a draw function.
- Pick roles so that the parts keep contrast in all 3 styles (a dark pad on a dark shell vanishes: use a lighter ramp such as
  PAL["graphite_lt"]). Styles must differ in the dominant colour of the body, not by a hue shift of one detail.
- Write `draw_model(theme) -> Canvas` and `draw_icon(theme) -> Canvas`, loop over the themes, finish(), place(), save().

## Pitfalls we hit
- 8-neighbour outlines make 45 degree edges 2 px thick: use finish(), do not outline by hand at the silhouette.
- Shading a part with two under-tones (S[1] row + S[0] row) makes 1 px orphan pixels on curves: one tone, let the outline be the dark.
- A single pixel of a mid tone is flagged as isolated. Pairs/diagonal neighbours of the same colour are fine (face buttons: 2+2).
  Highlights (ramp[4]), LED tones and glints are allowed alone.
- Two round sticks side by side plus a notch read as a FACE: offset them or add a touch pad between.
- Rounded front faces (`rbox`) shade the corner with one clean diagonal (top/side split along x + y), no checker.
- Rim ticks appear where a small part's top-left outline pixel is exposed; that is correct, leave them.
- Isolated light details at 32 px (plugs, cables) become blobs: 3x2 px is the minimum that still reads.
- Always look at 1x on the 38 px tile (`sheet()`), not only at 8x.
