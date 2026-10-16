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
  expect(localStorage.getItem(`sample-envelope:settings:v1:${sizes[0].id}`)).toBe(JSON.stringify(s));
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

test("all sizes default to no phones; Chinese vertical enables postcode boxes", () => {
  for (const size of sizes) {
    const s = defaultSettings(size);
    expect(s.phones).toBe(false);
    expect(s.boxes).toBe(size.id === "chinese-vertical");
    expect(s.spacing / 0.05).toBeCloseTo(Math.round(s.spacing / 0.05));
  }
});
