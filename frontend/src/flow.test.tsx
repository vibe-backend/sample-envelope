import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import { t } from "./i18n/zh-Hant";
import { sizes } from "./lib/sizes";
import { mmToPx } from "./lib/units";

const createEnvelopePdfUrl = vi.fn().mockResolvedValue("blob:mock-pdf");
vi.mock("./lib/pdf", () => ({
  createEnvelopePdfUrl: (...args: unknown[]) => createEnvelopePdfUrl(...args),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = "/";
  createEnvelopePdfUrl.mockClear();
  createEnvelopePdfUrl.mockResolvedValue("blob:mock-pdf");
});
test("sample to gallery to editor and physical print size", async () => {
  window.location.hash = "/";
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: t.sample }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(t.next) }));
  const card = await screen.findByRole("button", { name: /中式直式/ });
  expect(screen.getAllByRole("button").length).toBe(8);
  fireEvent.click(card);
  const button = await screen.findByRole("button", { name: /列印/ });
  await waitFor(() =>
    expect(document.getElementById("page-size")?.textContent).toContain(
      "120mm 252mm",
    ),
  );
  expect((screen.getByRole("checkbox", {name: t.phones}) as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByRole("checkbox", {name: t.boxes})).toBeNull();
  for (const key of ["showTopPad", "printPostcodeBoxes", "printStampBox", "printMailCheck", "printRecipientFrame", "printNotice"] as const) {
    expect((screen.getByRole("checkbox", {name: t[key]}) as HTMLInputElement).checked).toBe(true);
  }
  expect((screen.getByRole("checkbox", {name: t.showAddressLabel}) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByRole("checkbox", {name: t.showPhoneLabel}) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(button);
  expect(createEnvelopePdfUrl).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {name: t.print}));
  await waitFor(() => expect(createEnvelopePdfUrl).toHaveBeenCalledWith({ widthMm: 120, heightMm: 252 }));
  const preview = await screen.findByRole("dialog");
  expect(within(preview).getByTitle(t.pdfPreview)).toBeTruthy();
  expect((within(preview).getByTitle(t.pdfPreview) as HTMLIFrameElement).src).toContain("blob:mock-pdf");
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

test("print dialog cancellation and remembered opt-out", async () => {
  window.location.hash = "/editor/custom";
  render(<App />);
  fireEvent.click(screen.getByRole("button", {name:/列印/}));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.getByText(t.printItems)).toBeTruthy();
  expect(screen.getByText(t.printTipPdf.replace("{size}", "120×180"))).toBeTruthy();
  expect(screen.getByRole("checkbox", {name: t.printOuterBorder})).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name:t.cancel}));
  expect(createEnvelopePdfUrl).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name: t.print}));
  fireEvent.click(screen.getByRole("checkbox", {name:t.skipPrint}));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {name: t.print}));
  expect(localStorage.getItem("sample-envelope:skip-print-dialog")).toBe("true");
  await waitFor(() => expect(createEnvelopePdfUrl).toHaveBeenCalledTimes(1));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {name: t.closePreview}));
  fireEvent.click(screen.getByRole("button", {name: t.print}));
  await waitFor(() => expect(createEnvelopePdfUrl).toHaveBeenCalledTimes(2));
  expect(within(screen.getByRole("dialog")).getByTitle(t.pdfPreview)).toBeTruthy();
});

test("print dialog can turn off outline and red frame before printing", async () => {
  window.location.hash = "/editor/chinese-vertical";
  render(<App />);
  fireEvent.click(screen.getByRole("button", {name:/列印/}));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(t.printItems)).toBeTruthy();
  for (const key of ["printOuterBorder", "showTopPad", "printRecipientFrame", "printStampBox", "printMailCheck", "printPostcodeBoxes", "printNotice"] as const) {
    const box = within(dialog).getByRole<HTMLInputElement>("checkbox", {name: t[key]});
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(box.checked).toBe(false);
  }
  expect(document.querySelector(".recipient-frame")).toBeNull();
  expect(document.querySelector(".outer-border")).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", {name: t.print}));
  await waitFor(() => expect(createEnvelopePdfUrl).toHaveBeenCalledWith({ widthMm: 120, heightMm: 252 }));
});

test("print opens a PDF iframe preview before the print dialog", async () => {
  window.location.hash = "/editor/custom";
  render(<App />);
  fireEvent.click(screen.getByRole("button", {name: /列印/}));
  const settings = screen.getByRole("dialog");
  expect(screen.getByText(t.printTipPdf.replace("{size}", "120×180"))).toBeTruthy();
  expect(within(settings).queryByRole("button", {name: /下載/})).toBeNull();
  fireEvent.click(within(settings).getByRole("button", {name: t.print}));
  await waitFor(() => expect(createEnvelopePdfUrl).toHaveBeenCalledWith({
    widthMm: 120,
    heightMm: 180,
  }));
  const preview = await screen.findByRole("dialog");
  expect(within(preview).getByText(t.pdfPreview)).toBeTruthy();
  const frame = within(preview).getByTitle(t.pdfPreview) as HTMLIFrameElement;
  expect(frame.src).toContain("blob:mock-pdf");
  expect(within(preview).getByRole("button", {name: t.print})).toBeTruthy();
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

test("preview zoom can switch between fit and 100%", () => {
  window.location.hash = "/editor/chinese-vertical";
  const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(320);
  try {
    render(<App />);
    const scaled = () => document.querySelector<HTMLElement>(".preview-area .scaled-envelope")!;
    const fit = Number(scaled().style.transform.match(/scale\(([^)]+)\)/)![1]);
    expect(fit).toBeLessThan(1);
    expect(screen.getByText(new RegExp(`${t.scale} ${Math.round(fit * 100)}%`))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: t.zoomActual}));
    expect(scaled().style.transform).toBe("scale(0.86)");
    expect(screen.getByText(`${t.scale} 100%`)).toBeTruthy();
    expect(screen.getByText("0.86")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: `${t.screenCalibrate} ${t.decrease}`}));
    expect(scaled().style.transform).toBe("scale(0.85)");
    expect(screen.getByText("0.85")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: t.screenCalibrateReset}));
    expect(scaled().style.transform).toBe("scale(0.86)");
    expect(screen.getByText("0.86")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: t.zoomFit}));
    expect(scaled().style.transform).toBe(`scale(${fit})`);
  } finally {
    width.mockRestore();
  }
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
    expect(screen.getByRole("button", {name: /中式直式.*直式・中文直書.*120 × 252/})).toBeTruthy();
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


test("recipient visibility toggles default on and can be switched off", () => {
  window.location.hash = "/editor/chinese-vertical";
  render(<App />);
  for (const name of [t.showTitle, t.showSalutation, t.showPhoneLabel]) {
    const toggle = screen.getByRole<HTMLInputElement>("checkbox", {name});
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
  }
});
