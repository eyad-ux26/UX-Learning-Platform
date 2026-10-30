import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, CONTENT, D, FONT, T, themeVars } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection, Tag } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconCheck, IconClock, IconLock } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";

/*
 * P14-C03 re-edit: WP 22 "when to use which" (0–87 s). The slides are replaced by an illustrative ride app in three
 * phones, one per component; Eyad's voice and camera are kept. Beat times are the clip's caption timings (seconds).
 */
const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
export const C03_FRAMES = s(87);

// ---- product geometry (content coordinates) -------------------------------------------------
const PH = { w: 270, h: 520, y: 70 };
const X = { snack: 680, banner: 365, dialog: 50 };
const BANNER_H = 96;
const phoneRect = (x: number): Rect => ({ x, y: PH.y, w: PH.w, h: PH.h });
const rowRect = (x: number, i: number, b: number): Rect => ({ x: x + 12, y: PH.y + 72 + BANNER_H * b + 80 * i, w: PH.w - 24, h: 68 });
const bannerRect = (x: number): Rect => ({ x, y: PH.y + 60, w: PH.w, h: BANNER_H });
const bannerClose = (x: number): Rect => ({ x: x + 10, y: PH.y + 60 + 8, w: 34, h: 34 });
const snackRect = (x: number): Rect => ({ x: x + 12, y: PH.y + 448, w: PH.w - 24, h: 56 });
const dialogRect = (x: number): Rect => ({ x: x + 18, y: PH.y + 168, w: PH.w - 36, h: 184 });
const keepBtn = (x: number): Rect => ({ x: x + 18 + 120, y: PH.y + 168 + 136, w: 80, h: 36 });
const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const rel = (r: Rect, x: number): React.CSSProperties => ({ position: "absolute", left: r.x - x, top: r.y - PH.y, width: r.w, height: r.h });

const RIDES = [
  ["البيت إلى العمل", "اليوم، 8:40 ص"],
  ["العمل إلى النادي", "أمس، 6:15 م"],
  ["المطار إلى البيت", "الأحد، 11:05 م"],
];

type PhoneState = { banner?: number; snack?: number; snackTimer?: number; dialog?: number; pressed?: number; pressRow?: number };

