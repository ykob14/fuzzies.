/** Vector paths for shapes and image masks, built for a w×h box with its origin at the top-left. */
import type { Mask, ShapeKind } from './types';

function poly(p: Path2D, pts: [number, number][]): Path2D {
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

function regular(w: number, h: number, n: number, rot = -90): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    pts.push([w / 2 + (Math.cos(a) * w) / 2, h / 2 + (Math.sin(a) * h) / 2]);
  }
  return pts;
}

function starPoints(w: number, h: number, n: number, inner: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : 1;
    const a = ((-90 + (i * 180) / n) * Math.PI) / 180;
    pts.push([w / 2 + (Math.cos(a) * r * w) / 2, h / 2 + (Math.sin(a) * r * h) / 2]);
  }
  return pts;
}

export function roundRect(p: Path2D, x: number, y: number, w: number, h: number, r: number): Path2D {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

function heart(w: number, h: number): Path2D {
  const p = new Path2D();
  p.moveTo(w / 2, h * 0.28);
  p.bezierCurveTo(w * 0.5, h * 0.05, w * 0.05, -h * 0.02, w * 0.02, h * 0.32);
  p.bezierCurveTo(0, h * 0.58, w * 0.3, h * 0.75, w / 2, h);
  p.bezierCurveTo(w * 0.7, h * 0.75, w, h * 0.58, w * 0.98, h * 0.32);
  p.bezierCurveTo(w * 0.95, -h * 0.02, w * 0.5, h * 0.05, w / 2, h * 0.28);
  p.closePath();
  return p;
}

function blob(w: number, h: number): Path2D {
  const p = new Path2D();
  const pts: [number, number][] = [[0.5, 0.02], [0.9, 0.18], [0.98, 0.58], [0.72, 0.95], [0.3, 0.96], [0.04, 0.66], [0.1, 0.22]];
  const P = pts.map(([x, y]) => [x * w, y * h]);
  const n = P.length;
  p.moveTo((P[0][0] + P[n - 1][0]) / 2, (P[0][1] + P[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n];
    p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  p.closePath();
  return p;
}

function arch(w: number, h: number): Path2D {
  const p = new Path2D();
  const r = w / 2;
  p.moveTo(0, h);
  p.lineTo(0, Math.min(r, h));
  p.arc(r, Math.min(r, h), r, Math.PI, 0);
  p.lineTo(w, h);
  p.closePath();
  return p;
}

export function shapePath(kind: ShapeKind, w: number, h: number, radius = 0): Path2D {
  const p = new Path2D();
  switch (kind) {
    case 'rect': return roundRect(p, 0, 0, w, h, radius);
    case 'ellipse': p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); return p;
    case 'ring': p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); return p;
    case 'triangle': return poly(p, [[w / 2, 0], [w, h], [0, h]]);
    case 'diamond': return poly(p, [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
    case 'pentagon': return poly(p, regular(w, h, 5));
    case 'hexagon': return poly(p, regular(w, h, 6, 0));
    case 'star': return poly(p, starPoints(w, h, 5, 0.45));
    case 'burst': return poly(p, starPoints(w, h, 14, 0.78));
    case 'heart': return heart(w, h);
    case 'cross': {
      const t = Math.min(w, h) * 0.32;
      return poly(p, [[(w - t) / 2, 0], [(w + t) / 2, 0], [(w + t) / 2, (h - t) / 2], [w, (h - t) / 2], [w, (h + t) / 2], [(w + t) / 2, (h + t) / 2], [(w + t) / 2, h], [(w - t) / 2, h], [(w - t) / 2, (h + t) / 2], [0, (h + t) / 2], [0, (h - t) / 2], [(w - t) / 2, (h - t) / 2]]);
    }
    case 'arrow': {
      const hw = Math.min(w * 0.4, h);
      return poly(p, [[0, h * 0.3], [w - hw, h * 0.3], [w - hw, 0], [w, h / 2], [w - hw, h], [w - hw, h * 0.7], [0, h * 0.7]]);
    }
    case 'bubble': {
      roundRect(p, 0, 0, w, h * 0.8, Math.min(w, h) * 0.18);
      const q = new Path2D();
      poly(q, [[w * 0.22, h * 0.78], [w * 0.2, h], [w * 0.42, h * 0.78]]);
      p.addPath(q);
      return p;
    }
    case 'arch': return arch(w, h);
    case 'blob': return blob(w, h);
    case 'line': p.moveTo(0, h / 2); p.lineTo(w, h / 2); return p;
  }
}

export function maskPath(mask: Mask, w: number, h: number, radius: number): Path2D {
  switch (mask) {
    case 'circle': return shapePath('ellipse', w, h);
    case 'rounded': return roundRect(new Path2D(), 0, 0, w, h, Math.min(w, h) * 0.12);
    case 'arch': return arch(w, h);
    case 'blob': return blob(w, h);
    case 'star': return poly(new Path2D(), starPoints(w, h, 5, 0.5));
    case 'heart': return heart(w, h);
    case 'hexagon': return poly(new Path2D(), regular(w, h, 6, 0));
    default: return roundRect(new Path2D(), 0, 0, w, h, radius);
  }
}

export const SHAPE_KINDS: { kind: ShapeKind; label: string }[] = [
  { kind: 'rect', label: 'Square' }, { kind: 'ellipse', label: 'Circle' }, { kind: 'triangle', label: 'Triangle' },
  { kind: 'diamond', label: 'Diamond' }, { kind: 'pentagon', label: 'Pentagon' }, { kind: 'hexagon', label: 'Hexagon' },
  { kind: 'star', label: 'Star' }, { kind: 'burst', label: 'Burst' }, { kind: 'heart', label: 'Heart' },
  { kind: 'arrow', label: 'Arrow' }, { kind: 'bubble', label: 'Speech bubble' }, { kind: 'cross', label: 'Plus' },
  { kind: 'arch', label: 'Arch' }, { kind: 'blob', label: 'Blob' }, { kind: 'ring', label: 'Ring' }, { kind: 'line', label: 'Line' },
];
