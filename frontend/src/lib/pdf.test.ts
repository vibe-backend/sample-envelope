import { afterEach, beforeEach, expect, test, vi } from "vitest";

const domToPng = vi.fn(async () => "data:image/png;base64,aaa");
vi.mock("modern-screenshot", () => ({
  domToPng: (...args: unknown[]) =>
    (domToPng as unknown as (...a: unknown[]) => Promise<string>)(...args),
}));

const embedPng = vi.fn(async () => ({ width: 10, height: 10 }));
const drawImage = vi.fn();
const getWidth = vi.fn(() => 100);
const getHeight = vi.fn(() => 200);
const save = vi.fn(async () => new Uint8Array([1, 2, 3]));
const addPage = vi.fn(() => ({ drawImage, getWidth, getHeight }));
vi.mock("pdf-lib", () => ({
  PDFDocument: { create: vi.fn(async () => ({ addPage, embedPng, save })) },
}));

beforeEach(() => {
  document.body.innerHTML = "";
  domToPng.mockClear();
  embedPng.mockClear();
  drawImage.mockClear();
  save.mockClear();
  addPage.mockClear();

  const scaled = document.createElement("div");
  scaled.className = "scaled-envelope";
  scaled.style.transform = "scale(0.5)";
  const envelope = document.createElement("div");
  envelope.className = "envelope";
  Object.defineProperty(envelope, "offsetWidth", { value: 120, configurable: true });
  Object.defineProperty(envelope, "offsetHeight", { value: 251, configurable: true });
  scaled.append(envelope);
  document.body.append(scaled);

  vi.stubGlobal("fetch", vi.fn(async () => ({
    arrayBuffer: async () => new ArrayBuffer(8),
  })));
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("createEnvelopePdfUrl builds a PDF blob URL for the iframe viewer", async () => {
  const { createEnvelopePdfUrl } = await import("./pdf");
  const url = await createEnvelopePdfUrl({ widthMm: 120, heightMm: 251 });
  expect(domToPng).toHaveBeenCalled();
  expect(URL.createObjectURL).toHaveBeenCalled();
  expect(url).toBe("blob:test");
});

test("buildEnvelopePdf throws when envelope is missing", async () => {
  document.body.innerHTML = "";
  vi.resetModules();
  vi.doMock("modern-screenshot", () => ({
    domToPng: (...args: unknown[]) =>
      (domToPng as unknown as (...a: unknown[]) => Promise<string>)(...args),
  }));
  vi.doMock("pdf-lib", () => ({
    PDFDocument: { create: vi.fn(async () => ({ addPage, embedPng, save })) },
  }));
  const { buildEnvelopePdf } = await import("./pdf");
  await expect(buildEnvelopePdf({ widthMm: 120, heightMm: 251 })).rejects.toThrow("missing-envelope");
});
