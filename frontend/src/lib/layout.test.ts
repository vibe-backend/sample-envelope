import { expect, test } from "vitest";
import { verticalAddressArea } from "./layout";
import { isOverflowing } from "./overflow";
import { defaultSettings } from "./storage";
import { sizes, orientedSize } from "./sizes";
import { mmToPx } from "./units";
import { t } from "../i18n/zh-Hant";
import { emptyDraft } from "./validation";

test("default Chinese vertical sample fits the address area, but a long address overflows", () => {
  const draft = { ...emptyDraft, ...t.sampleData };
  const settings = defaultSettings(sizes[0], draft);
  const size = orientedSize(settings, settings.orientation);
  const area = verticalAddressArea(size.heightMm);
  expect(area.topMm).toBe(8);
  expect(area.topMm + area.heightMm).toBeCloseTo(size.heightMm * 0.68);

  // Conservative vertical extent: one em per character, even for short digit
  // runs that the renderer combines into a single cell. No DOM metrics in jsdom.
  const overflows = (address: string) => isOverflowing({
    clientWidth: 100,
    scrollWidth: 100,
    clientHeight: mmToPx(area.heightMm),
    scrollHeight: [...`${t.addressLabel}${draft.recipientPostcode} ${address}`].length * settings.addressSize * 96 / 72,
  });
  expect(overflows(draft.recipientAddress)).toBe(false);
  expect(overflows(draft.recipientAddress.repeat(3))).toBe(true);
});
