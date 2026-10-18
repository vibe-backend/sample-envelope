import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "./components/ui/dialog";
import { Checkbox } from "./components/ui/checkbox";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { fitFontSize } from "./lib/overflow";
import type { Block } from "./components/Envelope";
import { Envelope } from "./components/Envelope";
import { t } from "./i18n/zh-Hant";
import { sizes, orientedSize, pageRule, type EnvelopeSize } from "./lib/sizes";
import { createEnvelopePdfUrl } from "./lib/pdf";
import { DEFAULT_CALIBRATION, loadCalibration, mmToPx, saveCalibration } from "./lib/units";
import { stepValue } from "./lib/step";
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
import { cn } from "./lib/utils";

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

function CheckRow({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="check rounded-lg border border-border/70 bg-card px-3 py-2.5">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5 size-[18px]"
      />
      <Label htmlFor={id} className="cursor-pointer text-sm leading-snug font-medium text-foreground">
        {label}
      </Label>
    </div>
  );
}

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
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [calibration, setCalibration] = useState(loadCalibration);
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
  const fitScale = Math.min(
    1,
    (available - 32) / mmToPx(widthMm),
    (thumbnail ? 290 : window.innerWidth < 800 ? window.innerHeight * 0.32 : 650) / mmToPx(heightMm),
  );
  // Browsers map CSS mm at 96 dpi; multiply by calibration so "100%" can match a real envelope.
  const scale = thumbnail || zoom === "fit" ? fitScale : zoom * calibration;
  const nudge = (delta: number) => {
    const base = zoom === "fit" ? fitScale / calibration : zoom;
    setZoom(Math.min(2, Math.max(0.25, Math.round((base + delta) * 20) / 20)));
  };
  const nudgeCalibration = (delta: number) => {
    setZoom(1);
    setCalibration(saveCalibration(calibration + delta));
  };
  return (
    <div ref={ref} className={thumbnail ? "thumbnail" : "preview-area"} aria-hidden={thumbnail ? true : undefined}>
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
        <div className="scale-bar">
          <p className="scale">
            {t.scale}{" "}
            {zoom === "fit" ? Math.round(scale * 100) : Math.round(zoom * 100)}%
          </p>
          <div className="zoom-controls">
            <button type="button" aria-label={t.zoomOut} onClick={() => nudge(-0.05)}>−</button>
            <button type="button" aria-pressed={zoom === "fit"} onClick={() => setZoom("fit")}>{t.zoomFit}</button>
            <button type="button" aria-pressed={zoom === 1} onClick={() => setZoom(1)}>{t.zoomActual}</button>
            <button type="button" aria-label={t.zoomIn} onClick={() => nudge(0.05)}>+</button>
          </div>
          <div className="zoom-controls calibrate">
            <span className="calibrate-label" title={t.screenCalibrateHelp}>{t.screenCalibrate}</span>
            <button type="button" aria-label={`${t.screenCalibrate} ${t.decrease}`} onClick={() => nudgeCalibration(-0.01)}>−</button>
            <output className="calibrate-value" aria-live="polite">{calibration.toFixed(2)}</output>
            <button type="button" aria-label={`${t.screenCalibrate} ${t.increase}`} onClick={() => nudgeCalibration(0.01)}>+</button>
            <button type="button" onClick={() => { setCalibration(saveCalibration(DEFAULT_CALIBRATION)); setZoom(1); }}>{t.screenCalibrateReset}</button>
          </div>
          <p className="calibrate-help">{t.screenCalibrateHelp}</p>
        </div>
      )}
    </div>
  );
}

