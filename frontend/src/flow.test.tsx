import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "./App";
import { t } from "./i18n/zh-Hant";
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = "/";
});
test("sample to gallery to editor and physical print size", async () => {
  window.location.hash = "/";
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: t.sample }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(t.next) }));
  const card = await screen.findByRole("button", { name: /中式直式/ });
  expect(screen.getAllByRole("button").length).toBe(8);
  fireEvent.click(card);
  const button = await screen.findByRole("button", { name: /列印/ });
  await waitFor(() =>
    expect(document.getElementById("page-size")?.textContent).toContain(
      "105mm 220mm",
    ),
  );
  fireEvent.click(button);
  expect(print).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name: t.print}));
  expect(print).toHaveBeenCalledOnce();
  print.mockRestore();
});

for (const confirmed of [false, true]) {
  test(`sample replacement confirmation ${confirmed}`, () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(confirmed);
    render(<App />);
    const input = document.getElementById("recipientName") as HTMLInputElement;
    fireEvent.change(input, {target: {value: "原本資料"}});
    fireEvent.click(screen.getByRole("button", {name: t.sample}));
    expect(confirm).toHaveBeenCalledWith(t.sampleConfirm);
    expect(input.value).toBe(confirmed ? t.sampleData.recipientName : "原本資料");
    confirm.mockRestore();
  });
}

test("custom fields are physical W×H; toggle swaps fields and page", async () => {
  window.location.hash = "/editor/custom";
  render(<App />);
  const width = document.getElementById("widthMm") as HTMLInputElement;
  const height = document.getElementById("heightMm") as HTMLInputElement;
  expect([width.value, height.value]).toEqual(["120", "180"]);
  expect(document.getElementById("page-size")?.textContent).toContain("120mm 180mm");
  fireEvent.change(width, {target: {value:"200"}});
  fireEvent.change(height, {target: {value:"100"}});
  expect(document.getElementById("page-size")?.textContent).toContain("200mm 100mm");
  fireEvent.change(document.getElementById("orientation")!, {target:{value:"portrait"}});
  expect([width.value, height.value]).toEqual(["100", "200"]);
  expect(document.getElementById("page-size")?.textContent).toContain("100mm 200mm");
  const font = screen.getByRole("spinbutton", {name: `${t.nameBlock} ${t.fontSize}`}) as HTMLInputElement;
  fireEvent.change(font, {target:{value:"100"}});
  expect(font.getAttribute("aria-invalid")).toBe("true");
  expect(font.value).toBe("100");
  fireEvent.change(font, {target:{value:""}});
  expect(font.getAttribute("aria-invalid")).toBe("true");
});

test("print dialog cancellation and remembered opt-out", () => {
  window.location.hash = "/editor/custom";
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<App />);
  fireEvent.click(screen.getByRole("button", {name:/列印 ↗/}));
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name:t.cancel}));
  expect(print).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name:/列印 ↗/}));
  fireEvent.click(screen.getByRole("checkbox", {name:t.skipPrint}));
  fireEvent.click(screen.getByRole("button", {name:t.print}));
  expect(localStorage.getItem("sample-envelope:skip-print-dialog")).toBe("true");
  fireEvent.click(screen.getByRole("button", {name:/列印 ↗/}));
  expect(print).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("dialog")).toBeNull();
  print.mockRestore();
});

test("block steppers and number inputs have distinct accessible names", () => {
  window.location.hash = "/editor/custom";
  render(<App />);
  for (const block of [t.nameBlock, t.addressBlock, t.senderBlock]) {
    for (const field of [t.fontSize, t.x, t.y]) {
      const name = `${block} ${field}`;
      const input = screen.getByRole("spinbutton", {name}) as HTMLInputElement;
      const initial = Number(input.value);
      const step = field === t.fontSize ? 0.5 : 1;
      fireEvent.click(screen.getByRole("button", {name: `${name} ${t.increase}`}));
      expect(Number(input.value)).toBe(initial + step);
      fireEvent.click(screen.getByRole("button", {name: `${name} ${t.decrease}`}));
      expect(Number(input.value)).toBe(initial);
    }
  }
});
