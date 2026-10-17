import { expect, test } from "vitest";
import { render } from "@testing-library/react";
import { defaultSettings } from "../lib/storage";
import { sizes } from "../lib/sizes";
import { emptyDraft } from "../lib/validation";
import { t } from "../i18n/zh-Hant";
import { Envelope, digitRuns, postcodeGroups } from "./Envelope";
import { verticalAddressArea } from "../lib/layout";
import { readFileSync } from "node:fs";

test("Chinese vertical columns share a container and start at the same top", () => {
  // Apply the actual envelope rules without Tailwind's nested CSS or imports.
  const css = readFileSync("src/index.css", "utf8");
  const style = document.createElement("style");
  style.textContent = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => /(?:^|,)\s*\.(?:vertical|taiwanese|envelope)(?:\s|\.)/.test(selector))
    .map(([rule]) => rule).join("\n");
  document.head.append(style);
  const draft = {...emptyDraft, ...t.sampleData};
  const {container, unmount} = render(<Envelope draft={draft} settings={defaultSettings(sizes[0], draft)} />);
  try {
    expect(container.querySelector(".envelope.taiwanese.vertical")).not.toBeNull();
    for (const [blockSelector, columnSelectors] of [
      [".recipient-address", [".recipient-address-column", ".address-phone"]],
      [".sender-block", [".sender-name-column", ".sender-address-column", ".sender-phone-column"]],
    ] as const) {
      const block = container.querySelector<HTMLElement>(blockSelector)!;
      const blockStyle = getComputedStyle(block);
      expect(blockStyle.display).toBe("flex");
      expect(blockStyle.flexDirection).toBe("column");
      expect(blockStyle.alignItems).toBe("flex-start");
      expect(blockStyle.justifyContent).toBe("flex-start");
      expect(blockStyle.gap).toBe(blockSelector === ".sender-block" ? "1.5mm" : "1mm");
      for (const selector of columnSelectors) {
        const column = block.querySelector<HTMLElement>(selector)!;
        expect(column.parentElement).toBe(block);
        const columnStyle = getComputedStyle(column);
        expect(columnStyle.top).toBe("auto");
        expect(columnStyle.marginTop).toBe("0px");
        expect(columnStyle.paddingTop).toBe("0px");
        expect(columnStyle.fontSize).toBe(getComputedStyle(block.children[0]).fontSize);
      }
    }
  } finally {
    unmount();
    style.remove();
  }
});

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
  const {container, unmount} = render(<Envelope draft={draft} settings={{...defaultSettings(sizes[0], draft), presetId: "custom"}} />);
  expect(container.querySelector(".postcode-boxes")).toBeNull();
  const recipient = container.querySelector(".recipient-address")!;
  expect((recipient as HTMLElement).style.height).toBe(`${verticalAddressArea(sizes[0].heightMm).heightMm}mm`);
  expect((recipient as HTMLElement).style.top).toBe("8mm");
  expect(recipient.querySelector(".postcode-space")?.textContent).toBe(" ");
  expect(recipient.children.length).toBe(2);
  expect(recipient.children[0].textContent).toBe(`${t.addressLabel}${draft.recipientPostcode} ${draft.recipientAddress}`);
  expect(recipient.children[1].textContent).toBe(`${t.phoneLabel}${draft.recipientPhone}`);
  const sender = container.querySelector(".sender-block")!;
  expect([...sender.children].map(el => el.className)).toEqual(["sender-name-column", "sender-address-column", "sender-phone-column"]);
  expect(sender.children[1].textContent).toBe(`${draft.senderPostcode} ${draft.senderAddress}`);
  expect(sender.children[2].textContent).toBe(`${t.phoneLabel}${draft.senderPhone}`);
  const digits = recipient.querySelector(".phone span span") as HTMLElement;
  expect(digits.textContent).toBe(draft.recipientPhone);
  expect(digits.style.textOrientation).toBe("upright");
  expect(digits.style.fontSize).toBe("");
  unmount();
});

test.each([false, true])("printed postcodes suppress inline codes only when enabled: %s", (printPostcodeBoxes) => {
  const draft = {...emptyDraft, ...t.sampleData};
  const {container, unmount} = render(<Envelope draft={draft} settings={{...defaultSettings(sizes[0], draft), printPostcodeBoxes}} />);
  expect(container.querySelectorAll(".printed-postcode")).toHaveLength(printPostcodeBoxes ? 2 : 0);
  for (const kind of ["recipient", "sender"] as const) {
    const column = container.querySelector(`.${kind}-address-column`)!;
    expect(column.textContent?.includes(draft[`${kind}Postcode`])).toBe(!printPostcodeBoxes);
    expect(column.querySelector(".address-postcode") === null).toBe(printPostcodeBoxes);
  }
  expect(container.querySelector(".sender-name-column")?.textContent).toBe(draft.senderName);
  unmount();
});

test.each([
  ["106409", [["1", "0", "6"], ["4", "0", "9"]]],
  ["10640", [["1", "0", "6"], ["4", "0", ""]]],
  ["106", [["1", "0", "6"], ["", "", ""]]],
])("postcode groups and DOM cells: %s", (code, groups) => {
  expect(postcodeGroups(code)).toEqual(groups);
  const {container, unmount} = render(<Envelope draft={{...emptyDraft, recipientPostcode: code}} settings={defaultSettings(sizes[0])} />);
  expect([...container.querySelectorAll(".recipient-postcode-print .postal-group")].map(group => [...group.querySelectorAll(".postal-cell")].map(cell => cell.textContent))).toEqual(groups);
  unmount();
});

test("preprinted marks are present, printable, and independently optional", () => {
  const settings = defaultSettings(sizes[0]);
  const {container, rerender, unmount} = render(<Envelope draft={emptyDraft} settings={settings} />);
  const marks = container.querySelectorAll(".preprinted");
  expect(marks).toHaveLength(5);
  expect(container.querySelector(".stamp-box")?.textContent).toBe(t.stampColumns.join(""));
  expect(container.querySelector(".postal-notice")?.textContent).toBe(t.postalNotice);
  for (const mark of marks) expect(mark.closest('.hidden, .print\\:hidden, .controls, .hint')).toBeNull();
  for (const [toggle, selector] of [["printStampBox", ".stamp-box"], ["printRecipientFrame", ".recipient-frame"], ["printNotice", ".postal-notice"]] as const) {
    rerender(<Envelope draft={emptyDraft} settings={{...settings, [toggle]: false}} />);
    expect(container.querySelector(selector)).toBeNull();
  }
  rerender(<Envelope draft={emptyDraft} settings={defaultSettings(sizes[1])} />);
  expect(container.querySelector(".preprinted")).toBeNull();
  unmount();
});
