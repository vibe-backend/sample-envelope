import { expect, test } from "vitest";
import { render } from "@testing-library/react";
import { digitRuns } from "./Envelope";

test("only one- and two-digit runs combine in vertical text", () => {
  const text = "路1號12樓 123 2123 4567 12345 123456";
  const { container, unmount } = render(
    <div style={{ writingMode: "vertical-rl" }}>{digitRuns(text)}</div>,
  );

  expect(container.textContent).toBe(text);
  const runs = [...container.querySelectorAll("span")];
  expect(runs.map((run) => run.textContent)).toEqual([
    "1", "12", "123", "2123", "4567", "12345", "123456",
  ]);
  for (const run of runs) {
    const combines = run.textContent!.length <= 2;
    expect(run.style.textCombineUpright).toBe(combines ? "all" : "");
    expect(run.style.textOrientation).toBe(combines ? "" : "upright");
  }
  unmount();
});
