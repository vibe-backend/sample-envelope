import { emptyDraft, type Draft } from "./validation";
import type { EnvelopeSize, Orientation, WritingMode } from "./sizes";
export interface Settings {
  orientation: Orientation;
  writingMode: WritingMode;
  font: "serif" | "sans" | "kai";
  nameSize: number;
  addressSize: number;
  senderSize: number;
  nameX: number;
  nameY: number;
  addressX: number;
  addressY: number;
  senderX: number;
  senderY: number;
  phones: boolean;
  boxes: boolean;
  spacing: number;
  widthMm: number;
  heightMm: number;
}
export const defaultSettings = (s: EnvelopeSize): Settings => ({
  orientation: s.defaultOrientation,
  writingMode: s.defaultWritingMode,
  font: "serif",
  nameSize: 24,
  addressSize: 14,
  senderSize: 10,
  nameX: 0,
  nameY: 0,
  addressX: 0,
  addressY: 0,
  senderX: 0,
  senderY: 0,
  phones: true,
  boxes: false,
  spacing: 0.12,
  widthMm: s.widthMm,
  heightMm: s.heightMm,
});
export const draftKey = "sample-envelope:draft:v1";
export const settingsKey = (id: string) => `sample-envelope:settings:v1:${id}`;
function load<T extends object>(key: string, fallback: T): T {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (!data || typeof data !== "object" || Array.isArray(data))
      return { ...fallback };
    const result = { ...fallback };
    for (const k of Object.keys(fallback) as (keyof T)[]) {
      const v = (data as T)[k];
      if (
        typeof v === typeof fallback[k] &&
        (typeof v !== "number" || Number.isFinite(v))
      )
        result[k] = v;
    }
    return result;
  } catch {
    return { ...fallback };
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
}
export const loadDraft = () => load(draftKey, emptyDraft);
export const saveDraft = (draft: Draft) => save(draftKey, draft);
export function resetDraft() {
  saveDraft(emptyDraft);
  return { ...emptyDraft };
}
export function loadSettings(s: EnvelopeSize): Settings {
  const d = defaultSettings(s),
    v = load(settingsKey(s.id), d);
  if (
    !["portrait", "landscape"].includes(v.orientation) ||
    !["vertical-rl", "horizontal-tb"].includes(v.writingMode) ||
    !["serif", "sans", "kai"].includes(v.font)
  )
    return d;
  for (const key of ["widthMm", "heightMm"] as const)
    v[key] = Math.max(50, Math.min(500, v[key]));
  for (const key of ["nameSize", "addressSize", "senderSize"] as const)
    v[key] = Math.max(6, Math.min(72, v[key]));
  return v;
}
export const saveSettings = (id: string, s: Settings) =>
  save(settingsKey(id), s);
export function resetSettings(s: EnvelopeSize) {
  const d = defaultSettings(s);
  saveSettings(s.id, d);
  return d;
}
