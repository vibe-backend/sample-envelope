import { expect, test } from "vitest";
import { stepValue } from "./step";

test.each([
  [0.1, 0.05, 1, 0.15],
  [0.15, 0.05, -1, 0.1],
  [0.3, 0.1, -1, 0.2],
  [0.2, 0.1, 1, 0.3],
  [14, 0.5, 1, 14.5],
  [14.5, 0.5, -1, 14],
  [0, 1, -1, -1],
  [120, 1, 1, 121],
  [0.0000002, 1e-7, 1, 0.0000003],
] as const)("stepValue(%s, %s, %s) = %s", (value, step, direction, expected) => {
  expect(stepValue(value, step, direction)).toBe(expected);
});
