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
import { sizes } from "./lib/sizes";
import { mmToPx } from "./lib/units";
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
  expect((screen.getByRole("checkbox", {name: t.phones}) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByRole("checkbox", {name: t.boxes}) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole("checkbox", {name: t.showAddressLabel}) as HTMLInputElement).checked).toBe(true);
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

test("phone display is off and disabled without phone data", () => {
  window.location.hash = "/editor/chinese-vertical";
  render(<App />);
  const checkbox = screen.getByRole("checkbox", {name: t.phones}) as HTMLInputElement;
  expect(checkbox.checked).toBe(false);
  expect(checkbox.disabled).toBe(true);
});

test("letter-spacing steps display decimal values and remain valid", () => {
  window.location.hash = "/editor/custom";
  render(<App />);
  const input = screen.getByRole("spinbutton", {name: t.spacing}) as HTMLInputElement;
  expect(input.value).toBe("0.1");
  expect(input.checkValidity()).toBe(true);
  fireEvent.click(screen.getByRole("button", {name: `${t.spacing} ${t.increase}`}));
  expect(input.value).toBe("0.15");
  expect(input.checkValidity()).toBe(true);
  fireEvent.click(screen.getByRole("button", {name: `${t.spacing} ${t.decrease}`}));
  expect(input.value).toBe("0.1");
  expect(input.checkValidity()).toBe(true);
});

test.each(sizes)("all default steppers are valid for $id", ({id}) => {
  window.location.hash = `/editor/${id}`;
  render(<App />);
  for (const input of screen.getAllByRole<HTMLInputElement>("spinbutton")) {
    expect(input.checkValidity(), input.id).toBe(true);
  }
});


test("gallery cards describe presets and hide non-focusable true-size previews", () => {
  window.location.hash = "/gallery";
  const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(410);
  try {
    render(<App />);
    expect(screen.getByRole("button", {name: /中式直式.*直式・中文直書.*105 × 220/})).toBeTruthy();
    expect(screen.getByRole("button", {name: /DL.*橫式・西式橫書/})).toBeTruthy();
    for (const size of sizes) {
      const descriptor = size.id === "custom" ? "自訂尺寸" : size.id === "chinese-vertical" ? "直式・中文直書" : "橫式・西式橫書";
      const card = screen.getByRole("button", {name: `${size.label} ${descriptor} ${size.widthMm} × ${size.heightMm} mm`});
      const preview = card.querySelector<HTMLElement>(".thumbnail")!;
      expect(preview.getAttribute("aria-hidden")).toBe("true");
      expect(preview.querySelector("[tabindex], button, input, select, textarea, a[href]")).toBeNull();
      if (size.id === "c4") {
        const envelope = preview.querySelector<HTMLElement>(".envelope")!;
        expect(envelope.style.width).toBe(`${324}mm`);
        expect(envelope.style.height).toBe(`${229}mm`);
        const scaled = preview.querySelector<HTMLElement>(".scaled-envelope")!;
        const scale = Number(scaled.style.transform.match(/scale\(([^)]+)\)/)![1]);
        expect(scale).toBeGreaterThanOrEqual(0.3);
        expect(scale).toBeCloseTo((410 - 32) / mmToPx(324));
      }
    }
  } finally {
    width.mockRestore();
  }
});
