import { expect, test } from "vitest";
import { verticalAddressArea, verticalSenderArea } from "./layout";
import { defaultSettings } from "./storage";
import { sizes } from "./sizes";
import { t } from "../i18n/zh-Hant";
import { emptyDraft } from "./validation";

// Conservative: one em per character, even for combined short digit runs.
const columns = (text: string, height: number, em: number) => Math.ceil([...text].length / Math.floor(height / em));

test("20pt sample recipient address fits one column with a phone column", () => {
  const draft = { ...emptyDraft, ...t.sampleData };
  const settings = defaultSettings(sizes[0], draft);
  const area = verticalAddressArea(220, true);
  const em = settings.addressSize * 25.4 / 72;
  expect(settings.addressSize).toBe(20);
  expect(draft.recipientPostcode).toBe("106409");
  expect(area.topMm).toBeCloseTo(220 * 0.13);
  expect(area.topMm + area.heightMm).toBeCloseTo(220 * 0.92);
  expect(area.topMm).toBeGreaterThan(7 + 9 + 1 + 5.5 * 25.4 / 72);
  const width = (address: string) => (columns(`${t.addressLabel}${address}`, area.heightMm, em) + columns(`${t.phoneLabel}${draft.recipientPhone}`, area.heightMm, em)) * em * 1.3;
  expect(columns(`${t.addressLabel}${draft.recipientAddress}`, area.heightMm, em)).toBe(1);
  expect(width(draft.recipientAddress)).toBeLessThan(105 * (0.91 - 0.58));
  expect(width(draft.recipientAddress.repeat(4))).toBeGreaterThan(105 * 0.33);
});

test("16pt sample sender wraps above the postcode and clear of the frame", () => {
  const draft = { ...emptyDraft, ...t.sampleData };
  const settings = defaultSettings(sizes[0], draft);
  const area = verticalSenderArea(105, 220);
  const em = settings.senderSize * 25.4 / 72;
  expect(settings.senderSize).toBe(16);
  expect(draft.senderName).toBe("炁衡物聯科技");
  expect(draft.senderAddress).toBe("臺中市霧峰區本鄉里民生路74巷7號二樓");
  expect(draft.senderPhone).toBe("0928-619-378");
  expect(area.lineHeight).toBe(1.3);
  expect(area.leftMm / 105).toBeCloseTo(0.04);
  expect((area.leftMm + area.widthMm) / 105).toBeCloseTo(0.29);
  expect(area.topMm / 220).toBeCloseTo(0.4);
  expect(area.topMm + area.heightMm).toBeLessThan(220 - 15 - 6.5);
  expect(columns(draft.senderName, area.heightMm, em)).toBe(1);
  expect(columns(`${t.phoneLabel}${draft.senderPhone}`, area.heightMm, em)).toBe(1);
  // Independent name and phone use 1em each; address keeps 1.3em line pitch.
  const width = (address: string) => (2 + columns(address, area.heightMm, em) * area.lineHeight) * em;
  expect(width(draft.senderAddress)).toBeLessThan(area.widthMm);
  expect(width(draft.senderAddress.repeat(3))).toBeGreaterThan(area.widthMm);
});
