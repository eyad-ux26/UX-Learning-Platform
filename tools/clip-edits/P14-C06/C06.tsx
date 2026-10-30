import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, CONTENT, D } from "../brand/theme";
import { cameraAt, camPoint, camRect, camStyle, Rect, Shot } from "../debugger/camera";
import { DebuggerShell, DebugMode } from "../debugger/DebuggerShell";
import { FocusDim, Selection, Tag } from "../debugger/Inspect";
import { UserTouch } from "../debugger/Pointers";
import { IconAlert, IconCheck, IconChat, IconEye, IconPen, IconTarget } from "../components/Icons";
import { enter, exit, Key, span } from "../lib/timeline";
import { CaseChip, clipFrames, Header, IntroCard, L, loc, mid, PH, PhoneFrame, phoneRect, Presenter, RecapCard, SideNote, TitleBand, v, Voice, wi } from "./p14";

/*
 * P14-C06 re-edit: WP 15 "floating action button" (230.9–400.5 s). A messaging app and an email app act out each point;
 * Eyad's voice and camera are kept. The app is right-to-left, so its FAB sits at the bottom left (mirrored).
 */
const VOICE = 169.6;
export const C06_FRAMES = clipFrames(VOICE);

const NAV_H = 64;
const fabRect = (w = 60): Rect => L(16, PH.h - NAV_H - 16 - 60, w, 60);
const navRect = L(0, PH.h - NAV_H, PH.w, NAV_H);
const ROW_H = 72;

const CHATS = [["أحمد سامي", "تمام، أشوفك بكرة"], ["مجموعة العمل", "الملف جاهز"], ["سارة علي", "شكرًا جدًا!"], ["أمي", "اتصل بي لما توصل"], ["كريم", "الصورة دي جميلة"], ["هبة", "تم الإرسال"]];
const MAILS = [["فاتورة شهر أكتوبر", "شركة الكهرباء"], ["دعوة اجتماع", "فريق التصميم"], ["تأكيد طلبك", "متجري"], ["نشرة الأسبوع", "مدونة UX"], ["رحلتك القادمة", "طيران النيل"], ["تحديث كلمة المرور", "الأمان"], ["صور الإجازة", "خالد"], ["عرض سعر", "شركة الطباعة"], ["ملاحظات المراجعة", "منى"], ["موعد الطبيب", "العيادة"]];

