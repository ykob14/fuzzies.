/** The design document model. Everything is plain JSON so it saves, copies and exports easily. */

export interface Gradient {
  kind: 'linear' | 'radial';
  angle: number; // degrees, linear only
  stops: { at: number; color: string }[];
}
export type Fill = string | Gradient;

export interface Shadow { color: string; blur: number; x: number; y: number }

export interface Filters {
  brightness: number; // 100 = unchanged
  contrast: number;
  saturate: number;
  blur: number; // px
  grayscale: number; // 0..100
  sepia: number;
  hue: number; // degrees
}

interface Base {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  opacity: number; // 0..1
  name?: string;
  locked?: boolean;
  hidden?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  shadow?: Shadow | null;
  /** Elements sharing a group id move, resize and select together. */
  group?: string;
}

export type ShapeKind =
  | 'rect' | 'ellipse' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'burst'
  | 'heart' | 'arrow' | 'line' | 'bubble' | 'cross' | 'arch' | 'blob' | 'ring';

export interface ShapeEl extends Base {
  type: 'shape';
  shape: ShapeKind;
  fill: Fill;
  stroke: string;
  strokeWidth: number;
  radius: number;
  dash?: boolean;
}

export interface TextEl extends Base {
  type: 'text';
  text: string;
  font: string;
  size: number;
  weight: number;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  align: 'left' | 'center' | 'right';
  fill: Fill;
  lineHeight: number;
  letterSpacing: number;
  strokeColor: string;
  strokeWidth: number;
  bg: string; // highlight behind text, '' = none
}

export type Mask = 'none' | 'circle' | 'rounded' | 'arch' | 'blob' | 'star' | 'heart' | 'hexagon';

export interface ImageEl extends Base {
  type: 'image';
  asset: string; // key into Design.assets
  radius: number;
  mask: Mask;
  filters: Filters;
  stroke: string;
  strokeWidth: number;
  /** Pan of the photo inside its frame, -1..1. */
  panX: number;
  panY: number;
  zoom: number; // 1 = cover
}

export interface GraphicEl extends Base {
  type: 'graphic';
  art: string; // id from content/art.ts
  colors: string[];
}

export interface EmojiEl extends Base {
  type: 'emoji';
  char: string;
}

export interface DrawEl extends Base {
  type: 'draw';
  /** Flat [x0,y0,x1,y1,…] list normalised to 0..1 inside the box. */
  points: number[];
  color: string;
  width: number; // stroke width in design px
  highlighter?: boolean;
}

export type El = ShapeEl | TextEl | ImageEl | GraphicEl | EmojiEl | DrawEl;
export type ElType = El['type'];

export interface Page {
  id: string;
  background: Fill;
  bgAsset?: string; // optional full-bleed photo
  elements: El[];
}

export interface Design {
  id: string;
  owner: string;
  name: string;
  width: number;
  height: number;
  pages: Page[];
  assets: Record<string, string>; // id → data URL
  createdAt: number;
  updatedAt: number;
  thumb?: string;
  template?: string;
}

export const DEFAULT_FILTERS: Filters = { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0, hue: 0 };
