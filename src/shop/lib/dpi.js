// Print quality for an image layer in the Studio. Layers live in printfile
// pixel space (e.g. tee front 1800×2400 @150 dpi = 12"×16"), so the printed
// size of a layer is width/areaDpi inches; the image's own pixels across that
// width give its effective DPI. Printful rule: ≥150 dpi looks sharp.

export const DPI_GOOD = 150;
export const DPI_MIN = 100;

/** Effective DPI of an image (naturalWidth × naturalHeight) drawn at layerW × layerH printfile px. */
export function effectiveDpi({ naturalWidth, naturalHeight, layerWidth, layerHeight, areaDpi = 150 }) {
  if (!(naturalWidth > 0 && naturalHeight > 0 && layerWidth > 0 && layerHeight > 0 && areaDpi > 0)) return 0;
  const inchesW = layerWidth / areaDpi;
  const inchesH = layerHeight / areaDpi;
  return Math.floor(Math.min(naturalWidth / inchesW, naturalHeight / inchesH));
}

/** 'good' | 'warn' | 'bad' */
export function dpiStatus(dpi) {
  if (dpi >= DPI_GOOD) return 'good';
  if (dpi >= DPI_MIN) return 'warn';
  return 'bad';
}

export const DPI_COPY = {
  good: 'Sharp — prints great.',
  warn: 'A little soft at this size. Make it smaller or use a bigger image.',
  bad: 'Too blurry to print at this size. Make it smaller or upload a higher-resolution image.',
};

/** Largest printfile width this image can be drawn at and still hit `target` DPI. */
export const maxWidthForDpi = (naturalWidth, areaDpi = 150, target = DPI_GOOD) =>
  naturalWidth > 0 ? Math.floor((naturalWidth / target) * areaDpi) : 0;

/** Printed size label like `10.2" × 6.1"`. */
export const inchesLabel = (w, h, areaDpi = 150) => `${(w / areaDpi).toFixed(1)}" × ${(h / areaDpi).toFixed(1)}"`;
