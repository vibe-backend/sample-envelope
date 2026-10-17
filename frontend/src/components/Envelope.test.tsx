import { expect, test, vi } from "vitest";
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
  const {container, unmount} = render(<div className="preview-panel" style={{textAlign: "center"}}><Envelope draft={draft} settings={defaultSettings(sizes[0], draft)} /></div>);
  try {
    expect(container.querySelector(".envelope.taiwanese.vertical")).not.toBeNull();
    const name = container.querySelector<HTMLElement>(".recipient-name")!;
    const nameStyle = getComputedStyle(name);
    expect(nameStyle.display).toBe("flex");
    expect(nameStyle.flexDirection).toBe("row");
    expect(nameStyle.alignItems).toBe("center");
    expect(nameStyle.justifyContent).toBe("flex-start");
    expect(nameStyle.top).toMatch(/^calc\(18% \+ /);
    expect(parseFloat(nameStyle.top.split(" + ")[1])).toBeCloseTo(3.25 * 96 / 25.4);
    expect(nameStyle.height).toMatch(/^calc\(67% - /);
    expect(parseFloat(nameStyle.height.split(" - ")[1])).toBeCloseTo(6.5 * 96 / 25.4);
    for (const selector of [".recipient-title", ".salutation"]) {
      const suffix = getComputedStyle(name.querySelector(selector)!);
      expect(suffix.position).not.toBe("absolute");
      expect(parseFloat(suffix.fontSize)).toBeCloseTo(28 * 96 / 72 * 0.8, 3);
      expect(parseFloat(suffix.marginInlineStart)).toBeCloseTo(28 * 96 / 72 * 0.8 * 0.5, 3);
      expect(suffix.flexShrink).toBe("0");
      expect(suffix.alignSelf).toBe("center");
      expect(suffix.lineHeight).toBe("1");
    }
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
      expect(blockStyle.textAlign).toBe("start");
      expect(parseFloat(blockStyle.gap)).toBe(0);
      expect(blockStyle.lineHeight).toBe("1.3");
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

test("printed postcode rows have compact physical geometry and anchored, centred captions", () => {
  const style = document.createElement("style");
  style.textContent = readFileSync("src/index.css", "utf8").split("/* Taiwanese blank-paper template:")[1]
    .replace(/^[\s\S]*?\*\//, "");
  document.head.append(style);
  const {container, unmount} = render(<Envelope draft={emptyDraft} settings={defaultSettings(sizes[0])} />);
  const mm = (value: string) => parseFloat(value) * (value.endsWith("px") ? 25.4 / 96 : 1);
  try {
    for (const kind of ["recipient", "sender"]) {
      const block = container.querySelector(`.${kind}-postcode-print`)!;
      const blockStyle = getComputedStyle(block);
      expect(blockStyle.width).toBe("max-content");
      if (kind === "recipient") expect(mm(blockStyle.top)).toBeCloseTo(7, 3);
      else expect(mm(blockStyle.bottom)).toBeCloseTo(15, 3);
      expect(mm(kind === "recipient" ? blockStyle.right : blockStyle.left)).toBeCloseTo(kind === "recipient" ? 8 : 9, 3);
      const row = block.querySelector(".postal-row")!;
      expect([...row.children].map(el => el.className)).toEqual(["postal-group", "postal-dash", "postal-group"]);
      expect(parseFloat(getComputedStyle(row).gap)).toBe(0);
      expect(getComputedStyle(row).writingMode).toBe("horizontal-tb");
      for (const group of row.querySelectorAll(".postal-group")) {
        const groupStyle = getComputedStyle(group);
        expect(mm(groupStyle.gap)).toBe(0);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          expect(mm(groupStyle[`border${side}Width`])).toBeCloseTo(0.25, 3);
          expect(groupStyle[`border${side}Style`]).toBe("solid");
          expect(groupStyle[`border${side}Color`]).toBe("rgb(200, 16, 46)");
        }
        for (const [index, cell] of [...group.children].entries()) {
          const css = getComputedStyle(cell);
          expect(mm(css.marginLeft || "0")).toBe(0);
          expect(mm(css.marginRight || "0")).toBe(0);
          expect(mm(css.borderRightWidth)).toBeCloseTo(index === group.children.length - 1 ? 0 : 0.25, 3);
          if (index < group.children.length - 1) {
            expect(css.borderRightStyle).toBe("solid");
            expect(css.borderRightColor).toBe("rgb(200, 16, 46)");
          }
          for (const side of ["Top", "Bottom", "Left"] as const) {
            expect(mm(css[`border${side}Width`])).toBe(0);
          }
        }
      }
      for (const cell of row.querySelectorAll(".postal-cell")) {
        const css = getComputedStyle(cell);
        expect(mm(css.width)).toBeCloseTo(kind === "sender" ? 6 : 8, 3);
        expect(mm(css.height)).toBeCloseTo(kind === "sender" ? 6.5 : 9, 3);
        expect(mm(css.fontSize)).toBeCloseTo(kind === "sender" ? 4.5 : 6.3, 3);
        expect(css.lineHeight).toBe("1");
        expect(css.justifyContent).toBe("center");
        expect(css.alignItems).toBe("center");
        expect(css.boxSizing).toBe("border-box");
        expect(css.flexShrink).toBe("0");
      }
      const dash = getComputedStyle(row.querySelector(".postal-dash")!);
      expect(mm(dash.width)).toBeCloseTo(kind === "sender" ? 2 : 3, 3);
      expect(mm(dash.marginLeft)).toBeCloseTo(0.5, 3);
      expect(mm(dash.marginRight)).toBeCloseTo(0.5, 3);
      expect(mm(dash.borderTopWidth)).toBeCloseTo(0.25, 3);
      expect(dash.borderTopColor).toBe("rgb(200, 16, 46)");
      expect(getComputedStyle(block.querySelector(".postal-caption")!).textAlign).toBe("center");
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
  expect(container.querySelector(".recipient-name")?.textContent).toBe("陳大文先生啟");
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
  expect(container.querySelector(".stamp-box")?.textContent).toBe("郵票正貼");
  expect([...container.querySelectorAll(".stamp-box span")].map(column => column.textContent)).toEqual(["郵票", "正貼"]);
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


test("sample sender postcode fills only the first three boxes and phone hyphens use accessible vertical bars", () => {
  const draft = {...emptyDraft, ...t.sampleData};
  const {container, unmount} = render(<Envelope draft={draft} settings={defaultSettings(sizes[0], draft)} />);
  expect(container.querySelector(".sender-name-column")?.textContent).toBe("炁衡物聯科技");
  expect(container.querySelector(".sender-address-column")?.textContent).toBe("臺中市霧峰區本鄉里民生路74巷7號二樓");
  expect([...container.querySelectorAll(".sender-postcode-print .postal-cell")].map(cell => cell.textContent)).toEqual(["4", "1", "3", "", "", ""]);
  const phone = container.querySelector(".sender-phone-column .phone")!;
  expect(phone.textContent).toBe("0928-619-378");
  const segments = [...phone.querySelector("span")!.children] as HTMLElement[];
  expect(segments.map(span => span.textContent)).toEqual(["0928", "-", "619", "-", "378"]);
  for (const segment of segments) {
    expect(segment.style.textOrientation).toBe(segment.textContent === "-" ? "" : "upright");
    if (segment.textContent === "-") {
      expect(segment.classList.contains("v-dash")).toBe(true);
      expect(segment.querySelector(".sr-only")?.textContent).toBe("-");
    }
    expect(segment.style.textCombineUpright).toBe("");
    expect(segment.style.fontSize).toBe("");
  }
  unmount();
});


test.each(["vertical-rl", "horizontal-tb"] as const)("recipient flow and optional elements in %s", writingMode => {
  const draft = {...emptyDraft, recipientName: "陳大文", recipientTitle: "先生", opening: "啟"};
  const settings = {...defaultSettings(sizes[0]), writingMode};
  const {container, rerender, unmount} = render(<Envelope draft={draft} settings={settings} />);
  expect([...container.querySelector(".recipient-name")!.children].map(el => el.className))
    .toEqual(["recipient-name-text", "recipient-title", "salutation"]);
  for (const [showTitle, showSalutation, text] of [[false, true, "陳大文啟"], [true, false, "陳大文先生"], [false, false, "陳大文"]] as const) {
    rerender(<Envelope draft={draft} settings={{...settings, showTitle, showSalutation}} />);
    expect(container.querySelector(".recipient-name")!.textContent).toBe(text);
    expect(container.querySelector(".recipient-title") === null).toBe(!showTitle);
    expect(container.querySelector(".salutation") === null).toBe(!showSalutation);
  }
  unmount();
});

test("frame fit participates in overflow warnings, including moved content", () => {
  const rect = (left: number, top: number, right: number, bottom: number) => ({left, top, right, bottom, width: right-left, height: bottom-top, x:left, y:top, toJSON: () => ({})});
  let moved = false;
  const bounds = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("envelope")) return rect(0, 0, 105, 220);
    if (this.classList.contains("recipient-frame")) return rect(31.5, 39.6, 60.9, 187);
    if (this.classList.contains("recipient-name")) return moved ? rect(35, 43, 57, 190) : rect(35, 43, 57, 183);
    return rect(0, 0, 0, 0);
  });
  const onOverflow = vi.fn();
  const draft = {...emptyDraft, ...t.sampleData};
  const settings = defaultSettings(sizes[0], draft);
  const {rerender, unmount} = render(<Envelope draft={draft} settings={settings} onOverflow={onOverflow} />);
  try {
    expect(onOverflow).toHaveBeenLastCalledWith([]);
    moved = true;
    rerender(<Envelope draft={draft} settings={{...settings, nameY: 7}} onOverflow={onOverflow} />);
    expect(onOverflow).toHaveBeenLastCalledWith(["name"]);
  } finally {
    unmount();
    bounds.mockRestore();
  }
});

test("outer border is an inset printable boundary available on any preset", () => {
  const css = readFileSync("src/index.css", "utf8");
  const rule = css.match(/\.outer-border\s*\{([^}]+)\}/)![1];
  expect(rule).toContain("inset: 0");
  expect(rule).toContain("box-sizing: border-box");
  expect(rule).toContain("border: 0.2mm dashed #888");
  expect(rule).toContain("print-color-adjust: exact");
  expect(rule).not.toContain("display: none");
  expect(css).toContain(".envelope.has-outer-border { border: none; }");
  const settings = defaultSettings(sizes[0]);
  const {container, rerender} = render(<Envelope draft={emptyDraft} settings={settings} />);
  expect(container.querySelector(".outer-border")).not.toBeNull();
  expect(container.querySelector(".outer-border")!.className).not.toMatch(/hidden/);
  rerender(<Envelope draft={emptyDraft} settings={{...settings, printOuterBorder: false}} />);
  expect(container.querySelector(".outer-border")).toBeNull();
  const dl = defaultSettings(sizes[1]);
  expect(dl.printOuterBorder).toBe(false);
  rerender(<Envelope draft={emptyDraft} settings={{...dl, printOuterBorder: true}} />);
  expect(container.querySelector(".outer-border")).not.toBeNull();
});

test("stamp retains its double border at 22mm and columns enable wrapping", () => {
  const css = readFileSync("src/index.css", "utf8");
  expect(css.match(/\.stamp-box\s*\{([^}]+)\}/)![1]).toContain("width: 22mm; height: 22mm");
  expect(css).toMatch(/\.stamp-box > div\s*\{[^}]*border:/);
  expect(css).toMatch(/\.taiwanese \.sender-phone-column\s*\{[^}]*height: 100%;[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/);
});