const Phone: React.FC<{ x: number; st: PhoneState }> = ({ x, st }) => {
  const b = st.banner ?? 0;
  return (
    <div dir="rtl" style={{ position: "absolute", left: x, top: PH.y, width: PH.w, height: PH.h, borderRadius: 30, background: "#FFFFFF", border: `2px solid ${C.border}`, boxShadow: T.shadow.viewport, overflow: "hidden", fontFamily: FONT, boxSizing: "border-box" }}>
      <div style={{ height: 60, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", padding: "0 18px", fontSize: 22, fontWeight: 700 }}>مشاويري</div>
      {b > 0 ? (
        <div style={{ ...rel(bannerRect(x), x), height: BANNER_H * b, overflow: "hidden", background: "#FFF6DB", borderBottom: "1px solid #EFD88F" }}>
          <div style={{ position: "absolute", right: 16, left: 50, top: 12, fontSize: 16, lineHeight: 1.4, color: C.text, fontWeight: 600 }}>أكّد بريدك لتصلك إيصالات المشاوير.</div>
          <div style={{ position: "absolute", right: 16, bottom: 10, fontSize: 16, fontWeight: 700, color: D.brand }}>أكّد الآن</div>
          <div style={{ ...rel(bannerClose(x), x), top: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.textMuted }}>✕</div>
        </div>
      ) : null}
      {RIDES.map(([t, m], i) => {
        const r = rowRect(x, i, b);
        const p = st.pressRow === i ? st.pressed ?? 0 : 0;
        return (
          <div key={t} style={{ ...rel(r, x), borderRadius: 14, background: p > 0 ? `rgba(14,124,107,${0.14 * p})` : C.surfaceAlt, padding: "10px 14px", boxSizing: "border-box" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{t}</div>
            <div style={{ fontSize: 14, color: C.textMuted, marginTop: 2 }}>{m}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 12, right: 12, top: 72 + BANNER_H * b + 248, height: 50, borderRadius: 14, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>اطلب مشوارًا</div>
      {(st.snack ?? 0) > 0 ? (
        <div style={{ ...rel(snackRect(x), x), borderRadius: 12, background: "#22262F", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontSize: 16, boxSizing: "border-box", opacity: st.snack, translate: `0px ${(1 - (st.snack ?? 0)) * 40}px`, overflow: "hidden" }}>
          <span style={{ fontWeight: 600 }}>حُفظ المكان في المفضّلة</span>
          <span style={{ fontWeight: 700, color: "#7FE0CD" }}>تراجع</span>
          {st.snackTimer !== undefined ? <div style={{ position: "absolute", right: 0, bottom: 0, height: 4, width: `${(1 - st.snackTimer) * 100}%`, background: "#7FE0CD" }} /> : null}
        </div>
      ) : null}
      {(st.dialog ?? 0) > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(16,18,24,0.48)", opacity: st.dialog }} />
          <div style={{ ...rel(dialogRect(x), x), borderRadius: 18, background: "#FFFFFF", padding: "18px 18px", boxSizing: "border-box", opacity: st.dialog, scale: String(0.92 + 0.08 * (st.dialog ?? 0)), boxShadow: "0 16px 36px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>إلغاء المشوار؟</div>
            <div style={{ fontSize: 15, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>السائق في طريقه إليك الآن.</div>
          </div>
          <div style={{ ...rel(keepBtn(x), x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: D.brand, opacity: st.dialog }}>لا، أكمل</div>
          <div style={{ position: "absolute", left: 18 + 14, top: 168 + 136, width: 104, height: 36, borderRadius: 10, background: D.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: D.onBrand, opacity: st.dialog }}>إلغاء المشوار</div>
        </>
      ) : null}
    </div>
  );
};

/** Priority as 1–3 filled bars. */
const Bars: React.FC<{ n: number; color?: string; size?: number }> = ({ n, color = C.select, size = 1 }) => (
  <span dir="ltr" style={{ display: "inline-flex", alignItems: "flex-end", gap: 4 * size, height: 26 * size }}>
    {[1, 2, 3].map((i) => (
      <span key={i} style={{ width: 8 * size, height: (8 + i * 6) * size, borderRadius: 3, background: i <= n ? color : C.border }} />
    ))}
  </span>
);

/** One short observation on the free (left) side of the content area. */
const SideNote: React.FC<{ y: number; text: string; p: number; icon?: React.ReactNode; big?: boolean }> = ({ y, text, p, icon, big }) => {
  if (p <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: 34, width: 400, top: y, opacity: p, translate: `${(1 - p) * -16}px 0px`, background: C.note, color: C.noteText, borderRadius: T.radius.md, boxShadow: T.shadow.note, padding: big ? "22px 26px" : "18px 24px", fontFamily: FONT, display: "flex", alignItems: "center", gap: 14, boxSizing: "border-box" }}>
      {icon ? <span style={{ width: 48, height: 48, borderRadius: 14, background: C.select, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span> : null}
      <span style={{ fontSize: big ? 36 : 30, fontWeight: 600, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
};

/** Component name + priority chip above a phone. */
const NameChip: React.FC<{ x: number; name: string; prio: string; n: number; p: number; q: number }> = ({ x, name, prio, n, p, q }) => {
  if (p <= 0) return null;
  return (
    <div style={{ ...themeVars(1), position: "absolute", left: x, width: PH.w, top: 14, height: 44, display: "flex", justifyContent: "center", opacity: p, translate: `0px ${(1 - p) * 10}px` }}>
      <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 16px", borderRadius: T.radius.pill, background: C.selectSoft, border: `2px solid ${C.select}`, color: C.select, fontFamily: FONT, fontSize: 22, fontWeight: 700, whiteSpace: "nowrap", boxSizing: "border-box" }}>
        <span dir="ltr">{name}</span>
        {q > 0 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: q, maxWidth: 160 * q, overflow: "hidden" }}>
            <Bars n={n} size={0.8} />
            {prio}
          </span>
        ) : null}
      </div>
    </div>
  );
};

/** Closing comparison table. */
const COLS = [
  { k: "name", title: "المكوّن", w: 270 },
  { k: "prio", title: "الأولوية", w: 270 },
  { k: "close", title: "يُغلق عندما", w: 340 },
];
const ROWS = [
  { name: "Snackbar", n: 1, prio: "منخفضة", close: "يختفي وحده بعد ثوانٍ" },
  { name: "Banner", n: 2, prio: "متوسطة", close: "يغلقه المستخدم" },
  { name: "Dialog", n: 3, prio: "الأعلى", close: "يختار المستخدم Action" },
];
const TBL = { x: 60, y: 56, head: 64, row: 112 };
const colRect = (i: number): Rect => {
  const right = TBL.x + 880 - COLS.slice(0, i).reduce((a, c) => a + c.w, 0);
  return { x: right - COLS[i].w, y: TBL.y, w: COLS[i].w, h: TBL.head + TBL.row * 3 };
};
const Table: React.FC<{ p: number; rows: number[] }> = ({ p, rows }) => {
  if (p <= 0) return null;
  return (
    <div dir="rtl" style={{ position: "absolute", left: TBL.x, top: TBL.y, width: 880, opacity: p, fontFamily: FONT, borderRadius: 22, background: C.surface, border: `2px solid ${C.border}`, overflow: "hidden", boxShadow: T.shadow.viewport }}>
      <div style={{ display: "flex", height: TBL.head, background: C.surfaceAlt, borderBottom: `2px solid ${C.border}` }}>
        {COLS.map((c) => (
          <div key={c.k} style={{ width: c.w, padding: "0 26px", display: "flex", alignItems: "center", fontSize: 26, fontWeight: 700, color: C.textMuted, boxSizing: "border-box" }}>{c.title}</div>
        ))}
      </div>
      {ROWS.map((r, i) => (
        <div key={r.name} style={{ display: "flex", height: TBL.row, borderTop: i ? `1px solid ${C.border}` : undefined, opacity: rows[i], translate: `${(1 - rows[i]) * -30}px 0px` }}>
          <div dir="ltr" style={{ width: COLS[0].w, padding: "0 26px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 34, fontWeight: 700, color: C.text, boxSizing: "border-box" }}>{r.name}</div>
          <div style={{ width: COLS[1].w, padding: "0 26px", display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 600, color: C.text, boxSizing: "border-box" }}>
            <Bars n={r.n} />
            {r.prio}
          </div>
          <div style={{ width: COLS[2].w, padding: "0 26px", display: "flex", alignItems: "center", fontSize: 28, color: C.text, boxSizing: "border-box" }}>{r.close}</div>
        </div>
      ))}
    </div>
  );
};

export const C03: React.FC = () => {
  const frame = useCurrentFrame();
  const at = (sec: number) => s(sec);

  // beats (seconds, from the clip's caption timing)
  const tSnackIn = at(9.0), tBannerIn = at(10.0), tDialogIn = at(11.4), tPrio = at(13.1);
  const tDialog = at(17.9), tDlgNote = at(23.7), tDlgTap = at(25.6), tHigh = at(29.3);
  const tBanner = at(32.0), tBanNote = at(33.4), tBanTap = at(38.2), tBanNote2 = at(42.3);
  const tSnack = at(45.8), tSnackShow = at(47.2), tSnackGone = at(51.2), tSnackNote = at(48.2), tAuto = at(51.9);
  const tCompare = at(52.0), tSnack2 = at(53.6), tSnack2Gone = at(57.6), tBanX = at(59.6);
  const tDlgClose = at(64.3), tKeep = at(66.2);
  const tTable = at(67.8), tColPrio = at(75.8), tEnd = at(81.8);

  // ---- product state ------------------------------------------------------------------------
  const snackOverview = enter(frame, tSnackIn) * exit(frame, tSnack, 8);
  const snackFocus = enter(frame, tSnackShow) * exit(frame, tSnackGone, 10);
  const snackCompare = enter(frame, tSnack2) * exit(frame, tSnack2Gone, 10);
  const snack: PhoneState = {
    snack: Math.max(snackOverview, snackFocus, snackCompare),
    snackTimer:
      frame >= tSnack2 ? Math.min(1, (frame - tSnack2) / (tSnack2Gone - tSnack2)) : frame >= tSnackShow ? Math.min(1, (frame - tSnackShow) / (tSnackGone - tSnackShow)) : undefined,
  };
  const banner: PhoneState = {
    banner: enter(frame, tBannerIn, 14) * exit(frame, tBanX + 4, 10) + (frame > tBanX + 4 ? enter(frame, at(63.0), 14) * 0 : 0),
    pressed: span(frame, tBanTap - 2, tBanTap + 14, 4),
    pressRow: 0,
  };
  const dialog: PhoneState = {
    dialog: enter(frame, tDialogIn) * exit(frame, tKeep + 4, 6),
    pressed: span(frame, tDlgTap - 2, tDlgTap + 8, 4) * 0, // the tap behind the dialog does nothing
    pressRow: 0,
  };
  const phonesOut = exit(frame, tTable, 14);

  // ---- camera -----------------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [
    { f: 0, ...overview },
    { f: tDialog, s: 1.55, ...{ fx: mid(dialogRect(X.dialog)).x, fy: mid(dialogRect(X.dialog)).y - 20 }, cx: 690, cy: CONTENT.h / 2 },
    { f: tBanner, s: 1.55, fx: X.banner + PH.w / 2, fy: PH.y + 190, cx: 690, cy: 330 },
    { f: tSnack, s: 1.55, fx: X.snack + PH.w / 2, fy: PH.y + 420, cx: 690, cy: 380 },
    { f: tCompare, ...overview, cx: CONTENT.w / 2, cy: CONTENT.h / 2 },
  ];
  const cam = cameraAt(frame, shots);

  const mode: DebugMode = frame < tDialog ? "live" : frame < tCompare ? "inspect" : "compare";

  // ---- focus dim --------------------------------------------------------------------------
  const focusRect: Rect =
    frame < tBanner ? phoneRect(X.dialog) : frame < tSnack ? phoneRect(X.banner) : frame < tDlgClose - 6 && frame >= tCompare ? { x: X.banner, y: PH.y, w: X.snack + PH.w - X.banner, h: PH.h } : frame >= tDlgClose - 6 ? phoneRect(X.dialog) : phoneRect(X.snack);
  const dim =
    (enter(frame, tDialog, 12) * exit(frame, tTable, 10)) *
    (frame >= tCompare - 6 && frame < tCompare + 14 ? Math.abs(frame - (tCompare + 4)) / 10 : 1) *
    (frame >= tDlgClose - 10 && frame < tDlgClose + 4 ? Math.abs(frame - (tDlgClose - 3)) / 7 : 1);

  // ---- pointers ---------------------------------------------------------------------------
  const behind = camPoint(mid(rowRect(X.dialog, 0, 0)), cameraAt(tDlgTap, shots));
  const banRow = camPoint(mid(rowRect(X.banner, 0, 1)), cameraAt(tBanTap, shots));
  const banX = camPoint(mid(bannerClose(X.banner)), cameraAt(tBanX, shots));
  const keep = camPoint(mid(keepBtn(X.dialog)), cameraAt(tKeep, shots));
  const touches: { keys: Key[]; from: number; to: number }[] = [
    { keys: [{ f: tDlgTap - 22, x: behind.x - 80, y: behind.y + 120 }, { f: tDlgTap, ...behind, click: true }, { f: tDlgTap + 30, ...behind }], from: tDlgTap - 24, to: tDlgTap + 40 },
    { keys: [{ f: tBanTap - 22, x: banRow.x - 60, y: banRow.y + 150 }, { f: tBanTap, ...banRow, click: true }, { f: tBanTap + 30, ...banRow }], from: tBanTap - 24, to: tBanTap + 40 },
    { keys: [{ f: tBanX - 22, x: banX.x + 40, y: banX.y + 160 }, { f: tBanX, ...banX, click: true }, { f: tBanX + 24, ...banX }], from: tBanX - 24, to: tBanX + 34 },
    { keys: [{ f: tKeep - 22, x: keep.x + 60, y: keep.y + 140 }, { f: tKeep, ...keep, click: true }, { f: tKeep + 24, ...keep }], from: tKeep - 24, to: tKeep + 34 },
  ];

  // ---- overlays (content-area screen space) -------------------------------------------------
  const selDialog = enter(frame, tDialog + 14, 10) * exit(frame, tBanner - 8, 8);
  const selBanner = enter(frame, tBanner + 16, 10) * exit(frame, tSnack - 8, 8);
  const selSnack = enter(frame, tSnackShow + 6, 10) * exit(frame, tSnackGone, 8);
  const ws = (x: React.ReactNode) => <span style={{ color: "#012E4B", display: "inline-flex" }}>{x}</span>;
  const blocked = camPoint({ x: mid(rowRect(X.dialog, 0, 0)).x, y: rowRect(X.dialog, 0, 0).y }, cameraAt(tDlgTap, shots));

  const overlay = (
    <>
      <FocusDim r={camRect(focusRect, cam)} amount={dim} pad={8} />
      <Selection r={camRect(dialogRect(X.dialog), cam)} hover={selDialog} selected={selDialog} label="Modal dialog" />
      <Selection r={camRect(bannerRect(X.banner), cam)} hover={selBanner} selected={selBanner} label="Banner" />
      <Selection r={camRect(snackRect(X.snack), cam)} hover={selSnack} selected={selSnack} label="Snackbar" />

      <SideNote y={150} text="يوقف كل شيء حتى يُغلق" p={span(frame, tDlgNote, tHigh)} icon={<IconLock color="#012E4B" size={30} stroke={2.4} />} />
      <Tag r={{ x: 0, y: blocked.y + 40, w: 0, h: 0 }} x={blocked.x - 330} text="لا شيء يحدث" tone="warn" progress={span(frame, tDlgTap + 4, tDlgTap + 50)} />
      <SideNote y={210} text="أولوية عالية" p={span(frame, tHigh, tBanner)} icon={<Bars n={3} color="#012E4B" />} big />

      <SideNote y={130} text="أولوية متوسطة: ظاهر في الأعلى" p={span(frame, tBanNote, tBanNote2)} icon={<Bars n={2} color="#012E4B" />} />
      <Tag r={{ x: banRow.x - 110, y: banRow.y + 64, w: 0, h: 0 }} text="المحتوى ما زال متاحًا" progress={span(frame, tBanTap + 6, tBanNote2 + 10)} icon={IconCheck} />
      <SideNote y={130} text="مهم، لكن لا يوقف المستخدم" p={span(frame, tBanNote2, tSnack)} />

      <SideNote y={250} text="أولوية منخفضة" p={span(frame, tSnackNote, tAuto)} icon={<Bars n={1} color="#012E4B" />} big />
      <SideNote y={250} text="يختفي وحده، دون أي تفاعل" p={span(frame, tAuto, tCompare + 4)} icon={ws(<IconClock color="#012E4B" size={30} stroke={2.4} />)} />

      <Tag r={camRect({ x: X.snack + 40, y: PH.y + 410, w: 0, h: 0 }, cam)} text="يختفي وحده" progress={span(frame, tSnack2 + 8, tDlgClose)} icon={IconClock} />
      <Tag r={camRect({ x: X.banner + 30, y: PH.y + 490, w: 0, h: 0 }, cam)} text="يبقى حتى يُغلق" tone="warn" progress={span(frame, tSnack2 + 20, tBanX + 2)} />
      <Tag r={camRect({ x: X.banner + 30, y: PH.y + 490, w: 0, h: 0 }, cam)} text="أغلقه المستخدم" progress={span(frame, tBanX + 14, tDlgClose)} icon={IconCheck} />
      <Tag r={camRect({ x: X.dialog + 30, y: PH.y + 410, w: 0, h: 0 }, cam)} text="يُغلق بـ Action فقط" tone="warn" progress={span(frame, tDlgClose + 6, tTable)} />

      {touches.map((t, i) => (
        <UserTouch key={i} frame={frame} keys={t.keys} from={t.from} to={t.to} />
      ))}

      <Table p={enter(frame, tTable + 8, 16)} rows={[enter(frame, at(69.0)), enter(frame, at(70.6)), enter(frame, at(72.2))]} />
      <Selection r={{ ...colRect(1), y: colRect(1).y + 4, h: colRect(1).h - 8 }} hover={span(frame, tColPrio, tEnd)} selected={span(frame, tColPrio, tEnd)} />
      <div dir="rtl" style={{ position: "absolute", left: 0, right: 0, top: TBL.y + TBL.head + TBL.row * 3 + 40, display: "flex", justifyContent: "center", opacity: enter(frame, tEnd), translate: `0px ${(1 - enter(frame, tEnd)) * 12}px` }}>
        <div style={{ background: C.note, color: C.noteText, borderRadius: T.radius.md, padding: "16px 28px", fontSize: 30, fontWeight: 600, fontFamily: FONT, boxShadow: T.shadow.note }}>اختر حسب الأهمية، دون إزعاج المستخدم</div>
      </div>
    </>
  );

  const nameIn = (t: number) => enter(frame, t) * phonesOut;
  const prioIn = (i: number) => enter(frame, tPrio + 8 + i * 12, 14);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <DebuggerShell mode={mode} address="rides.app" illustrative overlay={overlay}>
        <div style={{ ...camStyle(cam), opacity: phonesOut }}>
          <Phone x={X.dialog} st={dialog} />
          <Phone x={X.banner} st={banner} />
          <Phone x={X.snack} st={snack} />
          <div style={{ opacity: exit(frame, tDialog, 10) + enter(frame, tCompare, 12) * (frame >= tCompare ? 1 : 0) }}>
            <NameChip x={X.snack} name="Snackbar" prio="منخفضة" n={1} p={nameIn(tSnackIn)} q={prioIn(0)} />
            <NameChip x={X.banner} name="Banner" prio="متوسطة" n={2} p={nameIn(tBannerIn)} q={prioIn(1)} />
            <NameChip x={X.dialog} name="Dialog" prio="عالية" n={3} p={nameIn(tDialogIn)} q={prioIn(2)} />
          </div>
        </div>
      </DebuggerShell>

      {/* presenter: Eyad's own camera from the original recording */}
      <div style={{ position: "absolute", left: 40, top: 24, width: 236, height: 160, borderRadius: 20, overflow: "hidden", boxShadow: T.shadow.viewport, border: `2px solid ${C.border}`, background: "#000" }}>
        <OffthreadVideo src={staticFile("c03/cam.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div dir="rtl" style={{ position: "absolute", right: 8, bottom: 8, height: 30, padding: "0 12px", borderRadius: 999, background: "rgba(23,26,33,0.78)", color: "#FFFFFF", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center" }}>إياد محمود</div>
      </div>
      <div dir="rtl" style={{ position: "absolute", left: 300, right: 40, top: 40, textAlign: "right" }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.text }}>متى تستخدم أيّ رسالة؟</div>
        <div dir="ltr" style={{ fontSize: 26, fontWeight: 600, color: C.textMuted, marginTop: 10, textAlign: "right" }}>Snackbar · Banner · Dialog</div>
      </div>
      <Audio src={staticFile("c03/voice.m4a")} />
    </AbsoluteFill>
  );
};
