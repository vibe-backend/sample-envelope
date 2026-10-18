import { emptyDraft, type Draft } from "./validation";
import { orientedSize, type EnvelopeSize, type Orientation, type WritingMode } from "./sizes";
export interface Settings {
  presetId: string;
  printPostcodeBoxes: boolean;
  printStampBox: boolean;
  printMailCheck: boolean;
  printRecipientFrame: boolean;
  printNotice: boolean;
  printOuterBorder: boolean;
  showTopPad: boolean;
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
  phoneGroups: boolean;
  phones: boolean;
  boxes: boolean;
  showAddressLabel: boolean;
  showPhoneLabel: boolean;
  showTitle: boolean;
  showSalutation: boolean;
  spacing: number;
  widthMm: number;
  heightMm: number;
}
export const defaultSettings = (s: EnvelopeSize, draft: Draft = emptyDraft): Settings => ({
  presetId: s.id,
  printPostcodeBoxes: s.id === "chinese-vertical",
  printStampBox: s.id === "chinese-vertical",
  printMailCheck: s.id === "chinese-vertical",
  printRecipientFrame: s.id === "chinese-vertical",
  printOuterBorder: s.id === "chinese-vertical",
  printNotice: s.id === "chinese-vertical",
  showTopPad: s.id === "chinese-vertical",
  orientation: s.defaultOrientation,
  writingMode: s.defaultWritingMode,
  font: "serif",
  nameSize: s.defaultWritingMode === "vertical-rl" ? 28 : 24,
  addressSize: s.id === "chinese-vertical" ? 20 : 14,
  senderSize: s.id === "chinese-vertical" ? 16 : s.defaultWritingMode === "vertical-rl" ? 13 : 10,
  nameX: 0,
  nameY: 0,
  addressX: 0,
  addressY: 0,
  // Calibrated on physical 中式直式 (user workstation nudge).
  senderX: s.id === "chinese-vertical" ? -12.3 : 0,
  senderY: s.id === "chinese-vertical" ? -2.3 : 0,
  phoneGroups: s.defaultWritingMode === "vertical-rl",
  phones: !!(draft.recipientPhone.trim() || draft.senderPhone.trim()),
  boxes: false,
  showAddressLabel: s.defaultWritingMode === "vertical-rl",
  showPhoneLabel: s.defaultWritingMode === "vertical-rl",
  showTitle: true,
  showSalutation: true,
  spacing: 0.1,
  ...orientedSize(s, s.defaultOrientation),
});
export const draftKey = "sample-envelope:draft:v1";
export const settingsKey = (id: string) => `sample-envelope:settings:v12:${id}`;
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
export function loadSettings(s: EnvelopeSize, draft: Draft = emptyDraft): Settings {
  const d = defaultSettings(s, draft),
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
  v.presetId = s.id;
  // Draft with phone numbers should show them; stale saves from an empty draft can leave phones off.
  if (d.phones) v.phones = true;
  if (s.id !== "chinese-vertical") {
    v.printPostcodeBoxes = v.printStampBox = v.printMailCheck = v.printRecipientFrame = v.printNotice = v.showTopPad = false;
  }
  if (s.id === "custom") v.orientation = v.widthMm <= v.heightMm ? "portrait" : "landscape";
  return {...v, ...orientedSize(v, v.orientation)};
}
export const saveSettings = (id: string, s: Settings) =>
  save(settingsKey(id), s);
export function resetSettings(s: EnvelopeSize, draft: Draft = emptyDraft) {
  const d = defaultSettings(s, draft);
  saveSettings(s.id, d);
  return d;
}
