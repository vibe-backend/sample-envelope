import { expect, test } from "vitest";
import { sizes, orientedSize } from "./sizes";
test("all seven presets have expected physical sizes and defaults", () => {
  const expected = [
    ["chinese-vertical", 110, 220],
    ["dl", 110, 220],
    ["c5", 162, 229],
    ["c6", 114, 162],
    ["c4", 229, 324],
    ["us10", 105, 241],
    ["custom", 120, 180],
  ];
  expect(sizes).toHaveLength(7);
  expected.forEach(([id, w, h], i) => {
    const s = sizes[i];
    expect([s.id, s.widthMm, s.heightMm]).toEqual([id, w, h]);
    expect(s.defaultOrientation).toBe(i === 0 ? "portrait" : "landscape");
    expect(s.defaultWritingMode).toBe(
      i === 0 ? "vertical-rl" : "horizontal-tb",
    );
  });
  expect(orientedSize(sizes[0], "landscape")).toEqual({
    widthMm: 220,
    heightMm: 110,
  });
  expect(orientedSize(sizes[0], "portrait")).toEqual({
    widthMm: 110,
    heightMm: 220,
  });
});
