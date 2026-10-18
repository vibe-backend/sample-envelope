export const CSS_DPI = 96;
export const mmToPx = (mm: number, dpi = CSS_DPI) => (mm / 25.4) * dpi;
export const mmToCss = (mm: number) => `${mm}mm`;

/** Multiplier so on-screen "100%" matches a physical ruler/envelope (browsers use 96 CSS dpi). */
export const calibrationKey = "sample-envelope:screen-calibration:v1";
/** Measured against a physical 120×251 mm Taiwanese envelope on the primary workstation display. */
export const DEFAULT_CALIBRATION = 0.86;
export function loadCalibration() {
  try {
    const value = Number(localStorage.getItem(calibrationKey));
    if (Number.isFinite(value) && value >= 0.4 && value <= 1.6) return Math.round(value * 100) / 100;
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return DEFAULT_CALIBRATION;
}
export function saveCalibration(factor: number) {
  const value = Math.min(1.6, Math.max(0.4, Math.round(factor * 100) / 100));
  try {
    localStorage.setItem(calibrationKey, String(value));
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return value;
}
