/* eslint-disable react-hooks/refs -- Pointer handler factories only access refs in event callbacks. */
import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import type { Draft } from "../lib/validation";
import type { Settings } from "../lib/storage";
import { orientedSize } from "../lib/sizes";
import { mmToCss } from "../lib/units";
import { t } from "../i18n/zh-Hant";
import { isOverflowing, isOutsideInset } from "../lib/overflow";
import { topPadMm, verticalAddressArea, verticalSenderArea } from "../lib/layout";
export type Block = "name" | "address" | "sender";
const fonts = {
  serif: '"Noto Serif TC","Songti TC","PMingLiU",serif',
  sans: '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',
  kai: '"BiauKai","DFKai-SB","KaiTi","STKaiti","Kaiti TC",serif',
};
export function digitRuns(text: string) {
  return text.split(/([A-Za-z]+|\d+)/).map((part, i) =>
    /^[A-Za-z0-9]+$/.test(part) ? (
      <span
        key={i}
        style={
          /^\d{1,2}$/.test(part)
            ? { textCombineUpright: "all" }
            : { textOrientation: "upright" }
        }
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}
export function postcodeGroups(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6).padEnd(6, " ").split("").map(d => d.trim());
  return [digits.slice(0, 3), digits.slice(3)];
}
/**
 * Normalize phone display so recipient/sender use the same style.
 * - grouped off: digits only (0912345678)
 * - grouped on: keep 0928-619-378 / spaces, or auto 4-3-3 for 10-digit 09 mobiles
 */
export function phoneGroupParts(value: string, grouped: boolean) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return [];
  if (!grouped) return [digits];
  const parts = value.split(/[\s-]+/).map(part => part.replace(/\D/g, "")).filter(Boolean);
  if (parts.length > 1) return parts;
  if (/^09\d{8}$/.test(digits)) return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)];
  return [digits];
}
/** Digits always fill the cells; borders + caption tip are optional preprinted marks. */
function PrintedPostcode({value, kind, showBoxes}: {value: string; kind: "recipient" | "sender"; showBoxes: boolean}) {
  const caption = t[`${kind}PostcodeCaption`];
  return <div className={`preprinted printed-postcode ${kind}-postcode-print ${showBoxes ? "with-boxes" : "digits-only"}`}>
    <div className="postal-row">{postcodeGroups(value).map((group, i) => <Fragment key={i}>
      {i === 1 && <span className="postal-dash" aria-hidden="true" />}
      <span className="postal-group">{group.map((digit, j) => <span className="postal-cell" key={j}>{digit}</span>)}</span>
    </Fragment>)}</div>
    {showBoxes && <div className="postal-caption" aria-label={caption}>
      {[...caption].map((ch, i) => <span key={i}>{ch}</span>)}
    </div>}
  </div>;
}
export function Envelope({
  draft: d,
  settings: s,
  onOverflow,
  onMove,
}: {
  draft: Draft;
  settings: Settings;
  onOverflow?: (blocks: Block[]) => void;
  onMove?: (block: Block, x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{x: number; y: number; bx: number; by: number} | null>(null);
  useEffect(() => {
    const measure = () => {
      const overflowing: Block[] = [];
      ref.current?.querySelectorAll<HTMLElement>("[data-block]").forEach(el => {
        const frame = ref.current?.querySelector<HTMLElement>(".recipient-frame");
        const scale = ref.current ? ref.current.getBoundingClientRect().width / orientedSize(s, s.orientation).widthMm : 0;
        const outsideFrame = el.dataset.block === "name" && frame && scale > 0
          ? isOutsideInset(el.getBoundingClientRect(), frame.getBoundingClientRect(), 3 * scale)
          : false;
        const over = isOverflowing(el) || outsideFrame;
        el.classList.toggle("overflowing", over);
        if (over) overflowing.push(el.dataset.block as Block);
      });
      onOverflow?.(overflowing);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (ref.current) observer?.observe(ref.current);
    let active = true;
    void document.fonts?.ready.then(() => { if (active) measure(); });
    return () => { active = false; observer?.disconnect(); };
  }, [d, s, onOverflow]);
  const interactive = (p: Block) => ({
    "data-block": p,
    tabIndex: onMove ? 0 : undefined,
    "aria-label": t[`${p}Block`],
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      const delta = e.shiftKey ? 5 : 1;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      onMove?.(p, s[`${p}X`] + (e.key === "ArrowLeft" ? -delta : e.key === "ArrowRight" ? delta : 0), s[`${p}Y`] + (e.key === "ArrowUp" ? -delta : e.key === "ArrowDown" ? delta : 0));
    },
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onMove) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {x: e.clientX, y: e.clientY, bx: s[`${p}X`], by: s[`${p}Y`]};
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current || !onMove || !ref.current) return;
      const ratio = ref.current.getBoundingClientRect().width / size.widthMm;
      if (ratio) onMove(p, drag.current.bx + (e.clientX - drag.current.x) / ratio, drag.current.by + (e.clientY - drag.current.y) / ratio);
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
    onLostPointerCapture: () => { drag.current = null; },
  });
  const vertical = s.writingMode === "vertical-rl";
  const taiwanese = s.presetId === "chinese-vertical" && vertical;
  const printedPostcodes = taiwanese;
  const uprightDigits = (text: string, keyPrefix: string) =>
    [...text].map((ch, j) => (
      <span key={`${keyPrefix}-${j}`} style={{textOrientation: "upright"}}>{ch}</span>
    ));
  const phone = (value: string) => (
    <span className={`phone ${s.phoneGroups ? "grouped" : ""}`}>
      {phoneGroupParts(value, s.phoneGroups).map((part, i) => (
        <span key={i}>{vertical ? uprightDigits(part, String(i)) : part}</span>
      ))}
    </span>
  );
  const size = orientedSize(s, s.orientation);
  const addressArea = verticalAddressArea(size.heightMm, taiwanese);
  const senderArea = verticalSenderArea(size.widthMm, size.heightMm);
  const block = (prefix: "name" | "address" | "sender"): CSSProperties => ({
    fontSize: `${s[`${prefix}Size`]}pt`,
    transform: `translate(${mmToCss(s[`${prefix}X`])}, ${mmToCss(s[`${prefix}Y`])})`,
  });
  const postcode = (value: string) =>
    s.boxes && !vertical ? (
      <span className="postcode-boxes">
        {value.split("").map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </span>
    ) : (
      digitRuns(value)
    );
  const inlineAddress = (code: string, address: string, showPostcode = true) => <>
    {/* Taiwanese zip always sits in the postcode cells, not the address column. */}
    {showPostcode && !printedPostcodes && <span className="address-postcode">
      {postcode(code)}<span className="postcode-space"> </span>
    </span>}
    <span className="address-text">{digitRuns(address)}</span>
  </>;
  const title =
    d.recipientTitle === t.titles[6] ? d.customTitle : d.recipientTitle;
  return (
    <div
      ref={ref}
      className={`envelope ${taiwanese ? "taiwanese" : ""} ${taiwanese && s.printRecipientFrame ? "has-recipient-frame" : ""} ${s.printOuterBorder ? "has-outer-border" : ""} ${s.writingMode === "vertical-rl" ? "vertical" : "horizontal"}`}
      role="img"
      aria-label={`${t.preview}：${d.recipientName}，${d.recipientAddress}`}
      style={{
        width: mmToCss(size.widthMm),
        height: mmToCss(size.heightMm),
        fontFamily: fonts[s.font],
        writingMode: s.writingMode,
      }}
    >
      {s.printOuterBorder && <div className="outer-border" aria-hidden="true" />}
      {taiwanese && s.showTopPad && (
        <div
          className="preprinted top-pad-guide"
          style={{ height: mmToCss(topPadMm) }}
          aria-hidden="true"
        />
      )}
      {printedPostcodes && <>
        <PrintedPostcode kind="recipient" value={d.recipientPostcode} showBoxes={s.printPostcodeBoxes} />
        <PrintedPostcode kind="sender" value={d.senderPostcode} showBoxes={s.printPostcodeBoxes} />
      </>}
      {taiwanese && s.printStampBox && <div className="preprinted stamp-box"><div>{t.stampColumns.map(column => <span key={column}>{column}</span>)}</div></div>}
      {taiwanese && s.printMailCheck && <div className="preprinted mail-check">
        <div className="mail-check-title">{t.mailCheckTitle}</div>
        <table className="mail-check-grid"><tbody>{t.mailCheckOptions.map(label => (
          <tr key={label}><td>{label}</td><td className="mail-check-box" aria-hidden="true" /></tr>
        ))}</tbody></table>
      </div>}
      {taiwanese && s.printRecipientFrame && <div className="preprinted recipient-frame" />}
      {taiwanese && s.printNotice && <div className="preprinted postal-notice">{t.postalNotice}</div>}
      {s.boxes && s.writingMode === "horizontal-tb" && (
        <div className="recipient-postcode">
          {postcode(d.recipientPostcode)}
        </div>
      )}
      <div {...interactive("address")} className="recipient-address" style={{...block("address"), ...(vertical ? {top: mmToCss(addressArea.topMm), height: mmToCss(addressArea.heightMm)} : {})}}>
        <span className="recipient-address-column">
        {s.showAddressLabel && t.addressLabel}
        {inlineAddress(d.recipientPostcode, d.recipientAddress, !(s.boxes && !vertical))}
        </span>
        {s.phones && d.recipientPhone.trim() && (
          <small className="address-phone">
            {vertical ? (s.showPhoneLabel ? t.phoneLabel : "") : " "}
            {phone(d.recipientPhone)}
          </small>
        )}
      </div>
      {d.recipientName.trim() && <div {...interactive("name")} className="recipient-name" style={block("name")}>
        <strong className="recipient-name-text" style={{ letterSpacing: `${s.spacing}em` }}>
          {digitRuns(d.recipientName)}
        </strong>
        {s.showTitle && title.trim() && <span className="recipient-title">{digitRuns(title)}</span>}
        {s.showSalutation && d.opening !== t.openings[7] && d.opening.trim() && <span className="salutation">{d.opening}</span>}
      </div>}
      {(d.senderName.trim() || d.senderAddress.trim()) && <div {...interactive("sender")} className="sender-block" style={{...block("sender"), ...(taiwanese ? {
        left: mmToCss(senderArea.leftMm),
        top: mmToCss(senderArea.topMm),
        width: mmToCss(senderArea.widthMm),
        height: mmToCss(senderArea.heightMm),
        gap: mmToCss(senderArea.gapMm),
        lineHeight: senderArea.lineHeight,
      } : {})}}>
        {vertical ? <>
          {d.senderName.trim() && <span className="sender-name-column">{digitRuns(d.senderName)}</span>}
          <span className="sender-address-column">{inlineAddress(d.senderPostcode, d.senderAddress)}</span>
          {s.phones && d.senderPhone.trim() && <span className="sender-phone-column">{s.showPhoneLabel && t.phoneLabel}{phone(d.senderPhone)}</span>}
        </> : <>
          {postcode(d.senderPostcode)}
          <div>{digitRuns(d.senderAddress)}</div>
          <div>{digitRuns(d.senderName)}</div>
          {s.phones && d.senderPhone.trim() && <small>{phone(d.senderPhone)}</small>}
        </>}
      </div>}
    </div>
  );
}
