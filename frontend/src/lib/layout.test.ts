import { expect, test } from "vitest";
import { verticalAddressArea, verticalSenderArea } from "./layout";
import { isOverflowing } from "./overflow";
import { defaultSettings } from "./storage";
import { sizes, orientedSize } from "./sizes";
import { mmToPx } from "./units";
import { t } from "../i18n/zh-Hant";
import { emptyDraft } from "./validation";

test("default Chinese vertical sender fits three 13pt columns inside the envelope", () => {
  const draft = { ...emptyDraft, ...t.sampleData };
  const settings = defaultSettings(sizes[0], draft);
  const size = orientedSize(settings, settings.orientation);
  const area = verticalSenderArea(size.widthMm, size.heightMm);
  expect(settings.senderSize).toBe(13);
  expect(area.gapMm).toBe(0);
  expect(area.lineHeight).toBe(1.3);
  expect(area.leftMm).toBeGreaterThanOrEqual(5);
  expect(area.leftMm / size.widthMm).toBeCloseTo(0.05);
  expect((area.leftMm + area.widthMm) / size.widthMm).toBeCloseTo(0.29);
  expect(area.topMm / size.heightMm).toBeCloseTo(0.40);
  expect((area.topMm + area.heightMm) / size.heightMm).toBeCloseTo(0.87);

  // Sender postcode boxes start at 89% of the envelope height.
  expect(area.topMm + area.heightMm).toBeLessThan(size.heightMm * 0.89);

  const columns = [draft.senderName, draft.senderAddress, `${t.phoneLabel}${draft.senderPhone}`];
  const emPx = settings.senderSize * 96 / 72;
  const overflows = (texts: string[]) => isOverflowing({
    clientWidth: mmToPx(area.widthMm),
    clientHeight: mmToPx(area.heightMm),
    scrollWidth: texts.length * emPx * area.lineHeight + mmToPx((texts.length - 1) * area.gapMm),
    // Conservative: even short digit runs consume one em per digit.
    scrollHeight: Math.max(...texts.map(text => [...text].length)) * emPx,
  });
  expect(overflows(columns)).toBe(false);
  expect(overflows([columns[0], draft.senderAddress.repeat(3), columns[2]])).toBe(true);
});

test("default Chinese vertical sample fits the address area, but a long address overflows", () => {
  const draft = { ...emptyDraft, ...t.sampleData };
  const settings = defaultSettings(sizes[0], draft);
  const size = orientedSize(settings, settings.orientation);
  const area = verticalAddressArea(size.heightMm, true);
  expect(area.topMm).toBe(44);
  expect(area.topMm + area.heightMm).toBeCloseTo(size.heightMm * 0.7);

  // Conservative vertical extent: one em per character, even for short digit
  // runs that the renderer combines into a single cell. No DOM metrics in jsdom.
  const overflows = (address: string) => isOverflowing({
    clientWidth: 100,
    scrollWidth: 100,
    clientHeight: mmToPx(area.heightMm),
    scrollHeight: [...`${t.addressLabel}${address}`].length * settings.addressSize * 96 / 72,
  });
  expect(overflows(draft.recipientAddress)).toBe(false);
  expect(overflows(draft.recipientAddress.repeat(3))).toBe(true);
});
