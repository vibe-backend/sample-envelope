import { t } from "../i18n/zh-Hant";
export type Orientation = "portrait" | "landscape";
export type WritingMode = "vertical-rl" | "horizontal-tb";
export const sizes = [
  {
    id: "chinese-vertical",
    widthMm: 110,
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
  defaultOrientation: (s.defaultOrientation || "landscape") as Orientation,
  defaultWritingMode: (s.defaultWritingMode || "horizontal-tb") as WritingMode,
}));
export type EnvelopeSize = (typeof sizes)[number];
export function orientedSize(
  size: Pick<EnvelopeSize, "widthMm" | "heightMm">,
  orientation: Orientation,
) {
  return orientation === "portrait"
    ? { widthMm: size.widthMm, heightMm: size.heightMm }
    : { widthMm: size.heightMm, heightMm: size.widthMm };
}
