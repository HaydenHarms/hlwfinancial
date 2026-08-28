"""
Generates the approved cover-page diagram as a standalone SVG -- a
flowing ribbon diagram, disorganized-left to organized-right, in HLW's
signal-color palette. Same math as the approved reportlab-free mockup
(build_cover_mockup.py): single smooth cubic bezier per line (control
points level with their nearest endpoint, so the curve eases into flat
at both ends with no seam), confined to a band, dense bundled lines.

Output is meant to be embedded INLINE in the report HTML (not referenced
as an external <img src>), so it's guaranteed present before window.print()
fires -- no network/load-timing risk.
"""
import numpy as np

np.random.seed(11)

# viewBox units = hundredths of an inch (100 units = 1in), so the SVG's
# own coordinate system maps directly onto print.css's inch-based sizing.
VB_W, VB_H = 850, 473  # 8.5in x 4.73in (the band height used in the mockup)

gap = 0.018
raw_bands = [
    ('#eef3ef', 26),   # cream
    ('#5fae82', 30),   # signal-green
    ('#5b93d9', 30),   # signal-blue
    ('#4fb8ae', 30),   # signal-teal
    ('#d9a441', 32),   # signal-amber
    ('#9b8ad9', 30),   # signal-purple
    ('#e0806a', 28),   # signal-red
]
n_bands = len(raw_bands)
band_h = (1.0 - gap * (n_bands - 1)) / n_bands
bands = []
y = 1.0
for color, n in raw_bands:
    bands.append((y - band_h, y, color, n))
    y -= band_h + gap

paths = []
cx = VB_W * 0.5
for (y0, y1, color, n) in bands:
    for i in range(n):
        start_y = np.random.uniform(0, 1) * VB_H
        end_y = np.random.uniform(y0, y1) * VB_H
        lw = round(np.random.uniform(0.9, 2.2) * (VB_W / 850) * 1.0, 2)  # same visual weight as the mockup, scaled to viewBox units
        op = round(np.random.uniform(0.75, 1.0), 2)
        d = f"M0,{start_y:.2f} C{cx:.2f},{start_y:.2f} {cx:.2f},{end_y:.2f} {VB_W},{end_y:.2f}"
        paths.append(f'<path d="{d}" stroke="{color}" stroke-width="{lw}" fill="none" opacity="{op}"/>')

svg = (
    f'<svg viewBox="0 0 {VB_W} {VB_H}" xmlns="http://www.w3.org/2000/svg" '
    f'preserveAspectRatio="none">' + ''.join(paths) + '</svg>'
)

with open('/home/claude/cover-diagram.svg', 'w') as f:
    f.write(svg)

print('paths:', len(paths))
print('bytes:', len(svg))
