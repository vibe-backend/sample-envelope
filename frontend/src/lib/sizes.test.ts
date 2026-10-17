import { expect, test } from "vitest";
import { sizes, orientedSize, pageRule } from "./sizes";
test("all seven presets have expected physical sizes and defaults", () => {
  const expected = [
    ["chinese-vertical", 120, 230],
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
    expect(s.defaultOrientation).toBe(i === 0 || i === 6 ? "portrait" : "landscape");
    expect(s.defaultWritingMode).toBe(
      i === 0 ? "vertical-rl" : "horizontal-tb",
    );
  });
  expect(orientedSize(sizes[0], "landscape")).toEqual({
    widthMm: 230,
    heightMm: 120,
  });
  expect(orientedSize(sizes[0], "portrait")).toEqual({
    widthMm: 120,
    heightMm: 230,
  });
});

test("custom dimensions map directly and orientation swaps printing dimensions", () => {
  for (const [w,h] of [[120,180], [200,100]]) {
    const orientation = w <= h ? "portrait" : "landscape";
    const size = {widthMm:w, heightMm:h};
    expect(orientedSize(size, orientation)).toEqual(size);
    expect(pageRule(orientedSize(size, orientation))).toBe(`@page { size: ${w}mm ${h}mm; margin: 0 }`);
    expect(orientedSize(size, orientation === "portrait" ? "landscape" : "portrait")).toEqual({widthMm:h,heightMm:w});
  }
});
