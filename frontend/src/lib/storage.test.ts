import { beforeEach, expect, test } from "vitest";
import {
  defaultSettings,
  draftKey,
  loadDraft,
  loadSettings,
  resetDraft,
  resetSettings,
  saveDraft,
  saveSettings,
  settingsKey,
} from "./storage";
import { emptyDraft } from "./validation";
import { sizes } from "./sizes";
import { t } from "../i18n/zh-Hant";
beforeEach(() => localStorage.clear());
test("draft saves, restores and resets", () => {
  const d = { ...emptyDraft, recipientName: "測試" };
  saveDraft(d);
  expect(localStorage.getItem("sample-envelope:draft:v1")).toBe(JSON.stringify(d));
  expect(loadDraft()).toEqual(d);
  resetDraft();
  expect(loadDraft()).toEqual(emptyDraft);
});
test("settings are isolated by size and reset", () => {
  const s = { ...defaultSettings(sizes[0]), nameSize: 30 };
  saveSettings(sizes[0].id, s);
  expect(localStorage.getItem(`sample-envelope:settings:v9:${sizes[0].id}`)).toBe(JSON.stringify(s));
  expect(loadSettings(sizes[0])).toEqual(s);
  expect(loadSettings(sizes[1])).toEqual(defaultSettings(sizes[1]));
  resetSettings(sizes[0]);
  expect(loadSettings(sizes[0])).toEqual(defaultSettings(sizes[0]));
});
test("corrupt JSON falls back to defaults", () => {
  localStorage.setItem(draftKey, "{bad");
  localStorage.setItem(settingsKey(sizes[0].id), "null");
  expect(loadDraft()).toEqual(emptyDraft);
  expect(loadSettings(sizes[0])).toEqual(defaultSettings(sizes[0]));
});

test("new defaults use inline postcodes and phone presence", () => {
  for (const size of sizes) {
    const s = defaultSettings(size);
    expect(s.showTitle).toBe(true);
    expect(s.showSalutation).toBe(true);
    expect(s.phones).toBe(false);
    expect(s.boxes).toBe(false);
    expect(s.showAddressLabel).toBe(size.defaultWritingMode === "vertical-rl");
    expect(s.showPhoneLabel).toBe(size.defaultWritingMode === "vertical-rl");
    expect(defaultSettings(size).phoneGroups).toBe(size.defaultWritingMode === "vertical-rl");
    expect(defaultSettings(size, {...emptyDraft, recipientPhone: "0912345678"}).phones).toBe(true);
    expect(defaultSettings(size, {...emptyDraft, senderPhone: "0928-619-378"}).phones).toBe(true);
    expect(defaultSettings(size, {...emptyDraft, senderPhone: "  "}).phones).toBe(false);
  }
  expect(defaultSettings(sizes[0])).toMatchObject({nameSize: 28, addressSize: 20, senderSize: 16});
});

test("stale phones:false is restored when the draft has phone numbers", () => {
  const draft = {...emptyDraft, ...t.sampleData};
  saveSettings(sizes[0].id, {...defaultSettings(sizes[0], draft), phones: false});
  expect(loadSettings(sizes[0], draft).phones).toBe(true);
  expect(loadSettings(sizes[0], emptyDraft).phones).toBe(false);
});

test("previous settings cannot override the calibrated defaults", () => {
  for (const version of [1, 4, 5, 6, 7, 8]) {
    localStorage.setItem(`sample-envelope:settings:v${version}:${sizes[0].id}`, JSON.stringify({boxes: true, senderSize: 13, addressSize: 12, widthMm: 120, heightMm: 230}));
  }
  expect(settingsKey(sizes[0].id)).toBe(`sample-envelope:settings:v9:${sizes[0].id}`);
  expect(loadSettings(sizes[0])).toEqual(defaultSettings(sizes[0]));
  expect(defaultSettings(sizes[0])).toMatchObject({widthMm: 120, heightMm: 252});
});

 test("preprinted defaults belong only to the Chinese preset", () => {
  for (const size of sizes) {
    const settings = defaultSettings(size);
    for (const key of ["printPostcodeBoxes", "printStampBox", "printMailCheck", "printRecipientFrame", "printNotice", "printOuterBorder", "showTopPad"] as const) {
      expect(settings[key]).toBe(size.id === "chinese-vertical");
    }
  }
  localStorage.setItem(settingsKey("dl"), JSON.stringify({printNotice: true, printStampBox: true, printMailCheck: true, printPostcodeBoxes: true, printRecipientFrame: true}));
  expect(loadSettings(sizes[1])).toEqual(defaultSettings(sizes[1]));
});
