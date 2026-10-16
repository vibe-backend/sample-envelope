import type { CSSProperties } from "react";
import type { Draft } from "../lib/validation";
import type { Settings } from "../lib/storage";
import { orientedSize } from "../lib/sizes";
import { mmToCss } from "../lib/units";
import { t } from "../i18n/zh-Hant";
const fonts = {
  serif: '"Noto Serif TC","Songti TC","PMingLiU",serif',
  sans: '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',
  kai: '"BiauKai","DFKai-SB","KaiTi","STKaiti","Kaiti TC",serif',
};
export function digitRuns(text: string) {
  return text.split(/(\d+)/).map((part, i) =>
    /^\d+$/.test(part) ? (
      <span
        key={i}
        style={
          part.length <= 2
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
export function Envelope({
  draft: d,
  settings: s,
}: {
  draft: Draft;
  settings: Settings;
}) {
  const size = orientedSize(s, s.orientation);
  const block = (prefix: "name" | "address" | "sender"): CSSProperties => ({
    fontSize: `${s[`${prefix}Size`]}pt`,
    transform: `translate(${mmToCss(s[`${prefix}X`])}, ${mmToCss(s[`${prefix}Y`])})`,
  });
  const postcode = (value: string) =>
    s.boxes ? (
      <span className="postcode-boxes">
        {value.split("").map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </span>
    ) : (
      digitRuns(value)
    );
  const title =
    d.recipientTitle === t.titles[6] ? d.customTitle : d.recipientTitle;
  return (
    <div
      className={`envelope ${s.writingMode === "vertical-rl" ? "vertical" : "horizontal"}`}
      role="img"
      aria-label={`${t.preview}：${d.recipientName}，${d.recipientAddress}`}
      style={{
        width: mmToCss(size.widthMm),
        height: mmToCss(size.heightMm),
        fontFamily: fonts[s.font],
        writingMode: s.writingMode,
      }}
    >
      {s.boxes && s.writingMode === "horizontal-tb" && (
        <div className="recipient-postcode">
          {postcode(d.recipientPostcode)}
        </div>
      )}
      <div className="recipient-address" style={block("address")}>
        {!(s.boxes && s.writingMode === "horizontal-tb") && (
          <span className="address-postcode">
            {postcode(d.recipientPostcode)}{" "}
          </span>
        )}
        <span className="address-text">{digitRuns(d.recipientAddress)}</span>
        {s.phones && (
          <small className="address-phone">
            {" "}
            {digitRuns(d.recipientPhone)}
          </small>
        )}
      </div>
      <div className="recipient-name" style={block("name")}>
        <strong style={{ letterSpacing: `${s.spacing}em` }}>
          {d.recipientName}
        </strong>
        <span className="salutation">
          {title}
          {"\u3000"}
          {d.opening === t.openings[7] ? "" : d.opening}
        </span>
      </div>
      <div className="sender-block" style={block("sender")}>
        {postcode(d.senderPostcode)}
        <div>{digitRuns(d.senderAddress)}</div>
        <div>{d.senderName}</div>
        {s.phones && <small>{digitRuns(d.senderPhone)}</small>}
      </div>
    </div>
  );
}
