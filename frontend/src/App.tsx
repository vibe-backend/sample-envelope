import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "./components/ui/dialog";
import { fitFontSize } from "./lib/overflow";
import type { Block } from "./components/Envelope";
import { Envelope } from "./components/Envelope";
import { t } from "./i18n/zh-Hant";
import { sizes, orientedSize, pageRule, type EnvelopeSize } from "./lib/sizes";
import { mmToPx } from "./lib/units";
import { emptyDraft, validate, type Draft } from "./lib/validation";
import {
  draftKey, settingsKey,
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
  onOverflow, onMove,
}: {
  draft: Draft;
  settings: Settings;
  thumbnail?: boolean;
  onOverflow?: (blocks: Block[]) => void;
  onMove?: (block: Block, x: number, y: number) => void;
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
    (thumbnail ? (window.innerWidth < 520 ? 290 : 190) : window.innerWidth < 800 ? window.innerHeight * 0.32 : 650) / mmToPx(heightMm),
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
          <Envelope draft={draft} settings={settings} onOverflow={onOverflow} onMove={onMove} />
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
  const [overflow, setOverflow] = useState<Block[]>([]);
  const reportOverflow = useCallback((blocks: Block[]) => setOverflow(prev => prev.join() === blocks.join() ? prev : blocks), []);
  const [dialog, setDialog] = useState(false);
  const [skip, setSkip] = useState(false);
  const [kaiMissing, setKaiMissing] = useState(false);
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === settingsKey(size.id) || e.key === null) setS(loadSettings(size)); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [size]);
  useEffect(() => {
    if (s.font !== "kai") return;
    const names = ["BiauKai", "DFKai-SB", "KaiTi", "STKaiti", "Kaiti TC"];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const available = names.some(name => {
      if (document.fonts?.check(`12px "${name}"`)) {
        if (!ctx) return true;
        ctx.font = "12px serif";
        const baseline = ctx.measureText("漢字ABC").width;
        ctx.font = `12px "${name}",serif`;
        return ctx.measureText("漢字ABC").width !== baseline;
      }
      return false;
    });
    void Promise.resolve().then(() => setKaiMissing(!available));
  }, [s.font]);
  const print = () => {
    try { if (localStorage.getItem("sample-envelope:skip-print-dialog") === "true") { window.print(); return; } } catch { /* unavailable */ }
    setDialog(true);
  };
  const oriented = orientedSize(s, s.orientation);
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "page-size";
    style.textContent = pageRule({widthMm: oriented.widthMm, heightMm: oriented.heightMm});
    document.head.append(style);
    return () => style.remove();
  }, [oriented.widthMm, oriented.heightMm]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));
  const [raw, setRaw] = useState<Partial<Record<keyof Settings, string>>>({});
  const number = (key: keyof Settings, label: string, min: number, max: number, step = 1, block?: Block) => {
    const accessibleName = block ? `${t[`${block}Block`]} ${label}` : label;
    const value = raw[key] ?? String(s[key]);
    const invalid = value === "" || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max;
    const apply = (text: string) => {
      setRaw(prev => ({...prev, [key]: text}));
      if (text === "" || !Number.isFinite(Number(text)) || Number(text) < min || Number(text) > max) return;
      const value = Number(text);
      setS(prev => {
        const next = {...prev, [key]: value};
        if (key === "widthMm" || key === "heightMm") next.orientation = next.widthMm <= next.heightMm ? "portrait" : "landscape";
        return next;
      });
    };
    return <div className="field" key={key}>
      <Label htmlFor={key}>{label} <span>{min}–{max}{key.endsWith("Size") ? " pt" : ""}</span></Label>
      <div className="number-control">
        <button type="button" aria-label={`${accessibleName} ${t.decrease}`} onClick={() => apply(String(Number(value) - step))}>−</button>
        <Input id={key} aria-label={accessibleName} type="number" min={min} max={max} step={step} value={value} aria-invalid={invalid} aria-describedby={invalid ? `${key}-error` : undefined} onChange={e => apply(e.target.value)} />
        {key.endsWith("Size") && <span>pt</span>}
        <button type="button" aria-label={`${accessibleName} ${t.increase}`} onClick={() => apply(String(Number(value) + step))}>+</button>
      </div>
      {invalid && <p className="error" id={`${key}-error`}>{t.rangeError}</p>}
    </div>;
  };
  const move = (p: Block, x: number, y: number) => { setRaw({}); setS(prev => ({...prev, [`${p}X`]: x, [`${p}Y`]: y})); };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">03 / {size.label}</p>
          <h1>{t.editor}</h1>
        </div>
        <Button onClick={print}>{t.print} ↗</Button>
      </div>
      <div className="editor-layout">
        <section className="preview-panel">
          <Preview draft={draft} settings={s} onOverflow={reportOverflow} onMove={move} />
          <div className="print-callout" role="note">{t.printTip}</div>
        </section>
        <aside className="panel controls">
          <div className="dimensions">
            {number("widthMm", t.width, 50, 500)}
            {number("heightMm", t.height, 50, 500)}
          </div>
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
                setS(prev => {
                  const orientation = e.target.value as Settings["orientation"];
                  const dims = orientedSize(prev, orientation);
                  setRaw({});
                  return {...prev, ...dims, orientation};
                })
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
          {s.font === "kai" && kaiMissing && <p className="hint">{t.kaiMissing}</p>}
          {(["name", "address", "sender"] as const).map((p) => (
            <fieldset key={p}>
              <legend>{t[`${p}Block`]}</legend>
              <div className="control-grid">
                {number(`${p}Size`, t.fontSize, 6, 72, 0.5, p)}
                <div className="wide"><b>{t.position}</b><p className="hint">{t.positionHelp}</p></div>
                {number(`${p}X`, t.x, -500, 500, 1, p)}
                {number(`${p}Y`, t.y, -500, 500, 1, p)}
              </div>
              <div className="actions">
                <Button variant="ghost" onClick={() => move(p, 0, 0)}>{t.center}</Button>
                <Button variant="ghost" onClick={() => { const defaults = defaultSettings(size); setRaw({}); setS(prev => ({...prev, [`${p}Size`]: defaults[`${p}Size`], [`${p}X`]: 0, [`${p}Y`]: 0})); }}>{t.resetBlock}</Button>
              </div>
              {overflow.includes(p) && <div role="status" aria-live="polite" className="error">{t[`${p}Block`]}：{t.overflow}
                <Button variant="outline" onClick={() => {
                  const el = document.querySelector<HTMLElement>(`.preview-area [data-block="${p}"]`);
                  if (!el) return;
                  const fitted = fitFontSize(s[`${p}Size`], 6, value => { el.style.fontSize = `${value}pt`; return el; });
                  setRaw({}); update(`${p}Size`, fitted);
                }}>{t.autoFit}</Button>
              </div>}
            </fieldset>
          ))}
          {number("spacing", t.spacing, 0, 2, 0.05)}
          {(["phones", "phoneGroups", "boxes"] as const).map((k) => (
            <label className="check" key={k}>
              <input
                type="checkbox"
                disabled={k === "phones" && !draft.recipientPhone.trim() && !draft.senderPhone.trim()}
                checked={s[k]}
                onChange={(e) => update(k, e.target.checked)}
              />
              {t[k]}
            </label>
          ))}
          {!draft.recipientPhone.trim() && !draft.senderPhone.trim() && <p className="hint">{t.noPhones}</p>}
          <div className="actions">
            <Button variant="outline" onClick={() => { setRaw({}); setS(resetSettings(size)); }}>
              {t.reset}
            </Button>
            <Button variant="ghost" onClick={() => go("/gallery")}>
              {t.back}
            </Button>
          </div>
        </aside>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t.printHeading}</DialogTitle>
          <DialogDescription>{t.printTip}</DialogDescription>
          <ol className="print-steps"><li>{t.printPaper}：{oriented.widthMm} × {oriented.heightMm} mm</li>{t.printSteps.map(step => <li key={step}>{step}</li>)}</ol>
          <label className="check"><input type="checkbox" checked={skip} onChange={e => {setSkip(e.target.checked); try {localStorage.setItem("sample-envelope:skip-print-dialog", String(e.target.checked));} catch { /* unavailable */ }}} />{t.skipPrint}</label>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>{t.cancel}</Button><Button onClick={() => {setDialog(false); window.print();}}>{t.print}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
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
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === draftKey || e.key === null) setDraft(loadDraft()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
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
        aria-describedby={key === "opening" ? "opening-help" : undefined}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      >
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
      {key === "opening" && <p id="opening-help" className="hint">{t.openingHelp}</p>}
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
                  if (Object.keys(draft).some(key => draft[key as keyof Draft] !== emptyDraft[key as keyof Draft] && draft[key as keyof Draft].trim()) && !window.confirm(t.sampleConfirm)) return;
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
                    {field("senderAddress", t.address)}
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
