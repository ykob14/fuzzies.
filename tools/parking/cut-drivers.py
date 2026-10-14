# Cut the owner's 15 Fuzzies (5×3 sheet) into transparent 256 px WebPs: flood the very bright background from the cell edge, keep
# the round body (the soft floor shadow under each one falls outside its circle), soften the edge by how far a pixel is from white.
import sys, numpy as np
from collections import deque
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
cols, rows = 5, 3
names = ['pink', 'red', 'orange', 'yellow', 'green', 'teal', 'sky', 'blue', 'purple', 'lilac', 'white', 'grey', 'black', 'brown', 'rainbow']
for r in range(rows):
  for c in range(cols):
    x0, x1 = round(c * W / cols), round((c + 1) * W / cols); y0, y1 = round(r * H / rows), round((r + 1) * H / rows)
    cell = im[y0:y1, x0:x1]; h, w, _ = cell.shape
    mn = cell.min(axis=2); mx = cell.max(axis=2)
    bright = (mn >= 246) & (mx - mn <= 8)
    bg = np.zeros((h, w), bool); q = deque()
    for y in range(h):
      for x in (0, w - 1):
        if bright[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for x in range(w):
      for y in (0, h - 1):
        if bright[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
      y, x = q.popleft()
      for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = y + dy, x + dx
        if 0 <= yy < h and 0 <= xx < w and not bg[yy, xx] and bright[yy, xx]: bg[yy, xx] = True; q.append((yy, xx))
    fg0 = ~bg
    # only the Fuzzy in the middle of the cell (neighbours' fur pokes in at the edges)
    fg = np.zeros((h, w), bool); sy, sx = h // 2, w // 2; fg[sy, sx] = True; q = deque([(sy, sx)])
    while q:
      y, x = q.popleft()
      for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = y + dy, x + dx
        if 0 <= yy < h and 0 <= xx < w and fg0[yy, xx] and not fg[yy, xx]: fg[yy, xx] = True; q.append((yy, xx))
    # body circle: the widest row in the upper 75% of the figure gives the centre x and radius
    ys = np.where(fg.any(axis=1))[0]; top, bot = ys.min(), ys.max()
    best = (0, 0, 0)
    for y in range(top, top + int((bot - top) * 0.75)):
      xs = np.where(fg[y])[0]
      if len(xs) and xs.max() - xs.min() > best[0]: best = (xs.max() - xs.min(), (xs.max() + xs.min()) / 2, y)
    rad = best[0] / 2; cx = best[1]; cy = top + rad
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 1.0) ** 2) / rad
    circ = np.clip((1.10 - d) / 0.12, 0, 1)
    soft = np.clip((250 - mn) / 22.0, 0, 1)
    alpha = np.where(fg, np.maximum(soft, (d < 0.9).astype(float)), 0) * circ
    # the floor shadow under the bottom edge: greyish and light → fade it (neutral-coloured Fuzzies get a tighter lower edge instead)
    lower = (yy > cy) & (d > 0.82)
    neutral = names[r * cols + c] in ('white', 'grey', 'black')
    if neutral: alpha = np.where(lower, alpha * np.clip((1.0 - d) / 0.12, 0, 1), alpha)
    else:
      sat = (mx - mn).astype(float)
      alpha = np.where(lower & (mn > 150), alpha * np.clip((sat - 12) / 40.0, 0, 1), alpha)
    a = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    rgba = Image.fromarray(cell.astype(np.uint8)).convert('RGBA'); rgba.putalpha(a)
    s = int(rad * 2.3); box = (int(cx - s / 2), int(cy - s / 2), int(cx + s / 2), int(cy + s / 2))
    crop = rgba.crop(box).resize((256, 256), Image.LANCZOS)
    n = r * cols + c
    crop.save(f'{out}/d{n + 1:02d}.webp', 'WEBP', quality=86, method=6)
    print(n + 1, names[n], 'r', int(rad), 'c', int(cx), int(cy))
