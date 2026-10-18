import { domToPng } from "modern-screenshot";
import { PDFDocument } from "pdf-lib";

const mmToPt = (mm: number) => (mm * 72) / 25.4;

function waitFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/** Snapshot the live preview envelope into an envelope-sized PDF (bytes). */
export async function buildEnvelopePdf(opts: {
  widthMm: number;
  heightMm: number;
}): Promise<Uint8Array> {
  const envelope = document.querySelector<HTMLElement>(".envelope");
  if (!envelope) throw new Error("missing-envelope");

  const scaled = envelope.closest<HTMLElement>(".scaled-envelope");
  const prevTransform = scaled?.style.transform ?? "";
  if (scaled) scaled.style.transform = "none";

  try {
    await document.fonts?.ready;
    await waitFrame();

    const width = envelope.offsetWidth;
    const height = envelope.offsetHeight;
    if (width < 1 || height < 1) throw new Error("empty-envelope");

    const dataUrl = await domToPng(envelope, {
      width,
      height,
      scale: 3,
      backgroundColor: "#ffffff",
      style: {
        transform: "none",
        margin: "0",
      },
    });

    const png = await fetch(dataUrl).then((r) => r.arrayBuffer());
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([mmToPt(opts.widthMm), mmToPt(opts.heightMm)]);
    const image = await pdf.embedPng(png);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    });
    return pdf.save();
  } finally {
    if (scaled) scaled.style.transform = prevTransform;
  }
}

/** Build the envelope PDF and return a blob URL for an iframe viewer. Caller must revoke. */
export async function createEnvelopePdfUrl(opts: {
  widthMm: number;
  heightMm: number;
}): Promise<string> {
  const bytes = await buildEnvelopePdf(opts);
  return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
}
