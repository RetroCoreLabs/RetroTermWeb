/**
 * UI test setup — provides a mock Canvas 2D context for happy-dom.
 *
 * happy-dom doesn't implement CanvasRenderingContext2D, so
 * HTMLCanvasElement.getContext('2d') returns null. This setup
 * patches getContext to return a minimal mock that satisfies
 * CanvasRenderer's requirements.
 */

const mockTextMetrics: TextMetrics = {
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

function createMockContext2D(): CanvasRenderingContext2D {
  const ctx: Record<string, unknown> = {
    // State
    canvas: null as unknown,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    globalAlpha: 1.0,
    lineWidth: 1,
    font: '16px monospace',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    direction: 'ltr' as CanvasDirection,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    globalCompositeOperation: 'source-over',
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
    lineDashOffset: 0,
    filter: 'none',
    letterSpacing: '',
    wordSpacing: '',
    fontKerning: 'auto' as CanvasFontKerning,
    fontStretch: 'normal' as CanvasFontStretch,
    fontVariantCaps: 'normal' as CanvasFontVariantCaps,
    textRendering: 'auto' as CanvasTextRendering,

    // Drawing methods (no-op stubs)
    fillRect(_x: number, _y: number, _w: number, _h: number): void {},
    clearRect(_x: number, _y: number, _w: number, _h: number): void {},
    strokeRect(_x: number, _y: number, _w: number, _h: number): void {},
    fillText(_text: string, _x: number, _y: number, _maxWidth?: number): void {},
    strokeText(_text: string, _x: number, _y: number, _maxWidth?: number): void {},
    measureText(_text: string): TextMetrics {
      return mockTextMetrics;
    },

    // Path methods
    beginPath(): void {},
    closePath(): void {},
    moveTo(_x: number, _y: number): void {},
    lineTo(_x: number, _y: number): void {},
    bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, _x: number, _y: number): void {},
    quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number): void {},
    arc(_x: number, _y: number, _radius: number, _start: number, _end: number, _ccw?: boolean): void {},
    arcTo(_x1: number, _y1: number, _x2: number, _y2: number, _radius: number): void {},
    ellipse(_x: number, _y: number, _rx: number, _ry: number, _rot: number, _start: number, _end: number, _ccw?: boolean): void {},
    rect(_x: number, _y: number, _w: number, _h: number): void {},
    roundRect(_x: number, _y: number, _w: number, _h: number, _radii?: number | number[]): void {},
    fill(): void {},
    stroke(): void {},
    clip(): void {},
    isPointInPath(_x: number, _y: number): boolean { return false; },
    isPointInStroke(_x: number, _y: number): boolean { return false; },

    // Transform
    scale(_x: number, _y: number): void {},
    rotate(_angle: number): void {},
    translate(_x: number, _y: number): void {},
    transform(_a: number, _b: number, _c: number, _d: number, _e: number, _f: number): void {},
    setTransform(_a?: number, _b?: number, _c?: number, _d?: number, _e?: number, _f?: number): void {},
    getTransform(): DOMMatrix { return new DOMMatrix(); },
    resetTransform(): void {},

    // Image
    drawImage(): void {},
    createImageData(sw: number, sh: number): ImageData {
      return new ImageData(sw, sh);
    },
    getImageData(_sx: number, _sy: number, sw: number, sh: number): ImageData {
      return new ImageData(sw, sh);
    },
    putImageData(_imageData: ImageData, _dx: number, _dy: number): void {},

    // Gradient/Pattern
    createLinearGradient(_x0: number, _y0: number, _x1: number, _y1: number): CanvasGradient {
      return { addColorStop() {} } as unknown as CanvasGradient;
    },
    createRadialGradient(_x0: number, _y0: number, _r0: number, _x1: number, _y1: number, _r1: number): CanvasGradient {
      return { addColorStop() {} } as unknown as CanvasGradient;
    },
    createConicGradient(_startAngle: number, _x: number, _y: number): CanvasGradient {
      return { addColorStop() {} } as unknown as CanvasGradient;
    },
    createPattern(): CanvasPattern | null { return null; },

    // State stack
    save(): void {},
    restore(): void {},
    reset(): void {},

    // Line dash
    setLineDash(_segments: number[]): void {},
    getLineDash(): number[] { return []; },
  };

  return ctx as unknown as CanvasRenderingContext2D;
}

// Patch HTMLCanvasElement.prototype.getContext to return our mock
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  options?: unknown,
): RenderingContext | null {
  if (contextId === '2d') {
    const mockCtx = createMockContext2D();
    (mockCtx as any).canvas = this;
    return mockCtx;
  }
  return originalGetContext.call(this, contextId, options as any);
};
