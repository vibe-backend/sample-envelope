import { expect, test } from "vitest";
import { mmToCss, mmToPx } from "./units";
test("converts physical units", () => {
  expect(mmToPx(25.4)).toBe(96);
  expect(mmToPx(25.4, 300)).toBe(300);
  expect(mmToCss(110)).toBe("110mm");
});
