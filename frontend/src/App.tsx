import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Envelope } from "./components/Envelope";
import { t } from "./i18n/zh-Hant";
import { sizes, orientedSize, type EnvelopeSize } from "./lib/sizes";
import { mmToPx } from "./lib/units";
import { emptyDraft, validate, type Draft } from "./lib/validation";
import {
  defaultSettings,
  loadDraft,
  saveDraft,
  resetDraft,
  loadSettings,
  saveSettings,
  resetSettings,
  type Settings,
} from "./lib/storage";
function useHash() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const change = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return hash;
}
const go = (path: string) => {
  window.location.hash = path;
};
function Preview({
  draft,
  settings,
  thumbnail = false,
}: {
  draft: Draft;
  settings: Settings;
  thumbnail?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(600);
  useEffect(() => {
    const update = () => setAvailable(ref.current?.clientWidth || 600);
    update();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ref.current) observer?.observe(ref.current);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  const { widthMm, heightMm } = orientedSize(settings, settings.orientation);
  const scale = Math.min(
    1,
    (available - 32) / mmToPx(widthMm),
    (thumbnail ? 190 : 650) / mmToPx(heightMm),
  );
  return (
    <div ref={ref} className={thumbnail ? "thumbnail" : "preview-area"}>
      <div
        className="preview-frame"
        style={{
          width: mmToPx(widthMm) * scale,
          height: mmToPx(heightMm) * scale,
        }}
      >
        <div
          className="scaled-envelope"
          style={{ transform: `scale(${scale})` }}
        >
          <Envelope draft={draft} settings={settings} />
        </div>
      </div>
      {!thumbnail && (
        <p className="scale">
          {t.scale} {Math.round(scale * 100)}%
        </p>
      )}
    </div>
  );
}
function Editor({ size, draft }: { size: EnvelopeSize; draft: Draft }) {
  const [s, setS] = useState(() => loadSettings(size));
  useEffect(() => {
    saveSettings(size.id, s);
  }, [size.id, s]);
  const oriented = orientedSize(s, s.orientation);
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "page-size";
    style.textContent = `@page { size: ${oriented.widthMm}mm ${oriented.heightMm}mm; margin: 0 }`;
    document.head.append(style);
    return () => style.remove();
  }, [oriented.widthMm, oriented.heightMm]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));
  const number = (
    key: keyof Settings,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <div className="field" key={key}>
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type="number"
        min={min}
        max={max}
        step={step}
        value={s[key] as number}
        onChange={(e) =>
          update(key, Math.max(min, Math.min(max, Number(e.target.value))))
        }
      />
    </div>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">03 / {size.label}</p>
          <h1>{t.editor}</h1>
        </div>
        <Button onClick={() => window.print()}>{t.print} ↗</Button>
      </div>
      <div className="editor-layout">
        <section className="preview-panel">
          <Preview draft={draft} settings={s} />
          <p className="hint">{t.printTip}</p>
        </section>
        <aside className="panel controls">
          <div className="field">
            <Label htmlFor="writingMode">{t.direction}</Label>
            <select
              id="writingMode"
              value={s.writingMode}
              onChange={(e) =>
                update("writingMode", e.target.value as Settings["writingMode"])
              }
            >
              <option value="vertical-rl">{t.vertical}</option>
              <option value="horizontal-tb">{t.horizontal}</option>
            </select>
          </div>
          <div className="field">
            <Label htmlFor="orientation">{t.orientation}</Label>
            <select
              id="orientation"
              value={s.orientation}
              onChange={(e) =>
                update("orientation", e.target.value as Settings["orientation"])
              }
            >
              <option value="portrait">{t.portrait}</option>
              <option value="landscape">{t.landscape}</option>
            </select>
          </div>
          <div className="field">
            <Label htmlFor="font">{t.font}</Label>
            <select
              id="font"
              value={s.font}
              onChange={(e) =>
                update("font", e.target.value as Settings["font"])
              }
            >
              {Object.entries(t.fonts).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {(["name", "address", "sender"] as const).map((p) => (
            <fieldset key={p}>
              <legend>{t[`${p}Block`]}</legend>
              <div className="control-grid">
                {number(`${p}Size`, t.fontSize, 6, 72)}
                {number(`${p}X`, t.x, -500, 500)}
                {number(`${p}Y`, t.y, -500, 500)}
              </div>
            </fieldset>
          ))}
          {number("spacing", t.spacing, 0, 2, 0.05)}
          {(["phones", "boxes"] as const).map((k) => (
            <label className="check" key={k}>
              <input
                type="checkbox"
                checked={s[k]}
                onChange={(e) => update(k, e.target.checked)}
              />
              {t[k]}
            </label>
          ))}
          {size.id === "custom" && (
            <div className="control-grid">
              {number("widthMm", t.width, 50, 500)}
              {number("heightMm", t.height, 50, 500)}
            </div>
          )}
          <div className="actions">
            <Button variant="outline" onClick={() => setS(resetSettings(size))}>
              {t.reset}
            </Button>
            <Button variant="ghost" onClick={() => go("/gallery")}>
              {t.back}
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
export default function App() {
  const hash = useHash();
  const [draft, setDraft] = useState(loadDraft);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);
  const errors = validate(draft);
  const editorSize = hash.startsWith("#/editor/")
    ? sizes.find((s) => s.id === hash.slice(9))
    : undefined;
  const step = editorSize ? 2 : hash === "#/gallery" ? 1 : 0;
  const field = (key: keyof Draft, label: string, required = false) => (
    <div className={`field ${key.endsWith("Address") ? "wide" : ""}`} key={key}>
      <Label htmlFor={key}>
        {label}
        <span className="optional">{required ? t.required : t.optional}</span>
      </Label>
      <Input
        id={key}
        value={draft[key]}
        required={required}
        inputMode={key.endsWith("Postcode") ? "numeric" : undefined}
        aria-invalid={submitted && !!errors[key]}
        aria-describedby={submitted && errors[key] ? `${key}-error` : undefined}
        onChange={(e) =>
          setDraft({
            ...draft,
            [key]: key.endsWith("Postcode")
              ? e.target.value.replace(/\D/g, "")
              : e.target.value,
          })
        }
      />
      {submitted && errors[key] && (
        <p className="error" id={`${key}-error`}>
          {errors[key]}
        </p>
      )}
    </div>
  );
  const select = (
    key: "recipientTitle" | "opening",
    label: string,
    values: readonly string[],
  ) => (
    <div className="field">
      <Label htmlFor={key}>{label}</Label>
      <select
        id={key}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      >
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </div>
  );
  return (
    <>
      <header>
        <a href="#/" className="brand">
          <span className="brand-icon">✉</span>
          {t.app}
        </a>
        <span className="header-note">{t.tagline}</span>
      </header>
      <main>
        <nav aria-label={t.app} className="steps">
          {t.steps.map((label, i) => (
            <span
              key={label}
              className={step === i ? "active" : ""}
              aria-current={step === i ? "step" : undefined}
            >
              <b>0{i + 1}</b>
              {label}
            </span>
          ))}
        </nav>
        {step === 0 ? (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">{t.tagline}</p>
                <h1>{t.steps[0]}</h1>
                <p className="hint">{t.subtitle}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setDraft({ ...emptyDraft, ...t.sampleData });
                  setSubmitted(false);
                }}
              >
                {t.sample}
              </Button>
            </div>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
                if (!Object.keys(errors).length) go("/gallery");
              }}
            >
              <div className="form-grid">
                <section className="panel">
                  <h2>
                    <span>01</span>
                    {t.recipient}
                  </h2>
                  <div className="fields">
                    {field("recipientName", t.name, true)}
                    {select("recipientTitle", t.title, t.titles)}
                    {draft.recipientTitle === t.titles[6] &&
                      field("customTitle", t.customTitle, true)}
                    {field("recipientPostcode", t.postcode)}
                    {select("opening", t.opening, t.openings)}
                    {field("recipientAddress", t.address, true)}
                    {field("recipientPhone", t.phone)}
                  </div>
                </section>
                <section className="panel">
                  <h2>
                    <span>02</span>
                    {t.sender}
                  </h2>
                  <div className="fields">
                    {field("senderName", t.name)}
                    {field("senderPostcode", t.postcode)}
                    {field("senderAddress", t.address, true)}
                    {field("senderPhone", t.phone)}
                  </div>
                </section>
              </div>
              <div className="form-bottom">
                <p className="hint">{t.saved}</p>
                <div className="actions">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDraft(resetDraft());
                      setSubmitted(false);
                    }}
                  >
                    {t.clear}
                  </Button>
                  <Button type="submit">{t.next} →</Button>
                </div>
              </div>
            </form>
          </>
        ) : step === 1 ? (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">02 / {t.steps[1]}</p>
                <h1>{t.gallery}</h1>
                <p className="hint">{t.galleryHint}</p>
              </div>
              <Button variant="outline" onClick={() => go("/")}>
                {t.back}
              </Button>
            </div>
            <div className="gallery">
              {sizes.map((size) => (
                <button
                  className="size-card"
                  key={size.id}
                  onClick={() => go(`/editor/${size.id}`)}
                >
                  <Preview
                    draft={draft}
                    settings={defaultSettings(size)}
                    thumbnail
                  />
                  <div className="card-caption">
                    <strong>{size.label}</strong>
                    <span>
                      {size.widthMm} × {size.heightMm} mm
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <Editor key={editorSize!.id} size={editorSize!} draft={draft} />
        )}
      </main>
      <footer>{t.footer}</footer>
    </>
  );
}
