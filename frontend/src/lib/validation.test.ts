import { expect, test } from "vitest";
import { emptyDraft, validate } from "./validation";
import { t } from "../i18n/zh-Hant";
const valid = { ...emptyDraft, ...t.sampleData };
test("requires recipient name and address; sender is optional", () => {
  expect(Object.keys(validate(emptyDraft))).toEqual([
    "recipientName",
    "recipientAddress",
  ]);
  expect(validate(valid)).toEqual({});
});
test("optional postcodes are 3–6 digits", () => {
  for (const v of ["12", "1234567", "abc"])
    expect(
      validate({ ...valid, senderPostcode: v }).senderPostcode,
    ).toBeTruthy();
  for (const v of ["", "123", "123456"])
    expect(
      validate({ ...valid, senderPostcode: v }).senderPostcode,
    ).toBeUndefined();
});
test("phone punctuation and digits only", () => {
  expect(validate({ ...valid, senderPhone: "0928-619-378" })).toEqual({});
  expect(validate({ ...valid, recipientPhone: "+(852) 2123-4567" })).toEqual(
    {},
  );
  for (const v of ["abc", "---"])
    expect(
      validate({ ...valid, recipientPhone: v }).recipientPhone,
    ).toBeTruthy();
});
test("custom title is required when selected", () => {
  expect(
    validate({ ...valid, recipientTitle: t.titles[6] }).customTitle,
  ).toBeTruthy();
});
