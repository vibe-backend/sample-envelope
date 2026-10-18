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
  const area = verticalAddressArea(252, true);
  const em = settings.addressSize * 25.4 / 72;
  expect(settings.addressSize).toBe(20);
  expect(draft.recipientPostcode).toBe("106409");
  expect(area.topMm).toBe(65);
  expect(area.heightMm).toBe(159);
  expect(area.topMm + area.heightMm).toBe(224);
  expect(area.topMm).toBeGreaterThan(35 + 9 + 1 + 5.5 * 25.4 / 72);
  const width = (address: string) => (columns(`${t.addressLabel}${address}`, area.heightMm, em) + columns(`${t.phoneLabel}${draft.recipientPhone}`, area.heightMm, em)) * em * 1.3;
  expect(columns(`${t.addressLabel}${draft.recipientAddress}`, area.heightMm, em)).toBe(1);
  // Corridor right of the 33mm centred frame with 15mm right margin and 2mm gap.
  const corridorMm = 120 - 15 - (120 / 2 + 16.5 + 2);
  expect(width(draft.recipientAddress)).toBeLessThan(corridorMm);
  expect(width(draft.recipientAddress.repeat(4))).toBeGreaterThan(corridorMm);
});

test("16pt sample sender wraps above the postcode and clear of the frame", () => {
  const draft = { ...emptyDraft, ...t.sampleData };
  const settings = defaultSettings(sizes[0], draft);
  const area = verticalSenderArea(252);
  const em = settings.senderSize * 25.4 / 72;
  expect(settings.senderSize).toBe(16);
  expect(draft.senderName).toBe("炁衡物聯科技");
  expect(draft.senderAddress).toBe("臺中市霧峰區本鄉里民生路74巷7號二樓");
  expect(draft.senderPhone).toBe("0928-619-378");
  expect(area.lineHeight).toBe(1.05);
  expect(area.leftMm).toBe(6);
  expect(area.leftMm + area.widthMm).toBe(42);
  expect(area.topMm).toBeCloseTo(22 + 230 * 0.40, 5);
  expect(area.topMm + area.heightMm).toBeLessThanOrEqual(252 - 14 - 6);
  expect(columns(draft.senderName, area.heightMm, em)).toBe(1);
  expect(columns(`${t.phoneLabel}${draft.senderPhone}`, area.heightMm, em)).toBe(1);
  // Single-column address (nowrap); address + name + phone + company margin fit the block.
  expect(columns(draft.senderAddress, area.heightMm, em * area.lineHeight)).toBe(1);
  expect(area.widthMm).toBe(36);
  expect(area.heightMm).toBeGreaterThan(0);
});