function Editor({ size, draft }: { size: EnvelopeSize; draft: Draft }) {
  const [s, setS] = useState(() => loadSettings(size, draft));
  useEffect(() => {
    saveSettings(size.id, s);
  }, [size.id, s]);
  const [overflow, setOverflow] = useState<Block[]>([]);
  const reportOverflow = useCallback((blocks: Block[]) => setOverflow(prev => prev.join() === blocks.join() ? prev : blocks), []);
  const [dialog, setDialog] = useState(false);
  const [skip, setSkip] = useState(false);
  const [kaiMissing, setKaiMissing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfFrameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === settingsKey(size.id) || e.key === null) setS(loadSettings(size, draft)); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [size, draft]);
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
  const oriented = orientedSize(s, s.orientation);
  const closePdfPreview = () => {
    setPdfUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  };
  const runPrint = async () => {
    setPdfBusy(true);
    setPdfError(false);
    try {
      const url = await createEnvelopePdfUrl({
        widthMm: oriented.widthMm,
        heightMm: oriented.heightMm,
      });
      setDialog(false);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      setPdfError(true);
    } finally {
      setPdfBusy(false);
    }
  };
  const printFromPreview = () => {
    const win = pdfFrameRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };
  const print = () => {
    try {
      if (localStorage.getItem("sample-envelope:skip-print-dialog") === "true") {
        void runPrint();
        return;
      }
    } catch { /* unavailable */ }
    setPdfError(false);
    setDialog(true);
  };
  useEffect(() => {
    const {widthMm, heightMm} = oriented;
    document.documentElement.style.setProperty("--envelope-page-width", `${widthMm}mm`);
    document.documentElement.style.setProperty("--envelope-page-height", `${heightMm}mm`);
    const style = document.createElement("style");
    style.id = "page-size";
    style.textContent = pageRule({widthMm, heightMm});
    document.head.append(style);
    return () => {
      style.remove();
      document.documentElement.style.removeProperty("--envelope-page-width");
      document.documentElement.style.removeProperty("--envelope-page-height");
    };
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
      <Label htmlFor={key} className="flex items-center justify-between gap-2">
        {label} <span className="text-muted-foreground text-xs font-normal">{min}–{max}{key.endsWith("Size") ? " pt" : ""}</span>
      </Label>
      <div className="number-control">
        <button type="button" aria-label={`${accessibleName} ${t.decrease}`} onClick={() => apply(String(stepValue(Number(value), step, -1)))}>−</button>
        <Input id={key} aria-label={accessibleName} type="number" min={min} max={max} step={step} value={value} aria-invalid={invalid} aria-describedby={invalid ? `${key}-error` : undefined} onChange={e => apply(e.target.value)} />
        {key.endsWith("Size") && <span>pt</span>}
        <button type="button" aria-label={`${accessibleName} ${t.increase}`} onClick={() => apply(String(stepValue(Number(value), step, 1)))}>+</button>
      </div>
      {invalid && <p className="error" id={`${key}-error`}>{t.rangeError}</p>}
    </div>;
  };
  const move = (p: Block, x: number, y: number) => { setRaw({}); setS(prev => ({...prev, [`${p}X`]: x, [`${p}Y`]: y})); };
  const markKeys = (["printOuterBorder", ...(size.id === "chinese-vertical" ? ["showTopPad", "printPostcodeBoxes", "printStampBox", "printMailCheck", "printRecipientFrame", "printNotice"] as const : s.writingMode === "horizontal-tb" ? ["boxes"] as const : []), "showAddressLabel", "showPhoneLabel", "showTitle", "showSalutation"] as const);
  const printDialogKeys = (["printOuterBorder", ...(size.id === "chinese-vertical" ? ["showTopPad", "printPostcodeBoxes", "printStampBox", "printMailCheck", "printRecipientFrame", "printNotice"] as const : s.writingMode === "horizontal-tb" ? ["boxes"] as const : [])] as const);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">03 / {size.label}</p>
          <h1>{t.editor}</h1>
        </div>
        <Button className="primary-cta" onClick={print}>{t.print}</Button>
      </div>
      <div className="editor-layout">
        <div className="preview-panel">
          <Preview draft={draft} settings={s} onOverflow={reportOverflow} onMove={move} />
          <div className="p-3">
            <div className="print-callout" role="note">{t.printTip}</div>
          </div>
        </div>
        <aside className="controls overflow-hidden">
          <div className="border-b border-border px-4 py-4">
            <h2 className="section-title text-lg">{size.label}</h2>
            <p className="hint mt-1">{oriented.widthMm} × {oriented.heightMm} mm</p>
          </div>
          <ScrollArea className="h-[min(62vh,720px)]">
              <div className="space-y-5 p-4">
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="section-index">{t.editorLayoutTab}</span>
                    <Separator className="flex-1" />
                  </div>
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
                  {number("spacing", t.spacing, 0, 2, 0.05)}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="section-index">{t.editorBlocksTab}</span>
                    <Separator className="flex-1" />
                  </div>
                  {(["name", "address", "sender"] as const).map((p) => (
                    <fieldset key={p} className="rounded-lg border border-border bg-card p-3">
                      <legend className="px-1 text-sm font-semibold">{t[`${p}Block`]}</legend>
                      <div className="control-grid">
                        {number(`${p}Size`, t.fontSize, 6, 72, 0.5, p)}
                        <div className="wide"><b>{t.position}</b><p className="hint">{t.positionHelp}</p></div>
                        {number(`${p}X`, t.x, -500, 500, 0.1, p)}
                        {number(`${p}Y`, t.y, -500, 500, 0.1, p)}
                      </div>
                      <div className="actions mt-3">
                        <Button variant="ghost" onClick={() => move(p, 0, 0)}>{t.center}</Button>
                        <Button variant="ghost" onClick={() => { const defaults = defaultSettings(size, draft); setRaw({}); setS(prev => ({...prev, [`${p}Size`]: defaults[`${p}Size`], [`${p}X`]: 0, [`${p}Y`]: 0})); }}>{t.resetBlock}</Button>
                      </div>
                      {overflow.includes(p) && <div role="status" aria-live="polite" className="error mt-2">{t[`${p}Block`]}：{t.overflow}
                        <Button variant="outline" onClick={() => {
                          const el = document.querySelector<HTMLElement>(`.preview-area [data-block="${p}"]`);
                          if (!el) return;
                          const fitted = fitFontSize(s[`${p}Size`], 6, value => { el.style.fontSize = `${value}pt`; return el; });
                          setRaw({}); update(`${p}Size`, fitted);
                        }}>{t.autoFit}</Button>
                      </div>}
                    </fieldset>
                  ))}
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="section-index">{t.editorMarksTab}</span>
                    <Separator className="flex-1" />
                  </div>
                  <CheckRow
                    id="phones"
                    label={t.phones}
                    checked={s.phones && !!(draft.recipientPhone.trim() || draft.senderPhone.trim())}
                    disabled={!draft.recipientPhone.trim() && !draft.senderPhone.trim()}
                    onCheckedChange={(checked) => update("phones", checked)}
                  />
                  <CheckRow
                    id="phoneGroups"
                    label={t.phoneGroups}
                    checked={s.phoneGroups}
                    onCheckedChange={(checked) => update("phoneGroups", checked)}
                  />
                  {!draft.recipientPhone.trim() && !draft.senderPhone.trim() && <p className="hint">{t.noPhones}</p>}
                  {markKeys.map((k) => (
                    <CheckRow
                      key={k}
                      id={k}
                      label={t[k]}
                      checked={s[k]}
                      onCheckedChange={(checked) => update(k, checked)}
                    />
                  ))}
                </section>
              </div>
          </ScrollArea>
          <div className="actions justify-between gap-2 border-t border-border px-4 py-3">
            <Button variant="outline" onClick={() => { setRaw({}); setS(resetSettings(size, draft)); }}>
              {t.reset}
            </Button>
            <Button variant="ghost" onClick={() => go("/gallery")}>
              {t.back}
            </Button>
          </div>
        </aside>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent showCloseButton={false} className="print-dialog">
          <DialogTitle>{t.printHeading}</DialogTitle>
          <DialogDescription>{t.printTip}</DialogDescription>
          <ol className="print-steps"><li>{t.printPaper}：{oriented.widthMm}×{oriented.heightMm} mm</li>{t.printSteps.map(step => <li key={step}>{step}</li>)}</ol>
          <p className="save-pdf-tip">{t.printTipPdf.replace("{size}", `${oriented.widthMm}×${oriented.heightMm}`)}</p>
          {pdfError && <p className="error" role="alert">{t.savePdfError}</p>}
          <fieldset className="print-items space-y-2">
            <legend>{t.printItems}</legend>
            {printDialogKeys.map((k) => (
              <CheckRow
                key={k}
                id={`print-dialog-${k}`}
                label={t[k]}
                checked={s[k]}
                onCheckedChange={(checked) => update(k, checked)}
              />
            ))}
          </fieldset>
          <CheckRow
            id="skip-print-dialog"
            label={t.skipPrint}
            checked={skip}
            onCheckedChange={(checked) => {
              setSkip(checked);
              try { localStorage.setItem("sample-envelope:skip-print-dialog", String(checked)); } catch { /* unavailable */ }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} disabled={pdfBusy}>{t.cancel}</Button>
            <Button onClick={() => void runPrint()} disabled={pdfBusy}>
              {pdfBusy ? t.savePdfWorking : t.print}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pdfUrl} onOpenChange={(open) => { if (!open) closePdfPreview(); }}>
        <DialogContent showCloseButton={false} className="pdf-viewer-dialog" aria-describedby={undefined}>
          <DialogTitle>{t.pdfPreview}</DialogTitle>
          {pdfUrl && (
            <iframe
              ref={pdfFrameRef}
              className="pdf-viewer-frame"
              title={t.pdfPreview}
              src={pdfUrl}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closePdfPreview}>{t.closePreview}</Button>
            <Button onClick={printFromPreview}>{t.print}</Button>
          </DialogFooter>
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
      <Label htmlFor={key} className="flex items-center justify-between gap-2">
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
    <div className="app-shell">
      <header className="app-header">
        <a href="#/" className="brand">
          <span className="brand-mark" aria-hidden="true">箋</span>
          <span className="brand-text">
            <strong>{t.app}</strong>
            <small>{t.brandNote}</small>
          </span>
        </a>
        <span className="header-note">{t.tagline}</span>
      </header>
      <main className="app-main">
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
                <h1>{t.app}</h1>
                <p className="lede">{t.steps[0]}</p>
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
                <section className="panel overflow-hidden">
                  <div className="border-b border-border px-6 py-4">
                    <h2 className="section-title">
                      <span className="section-index">01</span>
                      {t.recipient}
                    </h2>
                  </div>
                  <div className="fields p-6">
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
                <section className="panel overflow-hidden">
                  <div className="border-b border-border px-6 py-4">
                    <h2 className="section-title">
                      <span className="section-index">02</span>
                      {t.sender}
                    </h2>
                  </div>
                  <div className="fields p-6">
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
                  <Button type="submit" className="primary-cta">{t.next}</Button>
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
                  className={cn("size-card group")}
                  key={size.id}
                  onClick={() => go(`/editor/${size.id}`)}
                >
                  <Preview
                    draft={draft}
                    settings={defaultSettings(size, draft)}
                    thumbnail
                  />
                  <div className="card-caption">
                    <div className="card-label">
                      <strong>{size.label}</strong>{" "}
                      <span>{size.id === "custom" ? t.galleryCustom : `${t.galleryOrientation[size.defaultOrientation]}・${t.galleryWritingMode[size.defaultWritingMode]}`}</span>
                    </div>
                    <span className="text-muted-foreground text-xs font-medium tracking-wide">
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
      <footer className="app-footer">{t.footer}</footer>
    </div>
  );
}
