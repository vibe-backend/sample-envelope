import { expect, test } from "vitest";
import { DEFAULT_CALIBRATION, calibrationKey, loadCalibration, mmToCss, mmToPx, saveCalibration } from "./units";
test("converts physical units", () => {
  expect(mmToPx(25.4)).toBe(96);
  expect(mmToPx(25.4, 300)).toBe(300);
  expect(mmToCss(110)).toBe("110mm");
});
test("screen calibration persists within range", () => {
  localStorage.clear();
  expect(DEFAULT_CALIBRATION).toBe(0.86);
  expect(loadCalibration()).toBe(0.86);
  expect(saveCalibration(0.82)).toBe(0.82);
  expect(localStorage.getItem(calibrationKey)).toBe("0.82");
  expect(loadCalibration()).toBe(0.82);
  expect(saveCalibration(0.1)).toBe(0.4);
  expect(saveCalibration(9)).toBe(1.6);
});
