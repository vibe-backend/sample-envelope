import { expect, test } from "vitest";
import { render } from "@testing-library/react";
import { defaultSettings } from "../lib/storage";
import { sizes } from "../lib/sizes";
import { emptyDraft } from "../lib/validation";
import { t } from "../i18n/zh-Hant";
import { Envelope, digitRuns } from "./Envelope";
import { verticalAddressArea } from "../lib/layout";

test("only one- and two-digit runs combine in vertical text", () => {
  const text = "路1號12樓 123 2123 4567 12345 123456";
  const { container, unmount } = render(
    <div style={{ writingMode: "vertical-rl" }}>{digitRuns(text)}</div>,
  );

  expect(container.textContent).toBe(text);
  const runs = [...container.querySelectorAll("span")];
  expect(runs.map((run) => run.textContent)).toEqual([
    "1", "12", "123", "2123", "4567", "12345", "123456",
  ]);
  for (const run of runs) {
    const combines = run.textContent!.length <= 2;
    expect(run.style.textCombineUpright).toBe(combines ? "all" : "");
    expect(run.style.textOrientation).toBe(combines ? "" : "upright");
  }
  unmount();
});

test("Latin letters stay upright in mixed addresses", () => {
  const {container, unmount} = render(<div>{digitRuns("4樓A室12號ABC")}</div>);
  expect([...container.querySelectorAll("span")].map(el => [el.textContent, el.style.textOrientation, el.style.textCombineUpright])).toEqual([["4","","all"], ["A","upright",""], ["12","","all"], ["ABC","upright",""]]);
  unmount();
});

test("empty sender and phone blocks are hidden", () => {
  const {container, unmount} = render(<Envelope draft={emptyDraft} settings={{...defaultSettings(sizes[0]), phones:true}} />);
  expect(container.querySelector(".sender-block")).toBeNull();
  expect(container.querySelector(".phone")).toBeNull();
  unmount();
});

test.each(["", "   "])("empty recipient name %j hides title and opening", (recipientName) => {
  const {container, rerender, unmount} = render(<Envelope draft={{...emptyDraft, recipientName, recipientTitle: "先生", opening: "啟"}} settings={defaultSettings(sizes[0])} />);
  expect(container.querySelector('[data-block="name"]')).toBeNull();
  expect(container.querySelector(".salutation")).toBeNull();
  rerender(<Envelope draft={{...emptyDraft, recipientName: "陳大文", recipientTitle: "先生", opening: "啟"}} settings={defaultSettings(sizes[0])} />);
  expect(container.querySelector(".recipient-name")?.textContent).toBe("陳大文先生\u3000啟");
  unmount();
});

test("vertical recipient and sender have separate address and phone columns", () => {
  const draft = {...emptyDraft, ...t.sampleData};
  const {container, unmount} = render(<Envelope draft={draft} settings={defaultSettings(sizes[0], draft)} />);
  expect(container.querySelector(".postcode-boxes")).toBeNull();
  const recipient = container.querySelector(".recipient-address")!;
  expect((recipient as HTMLElement).style.height).toBe(`${verticalAddressArea(sizes[0].heightMm).heightMm}mm`);
  expect((recipient as HTMLElement).style.top).toBe("8mm");
  expect(recipient.querySelector(".postcode-space")?.textContent).toBe(" ");
  expect(recipient.children.length).toBe(2);
  expect(recipient.children[0].textContent).toBe(`${t.addressLabel}106 ${draft.recipientAddress}`);
  expect(recipient.children[1].textContent).toBe(`${t.phoneLabel}${draft.recipientPhone}`);
  const sender = container.querySelector(".sender-block")!;
  expect([...sender.children].map(el => el.className)).toEqual(["sender-name-column", "sender-address-column", "sender-phone-column"]);
  expect(sender.children[1].textContent).toBe(`300 ${draft.senderAddress}`);
  expect(sender.children[2].textContent).toBe(`${t.phoneLabel}${draft.senderPhone}`);
  const digits = recipient.querySelector(".phone span span") as HTMLElement;
  expect(digits.textContent).toBe(draft.recipientPhone);
  expect(digits.style.textOrientation).toBe("upright");
  expect(digits.style.fontSize).toBe("");
  unmount();
});

test("vertical options hide address label and enable boxes for both postcodes", () => {
  const draft = {...emptyDraft, ...t.sampleData};
  const {container, unmount} = render(<Envelope draft={draft} settings={{...defaultSettings(sizes[0], draft), boxes: true, showAddressLabel: false}} />);
  expect(container.querySelectorAll(".postcode-boxes")).toHaveLength(2);
  expect(container.querySelector(".recipient-address")!.textContent).not.toContain(t.addressLabel);
  unmount();
});
