import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camRect, camPoint, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconBall, IconBulb, IconCheck, IconClock, IconClose, IconSearch } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { CaseChip, clipFrames, IntroCard, L, loc, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, SideNote, TitleBand, cutSec, cutsOf, vCut, Voice, wi } from "./p14";
import { Panel, R } from "./ctl";

/*
 * P14-C07 re-edit: WP 23 "search suggestions". Follows the source slides in order: suggestions in a compact list
 * (tap, then typing "bask..."), the definition, the three benefits (good results, interaction cost, typos), tip 1
 * "don't suggest bad results" (a suggestion that returns 2 unrelated results), tip 2 "typed vs suggested" with the
 * basketball / hoop diagram, case 1 "ux d" (completions: highlight the suggested characters) and case 2
 * "heuristics usa" (query anywhere: highlight the user's text). Times are raw voice seconds; vc() maps them past the cuts.
 */
const VOICE = 386.05;
const vc = vCut("c07");
const VOICE_CUT = cutSec(VOICE, cutsOf("c07"));
export const C07_FRAMES = clipFrames(VOICE_CUT);

const searchRect = L(14, 14, PH.w - 28, 46);
const ROW = 46;
const TOP = 70;
const listRect = (n: number, top = TOP): Rect => L(14, top, PH.w - 28, ROW * n);
const rowRect = (i: number, top = TOP): Rect => L(14, top + ROW * i, PH.w - 28, ROW);
const DIAG: R = { x: 470, y: 90, w: 500, h: 420 };

type Part = { t: string; b?: boolean };
/** One suggestion row, left to right like the source: parts in bold are the highlighted ones. */
const Row: React.FC<{ i: number; parts: Part[]; top?: number; o?: number; icon?: "search" | "clock" }> = ({ i, parts, top = TOP, o = 1, icon = "search" }) => (
  <div dir="ltr" style={{ ...loc(rowRect(i, top)), display: "flex", alignItems: "center", gap: 10, padding: "0 12px", fontSize: 19, borderBottom: `1px solid ${C.border}`, opacity: o, background: "#FFFFFF", color: "#1F2328", whiteSpace: "nowrap", overflow: "hidden" }}>
    {icon === "clock" ? <IconClock color="#8A929E" size={17} /> : <IconSearch color="#8A929E" size={17} />}
    <span>
      {parts.map((p, k) => (
        <span key={k} style={{ fontWeight: p.b ? 800 : 400 }}>{p.t}</span>
      ))}
    </span>
  </div>
);
const plain = (t: string): Part[] => [{ t }];

/** Results list: a count line and simple product cards. */
const Results: React.FC<{ head: string; items: { t: string; tone: string }[]; o: number }> = ({ head, items, o }) => (
  <div style={{ position: "absolute", top: 72, left: 14, right: 14, display: "flex", flexDirection: "column", gap: 10, opacity: o }}>
    <div dir="ltr" style={{ fontSize: 15, fontWeight: 700, color: "#6B7280", textAlign: "left" }}>{head}</div>
    {items.map((it) => (
      <div key={it.t} dir="ltr" style={{ height: 70, borderRadius: 12, background: "#F5F7FA", display: "flex", alignItems: "center", gap: 12, padding: "0 12px", fontSize: 16, fontWeight: 700, color: "#1F2328" }}>
        <span style={{ width: 46, height: 46, borderRadius: 10, background: it.tone, flexShrink: 0 }} />
        {it.t}
      </div>
    ))}
  </div>
);

const BALL = ["basketball", "basketball hoop", "basketball shoes", "basketball jersey"];
const HOOPS = [{ t: "Outdoor basketball hoop", tone: "#F4D6C4" }, { t: "Wall basketball hoop", tone: "#D6E6F2" }, { t: "Mini basketball hoop", tone: "#E0EBD3" }];
const UXD = ["ux design", "ux designer", "ux design course", "ux design jobs", "ux design portfolio", "ux design for beginners", "ux design process", "ux design tools"];
const HEUR = ["10 heuristics usability", "heuristics usability examples", "list of heuristics usability"];

