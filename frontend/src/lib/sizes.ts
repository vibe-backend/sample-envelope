import { t } from "../i18n/zh-Hant";
export type Orientation = "portrait" | "landscape";
export type WritingMode = "vertical-rl" | "horizontal-tb";
// Chunghwa Post: https://www.post.gov.tw/post/internet/Customer_service/index.jsp?ID=16020316
// 標準信封長 140–235 mm、寬 90–165 mm，長邊至少為短邊 1.3 倍（直橫式相同）。
// 105×220 mm 是此範圍內常見的商用中式直式尺寸。
export const sizes = [
  {
    id: "chinese-vertical",
    widthMm: 105,
    heightMm: 220,
    defaultOrientation: "portrait",
    defaultWritingMode: "vertical-rl",
  },
  { id: "dl", widthMm: 110, heightMm: 220 },
  { id: "c5", widthMm: 162, heightMm: 229 },
  { id: "c6", widthMm: 114, heightMm: 162 },
  { id: "c4", widthMm: 229, heightMm: 324 },
  { id: "us10", widthMm: 105, heightMm: 241 },
  { id: "custom", widthMm: 120, heightMm: 180 },
].map((s) => ({
  ...s,
  label: t.sizes[s.id as keyof typeof t.sizes],
  defaultOrientation: (s.defaultOrientation || (s.id === "custom" ? "portrait" : "landscape")) as Orientation,
  defaultWritingMode: (s.defaultWritingMode || "horizontal-tb") as WritingMode,
}));
export type EnvelopeSize = (typeof sizes)[number];
export function orientedSize(
  size: Pick<EnvelopeSize, "widthMm" | "heightMm">,
  orientation: Orientation,
) {
  const widthMm = Math.min(size.widthMm, size.heightMm);
  const heightMm = Math.max(size.widthMm, size.heightMm);
  return orientation === "portrait" ? { widthMm, heightMm } : { widthMm: heightMm, heightMm: widthMm };
}
export const pageRule = (size: {widthMm: number; heightMm: number}) =>
  `@page { size: ${size.widthMm}mm ${size.heightMm}mm; margin: 0 }`;