const Fab: React.FC<{ icon: React.ReactNode; label?: string; ext?: number; bg?: string; shadow?: number; o?: number }> = ({ icon, label, ext = 0, bg = D.brand, shadow = 1, o = 1 }) => {
  const w = 60 + ext * 92;
  return (
    <div style={{ ...loc(fabRect(w)), borderRadius: 18, background: bg, color: D.onBrand, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 ${8 * shadow}px ${20 * shadow}px rgba(0,0,0,${0.28 * shadow})`, opacity: o, overflow: "hidden", whiteSpace: "nowrap" }}>
      {icon}
      {label && ext > 0.05 ? <span style={{ fontSize: 16, fontWeight: 700, opacity: ext }}>{label}</span> : null}
    </div>
  );
};
const Nav: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ ...loc(navRect), background: dark ? "#F1F3F2" : "#FFFFFF", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", alignItems: "center", fontSize: 13, fontWeight: 700, color: C.textMuted }}>
    {["المحادثات", "الحالة", "المكالمات"].map((t, i) => <span key={t} style={{ color: i === 0 ? D.brand : C.textMuted }}>{t}</span>)}
  </div>
);
const Plus = <span style={{ fontSize: 34, fontWeight: 500, lineHeight: 1 }}>+</span>;

export const C06: React.FC = () => {
  const f = useCurrentFrame();
  const B = {
    fab: v(4.36), where: v(7.06), main: v(10.0), floated: v(14.1), nav: v(19.44),
    ex: v(21.92), exTap: v(30.4), exBack: v(36.0), exClear: v(40.16),
    g: v(42.36), contrast: v(45.42), same: v(51.16), weak: v(55.5), diff: v(61.9),
    icon: v(65.82), noLabel: v(74.6), plus: v(79.86), chatIcon: v(88.2), unclear: v(93.7), guess: v(104.58),
    ext: v(108.14), extDef: v(110.56), mail: v(121.38),
    combo: v(128.86), down: v(132.68), collapse: v(134.26), end: v(140.0), expand: v(142.82), up: v(154.82),
  };
  const END = v(VOICE) + 6;

  type Scene = "chats" | "newchat" | "contrast" | "icons" | "mail";
  const scene: Scene = f < B.exTap + 8 ? "chats" : f < B.exBack ? "newchat" : f < B.g ? "chats" : f < B.icon ? "contrast" : f < B.ext ? "icons" : "mail";
  const cuts = [B.exTap + 8, B.exBack, B.g, B.icon, B.ext];
  const fade = Math.min(...cuts.map((c) => (f >= c - 8 && f < c ? exit(f, c - 8, 8) : f >= c && f < c + 10 ? enter(f, c, 10) : 1)));

  // contrast: FAB colour moves from "same as the solid header background" to a distinct colour
  const distinct = enter(f, B.diff, 16);
  // mail list scroll: down, reach the end, then up
  const scrollY = f < B.down ? 0 : f < B.end ? Math.min(1, (f - B.down) / (B.end - B.down)) : f < B.up ? 1 : Math.max(0, 1 - (f - B.up) / 60);
  const ext = f < B.ext ? 0 : f < B.collapse ? enter(f, B.extDef, 14) : f < B.expand ? 1 - enter(f, B.collapse, 10) : enter(f, B.expand, 12);

  let phone: React.ReactNode;
  if (scene === "chats" || scene === "contrast") {
    const solid = scene === "contrast";
    const fabBg = solid ? `color-mix(in srgb, #F2A900 ${distinct * 100}%, ${D.brand})` : D.brand;
    phone = (
      <>
        <Header title="المحادثات" />
        <div style={{ position: "absolute", top: 60, left: 0, right: 0, bottom: NAV_H, background: solid ? D.brand : "#FFFFFF" }}>
          {CHATS.map(([n, m], i) => (
            <div key={n} style={{ position: "absolute", left: 12, right: 12, top: 10 + i * ROW_H, height: ROW_H - 8, display: "flex", alignItems: "center", gap: 12, borderRadius: 12, background: solid ? "rgba(255,255,255,0.08)" : "transparent" }}>
              <span style={{ width: 46, height: 46, borderRadius: 23, background: ["#C9E8E1", "#F4DCC2", "#DCD8F4", "#F6D6D6", "#D6E8F6", "#E8F6D6"][i], flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: solid ? "#FFFFFF" : C.text }}>{n}</div>
                <div style={{ fontSize: 14, color: solid ? "rgba(255,255,255,0.75)" : C.textMuted }}>{m}</div>
              </div>
            </div>
          ))}
        </div>
        <Nav />
        <Fab icon={<IconChat color={solid && distinct < 0.5 ? "rgba(255,255,255,0.7)" : "#FFFFFF"} size={28} stroke={2.4} />} bg={fabBg} shadow={solid ? distinct : 1} />
      </>
    );
  } else if (scene === "newchat") {
    phone = (
      <>
        <Header title="محادثة جديدة" back />
        <div style={{ position: "absolute", top: 72, left: 14, right: 14, height: 44, borderRadius: 12, background: C.surfaceAlt, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 15, color: C.textMuted }}>ابحث عن اسم أو رقم</div>
        {CHATS.slice(0, 4).map(([n], i) => (
          <div key={n} style={{ position: "absolute", left: 14, right: 14, top: 130 + i * 60, height: 52, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 20, background: ["#C9E8E1", "#F4DCC2", "#DCD8F4", "#F6D6D6"][i] }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{n}</span>
          </div>
        ))}
      </>
    );
  } else if (scene === "icons") {
    const glyphs = ["✦", "⌘", "◈"];
    phone = (
      <>
        <Header title="أيقونات الـ FAB" />
        <div style={{ position: "absolute", top: 76, left: 14, right: 14, fontSize: 15, fontWeight: 700, color: C.textMuted }}>بدون Label، الأيقونة وحدها تشرح الـ Action</div>
        {[0, 1].map((col) => (
          <div key={col} style={{ position: "absolute", top: 130, [col === 0 ? "right" : "left"]: 26, width: 110, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 } as React.CSSProperties}>
            {(col === 0 ? [Plus, <IconChat key="c" color="#FFFFFF" size={28} stroke={2.4} />, <IconPen key="p" color="#FFFFFF" size={26} stroke={2.4} />] : glyphs.map((g) => <span key={g} style={{ fontSize: 28 }}>{g}</span>)).map((ic, i) => (
              <div key={i} style={{ width: 64, height: 64, borderRadius: 18, background: D.brand, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(0,0,0,0.22)", opacity: col === 0 ? enter(f, (i === 0 ? B.plus : i === 1 ? B.chatIcon : B.chatIcon + 30) - 10, 12) : enter(f, B.unclear - 10 + i * 6, 12) }}>{ic}</div>
            ))}
          </div>
        ))}
      </>
    );
  } else {
    const listTop = 60 - scrollY * (MAILS.length * ROW_H - (PH.h - 60) + 20);
    phone = (
      <>
        <div style={{ position: "absolute", top: listTop, left: 0, right: 0 }}>
          {MAILS.map(([t, s2], i) => (
            <div key={t} style={{ position: "absolute", left: 14, right: 14, top: i * ROW_H + 10, height: ROW_H - 10, borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{t}</div>
              <div style={{ fontSize: 14, color: C.textMuted }}>{s2}</div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <Header title="البريد الوارد" />
        </div>
        <Fab icon={<IconPen color="#FFFFFF" size={24} stroke={2.4} />} label="رسالة جديدة" ext={ext} />
      </>
    );
  }

  // ---- camera, mode, dim -------------------------------------------------------------------
  const overview = { s: 1, fx: CONTENT.w / 2, fy: CONTENT.h / 2 };
  const shots: Shot[] = [{ f: 0, ...overview }];
  const cam = cameraAt(f, shots);
  const compare = (f >= B.diff && f < B.icon) || (f >= B.ext && f < B.combo);
  const mode: DebugMode = f < B.fab ? "live" : compare ? "compare" : "inspect";
  const address = scene === "mail" ? "mail.app" : "chat.app";
  const dim = Math.max(span(f, B.main, B.ex), span(f, B.contrast, B.icon), span(f, B.noLabel, B.ext)) * 0.9;

  const fabP = camPoint(mid(fabRect()), cam);
  const touches = [
    { keys: [{ f: B.exTap - 20, x: fabP.x + 60, y: fabP.y - 120 }, { f: B.exTap, ...fabP, click: true }, { f: B.exTap + 24, ...fabP }] as Key[], from: B.exTap - 22, to: B.exTap + 30 },
    // scrolling the mail list: swipe up (content down) then swipe down
    { keys: [{ f: B.down - 4, x: fabP.x + 150, y: fabP.y - 40 }, { f: B.down + 4, x: fabP.x + 150, y: fabP.y - 40, click: true }, { f: B.end - 10, x: fabP.x + 150, y: fabP.y - 360 }] as Key[], from: B.down - 8, to: B.end },
    { keys: [{ f: B.up - 4, x: fabP.x + 150, y: fabP.y - 360 }, { f: B.up + 4, x: fabP.x + 150, y: fabP.y - 360, click: true }, { f: B.up + 56, x: fabP.x + 150, y: fabP.y - 40 }] as Key[], from: B.up - 8, to: B.up + 64 },
  ];
  const sel = (a: number, b: number) => enter(f, a, 10) * exit(f, b, 8);
  const fr = camRect(fabRect(60 + ext * 92), cam);

  const overlay = (
    <>
      <FocusDim r={camRect(phoneRect, cam)} amount={dim} pad={8} />
      <Selection r={fr} hover={sel(B.fab, B.ex)} selected={sel(B.fab, B.ex)} label="FAB" />
      <SideNote y={110} text="Floating action button" p={span(f, B.fab, B.main)} big />
      <Tag r={{ x: 0, y: fr.y + fr.h + 40, w: 0, h: 0 }} x={fr.x} text="في الواجهة العربية: أسفل اليسار" progress={span(f, B.where, B.main + 40)} />
      <SideNote y={110} text="أهم Action في الشاشة" p={span(f, B.main, B.ex)} icon={wi(IconTarget)} />
      <SideNote y={250} text="Floating: له Shadow فيطفو فوق المحتوى" p={span(f, B.floated, B.ex)} />
      <Selection r={camRect(navRect, cam)} hover={sel(B.nav, B.ex)} selected={0} label="Navbar" labelSide="left" />
      <SideNote y={390} text="وعادةً فوق الـ Navbar" p={span(f, B.nav, B.ex)} />

      <SideNote y={110} text="مثال: بدء محادثة جديدة" p={span(f, B.ex, B.g)} icon={wi(IconChat)} />
      <SideNote y={250} text="الـ Action واضح جدًا من مكانه وأيقونته" p={span(f, B.exClear, B.g)} icon={wi(IconCheck)} />

      <CaseChip y={40} text="Guideline 1" p={span(f, B.g, B.icon)} />
      <SideNote y={110} text="Contrast واضح مع الخلفية" p={span(f, B.contrast, B.icon)} big icon={wi(IconEye)} />
      <SideNote y={250} text="نفس لون خلفية Solid: بالكاد يظهر" p={span(f, B.same, B.diff)} warn icon={wi(IconAlert)} />
      <SideNote y={250} text="لون مختلف: يظهر فورًا" p={span(f, B.diff, B.icon)} icon={wi(IconCheck)} />
      <Selection r={fr} hover={sel(B.weak, B.icon)} selected={sel(B.weak, B.icon)} label="FAB" />

      <CaseChip y={40} text="Guideline 2" p={span(f, B.icon, B.ext)} />
      <SideNote y={110} text="بدون Label، الأيقونة يجب أن تعبّر عن الـ Action" p={span(f, B.icon, B.unclear)} />
      <SideNote y={260} text="+ : إضافة · فقاعة: رسالة جديدة" p={span(f, B.plus, B.unclear)} icon={wi(IconCheck)} />
      <SideNote y={110} text="أيقونات قد تكون غير واضحة" p={span(f, B.unclear, B.ext)} warn icon={wi(IconAlert)} />
      <SideNote y={260} text="لا يعرف ما تفعله حتى يجرّبها" p={span(f, B.guess - 60, B.ext)} warn />

      <CaseChip y={40} text="Extended FAB" p={span(f, B.ext, END)} />
      <SideNote y={110} text="FAB + Label يشرح الـ Action" p={span(f, B.extDef, B.combo)} big icon={wi(IconPen)} />
      <SideNote y={250} text="مثل «رسالة جديدة» في تطبيق البريد" p={span(f, B.mail, B.combo)} />
      <Selection r={fr} hover={sel(B.extDef + 10, END)} selected={sel(B.extDef + 10, END)} label={ext > 0.5 ? "Extended FAB" : "FAB"} />
      <SideNote y={110} text="Scroll لأسفل: يصغر إلى أيقونة فقط" p={span(f, B.collapse, B.expand)} />
      <SideNote y={110} text="في آخر الشاشة: يعود Extended" p={span(f, B.expand, B.up)} />
      <SideNote y={110} text="Scroll لأعلى: لا يتغيّر" p={span(f, B.up, END)} />
      <SideNote y={250} text="لأنه لا يرى محتوى جديدًا" p={span(f, B.up + 60, END)} />

      {touches.map((t, i) => (
        <UserTouch key={i} frame={f} keys={t.keys} from={t.from} to={t.to} />
      ))}
    </>
  );

  return (
    <AbsoluteFill>
      <DebuggerShell mode={mode} address={address} illustrative overlay={overlay}>
        <div style={camStyle(cam)}>
          <PhoneFrame fade={fade}>{phone}</PhoneFrame>
        </div>
      </DebuggerShell>
      <Presenter cam="c06/cam.mp4" />
      <TitleBand title="الـ Floating action button" sub="FAB · Extended FAB" />
      <Voice src="c06/voice.m4a" />
      <IntroCard title="الـ Floating action button: متى وكيف؟" sub="FAB" points={["أهم Action", "Contrast", "أيقونة واضحة", "Extended FAB"]} />
      <RecapCard
        voiceSec={VOICE}
        title="FAB واحد لأهم Action في الشاشة"
        items={[
          { text: "Contrast واضح مع الخلفية" },
          { text: "أيقونة تعبّر عن الـ Action" },
          { text: "Label حين قد تكون الأيقونة غير واضحة: Extended FAB" },
          { text: "FAB بلون الخلفية نفسها", no: true },
        ]}
      />
    </AbsoluteFill>
  );
};