export const C07: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    tap: vc(7.6), drop: vc(10.6), typeAt: vc(18.2), helps: vc(22.1), tips: vc(28.0),
    def: vc(37.95), pick: vc(47.1), own: vc(70.5), good: vc(79.7), cost: vc(88.9), few: vc(97.2), typo: vc(110.1), sum: vc(124.6),
    g1: vc(143.0), badTap: vc(146.0), designer: vc(155.1), giveUp: vc(167.1),
    g2: vc(174.3), ex: vc(190.5), hoop: vc(193.3), q: vc(204.6), think: vc(224.0),
    cases: vc(243.2), case1: vc(245.6), case2: vc(264.3),
    c1: vc(290.3), uxd: vc(302.7), c1Hl: vc(315.3), c1Why: vc(322.2), c1Fast: vc(333.8),
    c2: vc(347.2), c2Move: vc(355.6), c2Hl: vc(368.1), wrap: vc(376.2),
  };
  const END = vc(VOICE) + 6;

  type Scene = "home" | "own" | "good" | "list" | "bad" | "diag" | "uxd" | "heur";
  const scene: Scene =
    f < B.own ? "home" : f < B.good ? "own" : f < B.cost ? "good" : f < B.g1 ? "list" : f < B.g2 ? "bad" : f < B.c1 ? "diag" : f < B.c2 ? "uxd" : "heur";
  const sceneCuts = [B.own, B.good, B.cost, B.g1, B.g2, B.c1, B.c2];
  const fade = Math.min(...sceneCuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  const typeOut = (q: string, at: number, per = 5) => q.slice(0, Math.max(0, Math.min(q.length, Math.floor((f - at) / per))));
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const mode: DebugMode = f < B.tap ? "live" : "inspect";
  const showPhone = scene !== "diag";

  const homeQ = f < B.typeAt ? "" : typeOut("bask", B.typeAt + 10, 8);
  const query =
    scene === "home" ? (f >= B.pick + 36 ? "basketball hoop" : homeQ)
    : scene === "own" ? typeOut("outdoor hoop basket", B.own + 6, 4)
    : scene === "good" ? "basketball hoop"
    : scene === "list" ? (f < B.typo ? typeOut("bas", B.cost + 20, 10) : typeOut("baske", B.typo + 10, 10))
    : scene === "bad" ? (f < B.badTap ? typeOut("luggage", B.g1 + 6, 6) : "luggage sets clearance")
    : scene === "uxd" ? typeOut("ux d", B.c1 + 10, 10)
    : "heuristics usa";

  const homeList = scene === "home" && f >= B.drop && f < B.pick + 40;
  const homeItems = homeQ.length === 0 ? ["basketball", "running shoes", "travel bag"] : BALL;

  const tap = (at: number, r: Rect) => {
    const p = camPoint(mid(r), cam);
    return { keys: [{ f: at - 16, x: p.x - 40, y: p.y + 120 }, { f: at, ...p, click: true }, { f: at + 16, ...p }] as Key[], from: at - 18, to: at + 24 };
  };
  const touches = [tap(B.tap, searchRect), tap(B.pick + 30, rowRect(1)), tap(B.badTap - 4, rowRect(0))];
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const dim = Math.max(span(f, B.drop + 20, B.def), span(f, B.c1Hl, B.c2), span(f, B.c2Hl, B.wrap)) * 0.85;

  const dTyped = enter(f, B.ex, 12);
  const dSugg = enter(f, B.hoop, 12);
  const dQ = span(f, B.q, B.cases);
  const dCases = span(f, B.cases, B.c1);

  const overlay = (
    <>
      {showPhone ? <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} /> : null}

      <SideNote y={110} text="Search suggestions تظهر وهو يكتب" p={span(f, B.drop, B.def)} big icon={wi(IconSearch)} />
      <SideNote y={250} text="قائمة قصيرة ومنظمة تحت شريط البحث" p={span(f, B.drop + 30, B.helps)} />
      <SideNote y={250} text="تسهّل عملية البحث كثيرًا" p={span(f, B.helps, B.def)} icon={wi(IconCheck)} />
      <SideNote y={390} text="نصائح تجعلها أفضل" p={span(f, B.tips, B.def)} icon={wi(IconBulb)} />
      <Selection r={camRect(listRect(homeItems.length), cam)} hover={sel(B.drop + 20, B.def)} selected={sel(B.drop + 20, B.def)} label="Suggestions" labelSide="below" />

      <SideNote y={110} text="Queries مقترحة في dropdown أثناء الكتابة" p={span(f, B.def, B.pick)} big />
      <SideNote y={250} text="ليختار منها بدل أن يكمل بنفسه" p={span(f, B.def + 60, B.pick)} />

      <CaseChip y={40} text="لماذا تفيد؟" p={span(f, B.pick, B.g1)} />
      <SideNote y={110} text="يختار Term مناسب يعطيه نتائج جيدة" p={span(f, B.pick, B.cost)} icon={wi(IconCheck)} />
      <SideNote y={250} text="لو كتب بنفسه قد لا يجد نتائج، أو يجد نتائج قليلة" p={span(f, B.own, B.good)} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="أما الاقتراح فغالبًا له نتائج جيدة في المنتج" p={span(f, B.good, B.cost)} icon={wi(IconCheck)} />
      <SideNote y={110} text="Interaction cost أقل" p={span(f, B.cost, B.typo)} big icon={wi(IconClock)} />
      <SideNote y={250} text="يكتب بضعة حروف ثم يختار مباشرة" p={span(f, B.few, B.typo)} />
      <SideNote y={110} text="ويتجنب الأخطاء الإملائية" p={span(f, B.typo, B.sum)} big />
      <SideNote y={250} text="الخطأ الإملائي قد يعطيه نتائج لا يريدها أو لا شيء" p={span(f, B.typo + 40, B.sum)} />
      <SideNote y={110} text="نتائج جيدة · جهد أقل · أخطاء أقل" p={span(f, B.sum, B.g1)} big icon={wi(IconCheck)} />

      <CaseChip y={40} text="Tip 1" p={span(f, B.g1, B.g2)} />
      <SideNote y={110} text="لا تقترح ما ليس له نتائج جيدة" p={span(f, B.g1, B.g2)} big icon={wi(IconAlert)} />
      <Selection r={camRect(L(14, 72, PH.w - 28, 190), cam)} hover={sel(B.badTap + 30, B.designer)} selected={sel(B.badTap + 30, B.designer)} label="نتيجتان فقط" labelSide="below" />
      <SideNote y={250} text="يختار الاقتراح فيجد نتيجتين لا علاقة لهما بما يريد" p={span(f, B.badTap + 20, B.designer)} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="لاحظت المشكلة كمصمم؟ نبّه لإصلاحها" p={span(f, B.designer, B.giveUp)} />
      <SideNote y={250} text="تقل ثقته، وغالبًا لن يحاول مرة أخرى" p={span(f, B.giveUp, B.g2)} warn />

      <CaseChip y={40} text="Tip 2" p={span(f, B.g2, B.c1)} />
      <SideNote y={110} text="ميّز بين ما كتبه وما اقترحه الموقع" p={span(f, B.g2, B.q)} big />
      <SideNote y={250} text="ما كتبه هو typed، والتكملة suggested" p={span(f, B.ex, B.q)} />
      <SideNote y={110} text="أيّ جزء نجعله highlighted؟" p={span(f, B.q, B.cases)} big />
      <SideNote y={250} text="فكّر دقيقة قبل الإجابة" p={span(f, B.think, B.cases)} icon={wi(IconBulb)} />
      <SideNote y={110} text="الإجابة تعتمد على نوع الاقتراحات" p={span(f, B.cases, B.c1)} big />
      <SideNote y={250} text="الأولى: كلها تكمل ما كتبه" p={span(f, B.case1, B.c1)} />
      <SideNote y={390} text="الثانية: ما كتبه في أي موضع منها" p={span(f, B.case2, B.c1)} />

      <CaseChip y={40} text="الحالة 1" p={span(f, B.c1, B.c2)} />
      <SideNote y={110} text="الاقتراحات تكمل ما كتبه" p={span(f, B.c1, B.c1Hl)} big />
      <SideNote y={250} text="كتب ux d، وكل الاقتراحات تبدأ بها" p={span(f, B.uxd, B.c1Hl)} />
      <SideNote y={110} text="ميّز الحروف المقترحة" p={span(f, B.c1Hl, B.c2)} big icon={wi(IconCheck)} />
      <SideNote y={250} text="ما كتبه في نفس المكان دائمًا، فلا يحتاج تمييزًا" p={span(f, B.c1Why, B.c2)} />
      <SideNote y={390} text="فيرى التكملة أسرع ويختار أسرع" p={span(f, B.c1Fast, B.c2)} icon={wi(IconClock)} />

      <CaseChip y={40} text="الحالة 2" p={span(f, B.c2, END)} />
      <SideNote y={110} text="ما كتبه قد يأتي في الأول أو الوسط أو الآخر" p={span(f, B.c2, B.c2Hl)} big />
      <SideNote y={250} text="موضعه يتغيّر من اقتراح لآخر" p={span(f, B.c2Move, B.c2Hl)} />
      <SideNote y={110} text="ميّز ما كتبه هو" p={span(f, B.c2Hl, B.wrap)} big icon={wi(IconCheck)} />
      <SideNote y={250} text="فيرى موضعه بسرعة، وما قبله وما بعده" p={span(f, B.c2Hl + 20, B.wrap)} />
      <SideNote y={110} text="اقتراحات جيدة تجعل البحث فعّالًا" p={span(f, B.wrap, END)} big />

      {/* Tip 2 diagram card, drawn in place of the phone */}
      <Panel r={DIAG} o={scene === "diag" ? fade : 0}>
        <div dir="ltr" style={{ position: "relative", height: 380 }}>
          <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", fontSize: 58, fontWeight: 500, letterSpacing: 1, opacity: dTyped * (1 - dQ) * (1 - dCases) }}>
            <span style={{ position: "relative" }}>
              basketball
              <span style={{ position: "absolute", left: 0, right: 0, top: -52, textAlign: "center", fontSize: 24, fontWeight: 700, color: "#9D2C6B" }}>typed</span>
              <span style={{ position: "absolute", left: 4, right: 4, top: -14, height: 12, borderTop: "3px solid #9D2C6B", borderLeft: "3px solid #9D2C6B", borderRight: "3px solid #9D2C6B", borderRadius: "10px 10px 0 0" }} />
            </span>{" "}
            <span style={{ position: "relative", opacity: dSugg }}>
              hoop
              <span style={{ position: "absolute", left: -30, right: -30, top: -52, textAlign: "center", fontSize: 24, fontWeight: 700, color: "#2E7D6B" }}>suggested</span>
              <span style={{ position: "absolute", left: 4, right: 4, top: -14, height: 12, borderTop: "3px solid #2E7D6B", borderLeft: "3px solid #2E7D6B", borderRight: "3px solid #2E7D6B", borderRadius: "10px 10px 0 0" }} />
            </span>
          </div>
          <div style={{ position: "absolute", top: 40, left: 20, right: 20, display: "flex", flexDirection: "column", gap: 22, opacity: dQ }}>
            {[
              { k: "A", parts: [{ t: "basketball", b: true }, { t: " hoop" }] },
              { k: "B", parts: [{ t: "basketball " }, { t: "hoop", b: true }] },
            ].map((o) => (
              <div key={o.k} style={{ height: 92, borderRadius: 16, border: "2px solid #D0D5DD", display: "flex", alignItems: "center", gap: 18, padding: "0 22px", fontSize: 36 }}>
                <span style={{ width: 44, height: 44, borderRadius: 22, background: "#EEF1F5", fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{o.k}</span>
                <span>{o.parts.map((p, i) => <span key={i} style={{ fontWeight: p.b ? 800 : 400 }}>{p.t}</span>)}</span>
              </div>
            ))}
            <div dir="rtl" style={{ fontSize: 24, fontWeight: 700, color: "#6B7280", textAlign: "center" }}>أيّ جزء يكون highlighted؟</div>
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 14, opacity: dCases }}>
            {[
              { h: "1", p: span(f, B.case1, B.c1), rows: ["basketball hoop", "basketball shoes", "basketball jersey"] },
              { h: "2", p: span(f, B.case2, B.c1), rows: ["10 heuristics usability", "heuristics usability examples", "list of heuristics usability"] },
            ].map((c) => (
              <div key={c.h} style={{ position: "relative", borderRadius: 14, border: "2px solid #D0D5DD", padding: "10px 14px 10px 66px", opacity: c.p, fontSize: 21, lineHeight: "36px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: "#EEF1F5", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", left: 14, top: 14 }}>{c.h}</div>
                {c.rows.map((r) => (
                  <div key={r} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  const heurBar = (
    <div dir="ltr" style={{ ...loc(searchRect), display: "flex", alignItems: "stretch", borderRadius: 10, overflow: "hidden", border: `2px solid ${D.brand}`, background: "#FFFFFF" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 17, color: "#1F2328" }}>{query}</div>
      <div style={{ width: 30, display: "flex", alignItems: "center", justifyContent: "center" }}><IconClose color="#1F2328" size={16} /></div>
      <div style={{ width: 72, background: D.brand, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>Search</div>
    </div>
  );
  const searchBar =
    scene === "heur" ? heurBar : (
      <div dir="ltr" style={{ ...loc(searchRect), borderRadius: 23, border: `2px solid ${f >= B.tap ? D.brand : C.border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", fontSize: 18, fontWeight: 600, color: "#1F2328", background: "#FFFFFF" }}>
        <IconSearch color="#8A929E" size={20} />
        {query || <span style={{ color: "#8A929E", fontWeight: 400 }}>Search</span>}
      </div>
    );

  const tiles = (
    <div style={{ position: "absolute", top: 76, left: 14, right: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {["#F4D6C4", "#D6E6F2", "#E0EBD3", "#EAD9F0"].map((c, i) => (
        <div key={i} style={{ height: 120, borderRadius: 14, background: c, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {i === 0 ? <IconBall color="#8A4B2A" size={44} /> : null}
        </div>
      ))}
    </div>
  );

  const rest = (q: string, full: string, hl: boolean): Part[] => [{ t: full.slice(0, q.length) }, { t: full.slice(q.length), b: hl }];
  const mark = (q: string, full: string, hl: boolean): Part[] => {
    const i = full.indexOf(q);
    return [{ t: full.slice(0, i) }, { t: q, b: hl }, { t: full.slice(i + q.length) }];
  };

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={scene === "uxd" || scene === "heur" ? "dalil.search" : "malab.shop/search"} illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          {showPhone ? (
            <PhoneFrame fade={fade}>
              {searchBar}
              {scene === "home" ? (
                <>
                  {tiles}
                  {homeList ? (
                    <div style={{ opacity: enter(f, B.drop, 10) * exit(f, B.pick + 40, 8) }}>
                      <div style={{ ...loc(L(0, TOP - 4, PH.w, ROW * homeItems.length + 12)), background: "#FFFFFF" }} />
                      {homeItems.map((r, i) => (
                        <Row key={r} i={i} parts={plain(r)} icon={homeQ.length === 0 ? "clock" : "search"} />
                      ))}
                    </div>
                  ) : null}
                  {f >= B.pick + 40 ? (
                    <>
                      <div style={{ ...loc(L(0, 66, PH.w, PH.h - 66)), background: "#FFFFFF", opacity: enter(f, B.pick + 40, 10) }} />
                      <Results o={enter(f, B.pick + 40, 10)} head="36 results for “basketball hoop”" items={HOOPS} />
                    </>
                  ) : null}
                </>
              ) : null}
              {scene === "own" ? (
                <div style={{ position: "absolute", top: 150, left: 14, right: 14, textAlign: "center", opacity: enter(f, B.own + 90, 12) }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#1F2328" }}>لا توجد نتائج</div>
                  <div dir="ltr" style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>0 results</div>
                </div>
              ) : null}
              {scene === "good" ? <Results o={enter(f, B.good, 10)} head="36 results for “basketball hoop”" items={HOOPS} /> : null}
              {scene === "list" && query.length > 0 ? BALL.map((r, i) => <Row key={r} i={i} parts={plain(r)} />) : null}
              {scene === "bad" ? (
                f < B.badTap ? (
                  query.length > 0 ? ["luggage sets clearance", "luggage sets", "luggage tags"].map((r, i) => <Row key={r} i={i} parts={plain(r)} />) : null
                ) : (
                  <Results o={enter(f, B.badTap + 6, 10)} head="2 results for “luggage sets clearance”" items={[{ t: "Sports water bottle", tone: "#D6E6F2" }, { t: "Resistance bands", tone: "#E0EBD3" }]} />
                )
              ) : null}
              {scene === "uxd" && query.length >= 4 ? UXD.map((r, i) => <Row key={r} i={i} parts={rest("ux d", r, f >= B.c1Hl - 10)} />) : null}
              {scene === "heur" ? (
                <>
                  <div dir="ltr" style={{ ...loc(L(14, TOP, PH.w - 28, 34)), display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14, fontWeight: 700, color: "#6B7280" }}>Recent</div>
                  {HEUR.map((r, i) => <Row key={r} i={i} top={TOP + 34} icon="clock" parts={mark("heuristics usa", r, f >= B.c2Hl - 10)} />)}
                </>
              ) : null}
            </PhoneFrame>
          ) : null}
        </div>
      </DebuggerShell>
      <Presenter cam="c07/cam.mp4" />
      <TitleBand title="اقتراحات تقود إلى نتائج" sub="Search suggestions" />
      <Voice src="c07/voice.m4a" />
      <IntroCard title="اقتراحات البحث التي تساعد فعلًا" sub="Search · Suggestions" points={["نتائج جيدة", "Highlight"]} />
      <RecapCard
        voiceSec={VOICE_CUT}
        title="اقتراحات قليلة الجهد وصادقة"
        items={[
          { text: "لكل اقتراح نتائج جيدة وذات صلة" },
          { text: "ميّز بين ما كتبه المستخدم وما اقترحه الموقع" },
          { text: "الاقتراحات تكمل ما كتبه: ميّز الحروف المقترحة" },
          { text: "ما كتبه في أي موضع: ميّز ما كتبه" },
          { text: "اقتراح نتائجه قليلة أو لا علاقة لها بطلبه", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
