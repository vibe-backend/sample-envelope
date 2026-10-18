import { expect, test, vi } from "vitest";
import { render } from "@testing-library/react";
import { defaultSettings } from "../lib/storage";
import { sizes } from "../lib/sizes";
import { emptyDraft } from "../lib/validation";
import { t } from "../i18n/zh-Hant";
import { Envelope, digitRuns, phoneGroupParts, postcodeGroups } from "./Envelope";
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
    expect(css.match(/\.recipient-frame\s*\{([^}]+)\}/)![1]).toContain("left: calc(50% - 16.5mm); top: 59mm; width: 33mm; height: 159mm");
    expect(container.querySelector(".envelope.has-recipient-frame")).not.toBeNull();
    const nameRule = css.match(/\.taiwanese\.has-recipient-frame \.recipient-name\s*\{([^}]+)\}/)![1];
    expect(nameRule).toMatch(/left:\s*calc\(50% - 16\.5mm \+ 3\.25mm\)/);
    expect(nameRule).toMatch(/top:\s*calc\(59mm \+ 3\.25mm \+ 10mm\)/);
    expect(nameRule).toMatch(/width:\s*calc\(33mm - 6\.5mm\)/);
    expect(nameRule).toMatch(/height:\s*calc\(159mm - 6\.5mm - 10mm\)/);
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
      [".sender-block", [".sender-address-column", ".sender-col-gap", ".sender-name-column", ".sender-phone-column"]],
    ] as const) {
      const block = container.querySelector<HTMLElement>(blockSelector)!;
      const blockStyle = getComputedStyle(block);
      expect(blockStyle.display).toBe("flex");
      expect(blockStyle.flexDirection).toBe("column");
      expect(blockStyle.alignItems).toBe("flex-start");
      expect(blockStyle.justifyContent).toBe("flex-start");
      expect(blockStyle.textAlign).toBe("start");
      expect(parseFloat(blockStyle.gap) || 0).toBe(0);
      // Taiwanese sender uses layout lineHeight 1.05; other vertical blocks stay 1.3.
      if (blockSelector === ".sender-block") {
        expect(Number.parseFloat(blockStyle.lineHeight)).toBeCloseTo(1.05, 2);
      } else {
        expect(blockStyle.lineHeight).toBe("1.3");
      }
      const blockFont = getComputedStyle(block).fontSize;
      for (const selector of columnSelectors) {
        const column = block.querySelector<HTMLElement>(selector)!;
        expect(column.parentElement).toBe(block);
        if (selector === ".sender-col-gap") continue;
        const columnStyle = getComputedStyle(column);
        expect(columnStyle.top).toBe("auto");
        expect(columnStyle.marginTop).toBe("0px");
        expect(columnStyle.paddingTop).toBe("0px");
        if (selector === ".sender-name-column") {
          expect(parseFloat(columnStyle.fontSize)).toBeCloseTo(parseFloat(blockFont) * 1.25, 3);
        } else {
          expect(columnStyle.fontSize).toBe(blockFont);
        }
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
      expect(["fit-content", "max-content"]).toContain(blockStyle.width);
      if (kind === "recipient") expect(mm(blockStyle.top)).toBeCloseTo(35, 3);
      else expect(mm(blockStyle.bottom)).toBeCloseTo(14, 3);
      expect(mm(kind === "recipient" ? blockStyle.right : blockStyle.left)).toBeCloseTo(kind === "recipient" ? 7 : 6, 3);
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
      const rowStyle = getComputedStyle(row);
      if (!rowStyle.width.endsWith("%")) {
        expect(mm(rowStyle.width)).toBeCloseTo(kind === "recipient" ? 47 : 33, 3);
      }
      if (!rowStyle.height.endsWith("%")) {
        expect(mm(rowStyle.height)).toBeCloseTo(kind === "recipient" ? 9 : 6, 3);
      }
      for (const cell of row.querySelectorAll(".postal-cell")) {
        const css = getComputedStyle(cell);
        // jsdom often leaves percentage heights unresolved; row height is asserted above.
        if (!css.height.endsWith("%")) {
          expect(mm(css.height)).toBeCloseTo(kind === "recipient" ? 9 : 6, 3);
        } else {
          expect(css.height).toBe("100%");
        }
        expect(mm(css.fontSize)).toBeCloseTo(kind === "recipient" ? 5.6 : 4.2, 3);
        expect(css.lineHeight).toBe("1");
        expect(css.justifyContent).toBe("center");
        expect(css.alignItems).toBe("center");
        expect(css.boxSizing).toBe("border-box");
      }
      const dash = getComputedStyle(row.querySelector(".postal-dash")!);
      expect(mm(dash.width)).toBeCloseTo(kind === "sender" ? 2 : 3, 3);
      expect(mm(dash.marginLeft)).toBeCloseTo(0.5, 3);
      expect(mm(dash.marginRight)).toBeCloseTo(0.5, 3);
      expect(mm(dash.borderTopWidth)).toBeCloseTo(0.25, 3);
      expect(dash.borderTopColor).toBe("rgb(200, 16, 46)");
      const caption = block.querySelector(".postal-caption")!;
      const captionStyle = getComputedStyle(caption);
      expect(captionStyle.display).toBe("flex");
      expect(captionStyle.justifyContent).toBe("space-between");
      const captionText = kind === "recipient" ? t.recipientPostcodeCaption : t.senderPostcodeCaption;
      expect(caption.getAttribute("aria-label")).toBe(captionText);
      expect([...caption.querySelectorAll(":scope > span")].map(el => el.textContent).join("")).toBe(captionText);
      const captionWidth = captionStyle.width.endsWith("%") ? NaN : mm(captionStyle.width);
      const rowWidth = getComputedStyle(row).width.endsWith("%") ? NaN : mm(getComputedStyle(row).width);
      const measured = captionWidth || rowWidth;
      if (Number.isFinite(measured)) {
        expect(measured).toBeCloseTo(kind === "recipient" ? 47 : 33, 3);
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
  expect(container.querySelector(".recipient-name")?.textContent).toBe("陳大文先生啟");
  unmount();
});

test("vertical recipient and sender have separate address and phone columns", () => {
  const draft = {...emptyDraft, ...t.sampleData};
  const {container, unmount} = render(<Envelope draft={draft} settings={{...defaultSettings(sizes[0], draft), presetId: "custom"}} />);
  expect(container.querySelector(".postcode-boxes")).toBeNull();
  const recipient = container.querySelector(".recipient-address")!;
  expect((recipient as HTMLElement).style.height).toBe(`${verticalAddressArea(sizes[0].heightMm).heightMm}mm`);
  expect((recipient as HTMLElement).style.top).toBe(`${8 + 21}mm`);
  expect(recipient.querySelector(".postcode-space")?.textContent).toBe(" ");
  expect(recipient.children.length).toBe(2);
  expect(recipient.children[0].textContent).toBe(`${t.addressLabel}${draft.recipientPostcode} ${draft.recipientAddress}`);
  expect(recipient.children[1].textContent).toBe(`${t.phoneLabel}${draft.recipientPhone.replace(/\D/g, "")}`);
  const sender = container.querySelector(".sender-block")!;
  expect([...sender.children].map(el => el.className)).toEqual(["sender-address-column", "sender-name-column", "sender-phone-column"]);
  expect(sender.children[0].textContent).toBe(`${draft.senderPostcode} ${draft.senderAddress}`);
  expect(sender.children[1].textContent).toBe(draft.senderName);
  expect(sender.children[2].textContent).toBe(`${t.phoneLabel}${draft.senderPhone.replace(/\D/g, "")}`);
  // custom preset: no taiwanese spacer; chinese-vertical adds .sender-col-gap between address and name.
  const phone = recipient.querySelector(".phone") as HTMLElement;
  expect(phone.textContent).toBe(draft.recipientPhone.replace(/\D/g, ""));
  expect(phone.className).toContain("grouped");
  unmount();
});

test("showPhoneLabel hides 電話： on recipient and sender", () => {
  const draft = {...emptyDraft, ...t.sampleData};
  const settings = {...defaultSettings(sizes[0], draft), showPhoneLabel: false};
  const {container, unmount} = render(<Envelope draft={draft} settings={settings} />);
  // Grouped phones render as separate spans; textContent joins digits without hyphens.
  expect(container.querySelector(".address-phone")?.textContent).toBe(draft.recipientPhone.replace(/\D/g, ""));
  expect(container.querySelector(".sender-phone-column")?.textContent).toBe(draft.senderPhone.replace(/\D/g, ""));
  unmount();
});

test.each([false, true])("printPostcodeBoxes toggles borders+tips only; digits always in cells: %s", (printPostcodeBoxes) => {
  const draft = {...emptyDraft, ...t.sampleData};
  const {container, unmount} = render(<Envelope draft={draft} settings={{...defaultSettings(sizes[0], draft), printPostcodeBoxes}} />);
  expect(container.querySelectorAll(".printed-postcode")).toHaveLength(2);
  expect(container.querySelectorAll(".printed-postcode.with-boxes")).toHaveLength(printPostcodeBoxes ? 2 : 0);
  expect(container.querySelectorAll(".printed-postcode.digits-only")).toHaveLength(printPostcodeBoxes ? 0 : 2);
  expect([...container.querySelectorAll(".recipient-postcode-print .postal-cell")].map(cell => cell.textContent)).toEqual([..."106409"]);
  expect([...container.querySelectorAll(".sender-postcode-print .postal-cell")].map(cell => cell.textContent)).toEqual([..."413014"]);
  expect(container.querySelector(".recipient-postcode-print .postal-caption")?.textContent ?? null)
    .toBe(printPostcodeBoxes ? t.recipientPostcodeCaption : null);
  expect(container.querySelector(".sender-postcode-print .postal-caption")?.textContent ?? null)
    .toBe(printPostcodeBoxes ? t.senderPostcodeCaption : null);
  for (const kind of ["recipient", "sender"] as const) {
    const column = container.querySelector(`.${kind}-address-column`)!;
    expect(column.textContent?.includes(draft[`${kind}Postcode`])).toBe(false);
    expect(column.querySelector(".address-postcode")).toBeNull();
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
  expect(marks).toHaveLength(7);
  expect(container.querySelector(".top-pad-guide")).not.toBeNull();
  expect(container.querySelector(".stamp-box")?.textContent).toBe("郵票正貼");
  expect([...container.querySelectorAll(".stamp-box span")].map(column => column.textContent)).toEqual(["郵票", "正貼"]);
  expect(container.querySelector(".mail-check-title")?.textContent).toBe(t.mailCheckTitle);
  expect([...container.querySelectorAll(".mail-check-grid tr")].map(row => row.querySelector("td")!.textContent)).toEqual(t.mailCheckOptions);
  expect(container.querySelectorAll(".mail-check-box")).toHaveLength(t.mailCheckOptions.length);
  expect(container.querySelector(".postal-notice")?.textContent).toBe(t.postalNotice);
  for (const mark of marks) expect(mark.closest('.hidden, .print\\:hidden, .controls, .hint')).toBeNull();
  for (const [toggle, selector] of [["showTopPad", ".top-pad-guide"], ["printStampBox", ".stamp-box"], ["printMailCheck", ".mail-check"], ["printRecipientFrame", ".recipient-frame"], ["printNotice", ".postal-notice"]] as const) {
    rerender(<Envelope draft={emptyDraft} settings={{...settings, [toggle]: false}} />);
    expect(container.querySelector(selector)).toBeNull();
    if (toggle === "printRecipientFrame") expect(container.querySelector(".has-recipient-frame")).toBeNull();
  }
  rerender(<Envelope draft={emptyDraft} settings={settings} />);
  expect(container.querySelector(".has-recipient-frame")).not.toBeNull();
  rerender(<Envelope draft={emptyDraft} settings={defaultSettings(sizes[1])} />);
  expect(container.querySelector(".preprinted")).toBeNull();
  unmount();
});


test("phoneGroupParts normalizes both hyphenated and plain mobiles the same way", () => {
  expect(phoneGroupParts("0928-619-378", false)).toEqual(["0928619378"]);
  expect(phoneGroupParts("0912345678", false)).toEqual(["0912345678"]);
  expect(phoneGroupParts("0928-619-378", true)).toEqual(["0928", "619", "378"]);
  expect(phoneGroupParts("0912345678", true)).toEqual(["0912", "345", "678"]);
  expect(phoneGroupParts("0912-345-678", true)).toEqual(["0912", "345", "678"]);
});

test("sample sender and recipient phones share grouped digit style", () => {
  const draft = {...emptyDraft, ...t.sampleData};
  const settings = defaultSettings(sizes[0], draft);
  expect(settings.phoneGroups).toBe(true);
  const {container, rerender, unmount} = render(<Envelope draft={draft} settings={settings} />);
  expect(container.querySelector(".sender-name-column")?.textContent).toBe("炁衡物聯科技");
  expect(container.querySelector(".sender-address-column")?.textContent).toBe("臺中市霧峰區本鄉里民生路74巷7號二樓");
  expect(container.querySelector(".sender-col-gap")).not.toBeNull();
  expect((container.querySelector(".sender-block") as HTMLElement).style.gap).toBe("0mm");
  expect([...container.querySelector(".sender-block")!.children].map(el => el.className))
    .toEqual(["sender-address-column", "sender-col-gap", "sender-name-column", "sender-phone-column"]);
  expect([...container.querySelectorAll(".sender-postcode-print .postal-cell")].map(cell => cell.textContent)).toEqual(["4", "1", "3", "0", "1", "4"]);
  const senderPhone = container.querySelector(".sender-phone-column .phone")!;
  const recipientPhone = container.querySelector(".address-phone .phone")!;
  expect(senderPhone.classList.contains("grouped")).toBe(true);
  expect(recipientPhone.classList.contains("grouped")).toBe(true);
  expect([...senderPhone.children].map(span => span.textContent)).toEqual(["0928", "619", "378"]);
  expect([...recipientPhone.children].map(span => span.textContent)).toEqual(["0912", "345", "678"]);
  rerender(<Envelope draft={draft} settings={{...settings, phoneGroups: false}} />);
  expect(container.querySelector(".sender-phone-column .phone")!.textContent).toBe("0928619378");
  expect(container.querySelector(".address-phone .phone")!.textContent).toBe("0912345678");
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
    if (this.classList.contains("envelope")) return rect(0, 0, 120, 251);
    if (this.classList.contains("recipient-frame")) return rect(43.5, 58, 76.5, 217);
    if (this.classList.contains("recipient-name")) return moved ? rect(46.75, 61.25, 73.25, 220) : rect(46.75, 61.25, 73.25, 213.75);
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

test("stamp retains its double border at 20mm and columns enable wrapping", () => {
  const css = readFileSync("src/index.css", "utf8");
  expect(css.match(/\.stamp-box\s*\{([^}]+)\}/)![1]).toContain("width: 20mm; height: 20mm");
  expect(css).toMatch(/\.stamp-box > div\s*\{[^}]*border:/);
  expect(css.match(/\.postal-notice\s*\{([^}]+)\}/)![1]).toContain("right: 8mm; top: 63mm");
  const mailCheck = css.match(/\.mail-check\s*\{([^}]+)\}/)![1];
  expect(mailCheck).toContain("left: 8mm");
  expect(mailCheck).toContain("top: 76mm");
  expect(css.match(/\.stamp-box\s*\{([^}]+)\}/)![1]).toContain("top: 42mm");
  expect(mailCheck).toContain("width: 21mm");
  expect(mailCheck).toContain("height: 26mm");
  expect(css).toContain("white-space: nowrap");
  expect(css).toContain(".taiwanese .sender-phone-column");
  expect(css).toMatch(/\.taiwanese \.sender-address-column\s*\{[^}]*width: 1em;[^}]*white-space: nowrap/);
});
