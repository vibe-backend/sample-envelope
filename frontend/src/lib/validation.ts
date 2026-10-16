import { t } from "../i18n/zh-Hant";
export const emptyDraft = {
  recipientName: "",
  recipientTitle: "先生",
  customTitle: "",
  recipientPostcode: "",
  recipientAddress: "",
  recipientPhone: "",
  opening: "啟",
  senderName: "",
  senderPostcode: "",
  senderAddress: "",
  senderPhone: "",
};
export type Draft = typeof emptyDraft;
export function validate(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  for (const key of [
    "recipientName",
    "recipientAddress",
  ] as const)
    if (!draft[key].trim()) errors[key] = t.requiredError;
  if (draft.recipientTitle === t.titles[6] && !draft.customTitle.trim())
    errors.customTitle = t.requiredError;
  for (const key of ["recipientPostcode", "senderPostcode"] as const)
    if (draft[key] && !/^\d{3,6}$/.test(draft[key]))
      errors[key] = t.postcodeError;
  for (const key of ["recipientPhone", "senderPhone"] as const)
    if (
      draft[key] &&
      (!/^[\d +()-]+$/.test(draft[key]) || !/\d/.test(draft[key]))
    )
      errors[key] = t.phoneError;
  return errors;
}
