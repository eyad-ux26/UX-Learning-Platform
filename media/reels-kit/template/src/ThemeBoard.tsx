import React from "react";
import { C, CONTENT, FONT, T } from "./brand/theme";
import { Captions } from "./components/Captions";
import { DebuggerShell } from "./debugger/DebuggerShell";
import { ChangeTag, Note, Selection } from "./debugger/Inspect";
import { InspectCursor, UserTouch } from "./debugger/Pointers";

/** One still for reviewing tokens and debugger components together (not part of any episode). */
export const ThemeBoard: React.FC = () => {
  const r = { x: 60, y: 420, w: CONTENT.w - 120, h: 104 };
  const swatches = Object.entries(C).filter(([k]) => !k.startsWith("$"));
  return (
    <>
      <DebuggerShell
        mode="inspect"
        address="theme-board"
        illustrative
        overlay={
          <>
            <Selection r={r} hover={0} selected={1} label="عنصر مختار" />
            <Note anchor={r} text="ملاحظة واحدة قصيرة على العنصر" source="مصدر: اسم المرجع" progress={1} />
            <ChangeTag r={{ x: 60, y: 260, w: 300, h: 60 }} text="تعديل ظاهر" progress={1} />
            <InspectCursor frame={0} keys={[{ f: 0, x: 700, y: 470 }]} from={-20} to={20} />
            <UserTouch frame={0} keys={[{ f: 0, x: 300, y: 820 }]} from={-20} to={20} />
          </>
        }
      >
        <div dir="ltr" style={{ position: "absolute", left: 40, right: 40, top: 30, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, fontFamily: FONT }}>
          {swatches.map(([k, v]) => (
            <div key={k}>
              <div style={{ height: 44, borderRadius: 10, background: v as string, border: `1px solid ${C.border}` }} />
              <div style={{ fontSize: 15, color: C.textMuted }}>{k}</div>
            </div>
          ))}
        </div>
        <div dir="rtl" style={{ position: "absolute", left: 40, right: 40, top: 700, fontFamily: FONT, color: C.text }}>
          <div style={{ fontSize: T.type.productTitle, fontWeight: 700 }}>عنوان المنتج ٤٤</div>
          <div style={{ fontSize: T.type.productRow }}>صف في القائمة ٤٠ · Row label</div>
          <div style={{ fontSize: T.type.productMeta, color: C.textMuted }}>وصف مساعد ٢٨ · helper text</div>
        </div>
      </DebuggerShell>
      <Captions
        ms={500}
        pages={[{ startMs: 0, endMs: 2000, lines: [[{ text: "الترجمة", startMs: 0, endMs: 1000 }, { text: "سطرين بالكتير،", startMs: 0, endMs: 400 }], [{ text: "تحت الـ viewport ومش فوق الـ UI", startMs: 0, endMs: 400 }]] }]}
      />
    </>
  );
};
