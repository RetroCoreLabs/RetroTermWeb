/**
 * Recording mock Canvas 2D context for rendering validation tests.
 * Tracks all fillRect/fillText calls with their parameters, enabling
 * tests to verify that the renderer actually produces visible output.
 */

export interface FillRectCall {
  fillStyle: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FillTextCall {
  fillStyle: string;
  text: string;
  x: number;
  y: number;
  font: string;
  globalAlpha: number;
}

export interface StrokeCall {
  strokeStyle: string;
  lineWidth: number;
}

export class RecordingCanvasContext {
  fillRectCalls: FillRectCall[] = [];
  fillTextCalls: FillTextCall[] = [];
  strokeCalls: StrokeCall[] = [];

  // State
  fillStyle: string = '#000000';
  strokeStyle: string = '#000000';
  globalAlpha: number = 1.0;
  lineWidth: number = 1;
  font: string = '16px monospace';
  textAlign: string = 'start';
  textBaseline: string = 'alphabetic';

  // Canvas reference (set externally)
  canvas: HTMLCanvasElement | null = null;

  fillRect(x: number, y: number, w: number, h: number): void {
    this.fillRectCalls.push({
      fillStyle: this.fillStyle,
      x, y, w, h,
    });
  }

  clearRect(_x: number, _y: number, _w: number, _h: number): void {}
  strokeRect(_x: number, _y: number, _w: number, _h: number): void {}

  fillText(text: string, x: number, y: number, _maxWidth?: number): void {
    this.fillTextCalls.push({
      fillStyle: this.fillStyle,
      text,
      x, y,
      font: this.font,
      globalAlpha: this.globalAlpha,
    });
  }

  strokeText(_text: string, _x: number, _y: number, _maxWidth?: number): void {}

  measureText(_text: string): TextMetrics {
    return {
      width: 8,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 4,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 8,
      fontBoundingBoxAscent: 12,
      fontBoundingBoxDescent: 4,
      alphabeticBaseline: 0,
      emHeightAscent: 12,
      emHeightDescent: 4,
      hangingBaseline: 0,
      ideographicBaseline: 0,
    };
  }

  beginPath(): void {}
  closePath(): void {}
  moveTo(_x: number, _y: number): void {}
  lineTo(_x: number, _y: number): void {}
  stroke(): void {
    this.strokeCalls.push({
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
    });
  }
  fill(): void {}
  clip(): void {}
  rect(_x: number, _y: number, _w: number, _h: number): void {}
  arc(_x: number, _y: number, _r: number, _s: number, _e: number, _ccw?: boolean): void {}
  arcTo(_x1: number, _y1: number, _x2: number, _y2: number, _r: number): void {}
  ellipse(_x: number, _y: number, _rx: number, _ry: number, _rot: number, _s: number, _e: number, _ccw?: boolean): void {}
  bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, _x: number, _y: number): void {}
  quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number): void {}
  roundRect(_x: number, _y: number, _w: number, _h: number, _radii?: number | number[]): void {}
  isPointInPath(_x: number, _y: number): boolean { return false; }
  isPointInStroke(_x: number, _y: number): boolean { return false; }

  // Transform
  scale(_x: number, _y: number): void {}
  rotate(_angle: number): void {}
  translate(_x: number, _y: number): void {}
  transform(_a: number, _b: number, _c: number, _d: number, _e: number, _f: number): void {}
  setTransform(_a?: number, _b?: number, _c?: number, _d?: number, _e?: number, _f?: number): void {}
  getTransform(): DOMMatrix { return new DOMMatrix(); }
  resetTransform(): void {}

  // Image
  drawImage(): void {}
  createImageData(sw: number, sh: number): ImageData { return new ImageData(sw, sh); }
  getImageData(_sx: number, _sy: number, sw: number, sh: number): ImageData { return new ImageData(sw, sh); }
  putImageData(_imageData: ImageData, _dx: number, _dy: number): void {}

  // Gradient/Pattern
  createLinearGradient(_x0: number, _y0: number, _x1: number, _y1: number): CanvasGradient {
    return { addColorStop() {} } as unknown as CanvasGradient;
  }
  createRadialGradient(_x0: number, _y0: number, _r0: number, _x1: number, _y1: number, _r1: number): CanvasGradient {
    return { addColorStop() {} } as unknown as CanvasGradient;
  }
  createConicGradient(_startAngle: number, _x: number, _y: number): CanvasGradient {
    return { addColorStop() {} } as unknown as CanvasGradient;
  }
  createPattern(): CanvasPattern | null { return null; }

  // State stack
  save(): void {}
  restore(): void {}
  reset(): void {}

  // Line dash
  setLineDash(_segments: number[]): void {}
  getLineDash(): number[] { return []; }

  // Extra properties to satisfy full CanvasRenderingContext2D interface
  direction: CanvasDirection = 'ltr';
  imageSmoothingEnabled: boolean = true;
  imageSmoothingQuality: ImageSmoothingQuality = 'low';
  globalCompositeOperation: string = 'source-over';
  shadowBlur: number = 0;
  shadowColor: string = 'rgba(0, 0, 0, 0)';
  shadowOffsetX: number = 0;
  shadowOffsetY: number = 0;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  miterLimit: number = 10;
  lineDashOffset: number = 0;
  filter: string = 'none';
  letterSpacing: string = '';
  wordSpacing: string = '';
  fontKerning: CanvasFontKerning = 'auto';
  fontStretch: CanvasFontStretch = 'normal';
  fontVariantCaps: CanvasFontVariantCaps = 'normal';
  textRendering: CanvasTextRendering = 'auto';

  /** Clear recorded calls */
  clearRecording(): void {
    this.fillRectCalls = [];
    this.fillTextCalls = [];
    this.strokeCalls = [];
  }

  /** Get fillRect calls that are NOT the background clear (width > charWidth) */
  getCharacterFillRects(charWidth: number, charHeight: number): FillRectCall[] {
    return this.fillRectCalls.filter(
      c => c.w <= charWidth && c.h <= charHeight,
    );
  }

  /** Get as CanvasRenderingContext2D for passing to renderers */
  asCtx(): CanvasRenderingContext2D {
    return this as unknown as CanvasRenderingContext2D;
  }
}
