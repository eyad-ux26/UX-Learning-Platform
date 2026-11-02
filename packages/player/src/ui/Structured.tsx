"use client";

import { useState } from "react";
import type { MatchStep, OrderStep, SortStep, SpotStep, Locale } from "@uxgate/content/types";
import { pairOf, type StepState } from "../engine";

type T = (key: string, values?: Record<string, string | number>) => string;
type Props<S> = { step: S; st: StepState; locale: Locale; t: T; onChange: (sel: string[]) => void };

/** After Check the screen marks what was right and wrong; while answering nothing is marked. */
const judged = (st: StepState) => st.phase === "wrong" || st.phase === "right" || st.phase === "revealed" || st.phase === "missed" || st.phase === "saved";
const open = (st: StepState) => st.phase === "answering";
const mark = (ok: boolean) => (ok ? "ph-check-circle-fill" : "ph-x-circle-fill");

/** Sort: tap an item to pick it up, then tap a group (or "Put it here"). Tap a placed item to take it back. */
export function SortAnswer({ step, st, locale, t, onChange }: Props<SortStep>) {
  const [held, setHeld] = useState<string | null>(null);
  const placed = new Map(st.sel.map((v) => pairOf(v) as readonly [string, string]));
  const unplaced = step.items.filter((i) => !placed.has(i.id));
  const place = (bucket: string) => {
    if (!held || !open(st)) return;
    onChange([...st.sel.filter((v) => pairOf(v)[0] !== held), `${held}:${bucket}`]);
    setHeld(null);
  };
  const takeBack = (id: string) => { if (open(st)) onChange(st.sel.filter((v) => pairOf(v)[0] !== id)); };
  const right = (id: string, bucket: string) => step.answer[bucket]?.includes(id);
  const heldText = step.items.find((i) => i.id === held)?.text[locale];
  return (
    <div className="lp-sort">
      <div className="lp-tray" role="group" aria-label={t("sortTray")}>
        {unplaced.length ? unplaced.map((i) => (
          <button key={i.id} type="button" className={`lp-item${held === i.id ? " is-selected" : ""}`} aria-pressed={held === i.id} disabled={!open(st)} onClick={() => setHeld(held === i.id ? null : i.id)}>
            <span className="ph ph-dots-six-vertical" aria-hidden="true" />{i.text[locale]}
          </button>
        )) : <p className="lp-tray-empty">{t("sortEmpty")}</p>}
      </div>
      <p className="t-small ink-2" role="status">{heldText ? t("sortHeld", { item: heldText }) : " "}</p>
      <div className="lp-buckets">
        {step.buckets.map((b) => (
          <section key={b.id} className={`lp-bucket${held ? " is-target" : ""}`} aria-label={b.title[locale]}>
            <h3 className="hd">{b.title[locale]}</h3>
            <div className="its">
              {step.items.filter((i) => placed.get(i.id) === b.id).map((i) => {
                const ok = judged(st) ? right(i.id, b.id) : null;
                return (
                  <button key={i.id} type="button" className={`lp-item${ok === true ? " is-right" : ok === false ? " is-wrong" : ""}`} disabled={!open(st)} onClick={() => takeBack(i.id)} aria-label={open(st) ? t("sortTakeBack", { item: i.text[locale] }) : undefined}>
                    {i.text[locale]}{ok !== null ? <span className={`ph ${mark(ok)} v`} aria-label={ok ? t("rightWord") : t("wrongWord")} /> : null}
                  </button>
                );
              })}
            </div>
            {held && open(st) ? <button type="button" className="lp-drop" onClick={() => place(b.id)}><span className="ph ph-arrow-down" aria-hidden="true" />{t("putHere")}</button> : null}
          </section>
        ))}
      </div>
    </div>
  );
}

/** Order: numbered rows with move up and move down buttons. No dragging needed. */
export function OrderAnswer({ step, st, locale, t, onChange }: Props<OrderStep>) {
  const [moved, setMoved] = useState<string | null>(null);
  const byId = new Map(step.items.map((i) => [i.id, i]));
  const ids = st.sel.length ? st.sel : step.items.map((i) => i.id);
  const move = (at: number, by: number) => {
    if (!open(st)) return;
    const next = ids.slice();
    [next[at], next[at + by]] = [next[at + by], next[at]];
    setMoved(next[at + by]);
    onChange(next);
  };
  // After Check each row is compared with the accepted order that matches best.
  const accepted = [step.answer, ...(step.also_ok ?? []).map((a) => a.answer)];
  const target = accepted.find((a) => a.every((id, k) => id === ids[k])) ?? accepted.slice().sort((a, b) => b.filter((id, k) => id === ids[k]).length - a.filter((id, k) => id === ids[k]).length)[0];
  return (
    <ol className="lp-order" aria-label={step.prompt[locale]} style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {ids.map((id, k) => {
        const item = byId.get(id)!;
        const ok = judged(st) ? target[k] === id : null;
        return (
          <li key={id} className={`lp-row${ok === true ? " is-right" : ok === false ? " is-wrong" : moved === id && open(st) ? " is-moved" : ""}`}>
            <span className="n" aria-hidden="true">{k + 1}</span>
            <span className="grow">{item.text[locale]}<span className="lp-sr"> — {t("position", { n: k + 1, total: ids.length })}{ok !== null ? `, ${ok ? t("rightWord") : t("wrongWord")}` : ""}</span></span>
            {ok !== null ? <span className={`ph ${mark(ok)}`} aria-hidden="true" /> : (
              <>
                <button type="button" className="lp-mv" disabled={k === 0 || !open(st)} onClick={() => move(k, -1)} aria-label={t("moveUp", { item: item.text[locale] })}><span className="ph ph-arrow-up" aria-hidden="true" /></button>
                <button type="button" className="lp-mv" disabled={k === ids.length - 1 || !open(st)} onClick={() => move(k, 1)} aria-label={t("moveDown", { item: item.text[locale] })}><span className="ph ph-arrow-down" aria-hidden="true" /></button>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Match: tap one item on each side to pair them. The pair number shows on both. Tap a paired item to undo. */
export function MatchAnswer({ step, st, locale, t, onChange }: Props<MatchStep>) {
  const [leftHeld, setLeftHeld] = useState<string | null>(null);
  const pairs = st.sel.map((v) => pairOf(v) as readonly [string, string]);
  const rightOf = (l: string) => pairs.find(([a]) => a === l)?.[1];
  const leftOf = (r: string) => pairs.find(([, b]) => b === r)?.[0];
  const numberOf = (l: string) => pairs.findIndex(([a]) => a === l) + 1;
  const unpair = (l: string) => onChange(st.sel.filter((v) => pairOf(v)[0] !== l));
  const tapLeft = (l: string) => {
    if (!open(st)) return;
    if (rightOf(l)) { unpair(l); setLeftHeld(l); return; }
    setLeftHeld(leftHeld === l ? null : l);
  };
  const tapRight = (r: string) => {
    if (!open(st)) return;
    const owner = leftOf(r);
    // Holding an item: pair it here, taking this tile over from its earlier partner if it had one. Holding nothing: a paired tile is undone.
    if (!leftHeld) { if (owner) unpair(owner); return; }
    onChange([...st.sel.filter((v) => pairOf(v)[0] !== leftHeld && pairOf(v)[1] !== r), `${leftHeld}:${r}`]);
    setLeftHeld(null);
  };
  const ok = (l: string) => (judged(st) ? step.answer[l] === rightOf(l) : null);
  const cls = (state: boolean | null, selected: boolean, paired: boolean) => `lp-tile${state === true ? " is-right" : state === false ? " is-wrong" : selected ? " is-selected" : paired ? " is-paired" : ""}`;
  return (
    <div className="lp-match">
      <div className="side" role="group" aria-label={t("matchLeft")}>
        <span className="hd">{t("matchLeft")}</span>
        {step.left.map((l) => (
          <button key={l.id} type="button" className={cls(ok(l.id), leftHeld === l.id, !!rightOf(l.id))} aria-pressed={leftHeld === l.id} disabled={!open(st)} onClick={() => tapLeft(l.id)}>
            <span className={`lp-pno${rightOf(l.id) ? "" : " is-empty"}`} aria-hidden="true">{rightOf(l.id) ? numberOf(l.id) : 0}</span>
            <span className="grow">{l.text[locale]}</span>
            {rightOf(l.id) ? <span className="lp-sr">{t("pairN", { n: numberOf(l.id) })}</span> : null}
          </button>
        ))}
      </div>
      <div className="side" role="group" aria-label={t("matchRight")}>
        <span className="hd">{t("matchRight")}</span>
        {step.right.map((r) => {
          const owner = leftOf(r.id);
          return (
            <button key={r.id} type="button" className={cls(owner ? ok(owner) : null, false, !!owner)} disabled={!open(st)} onClick={() => tapRight(r.id)}>
              <span className={`lp-pno${owner ? "" : " is-empty"}`} aria-hidden="true">{owner ? numberOf(owner) : 0}</span>
              <span className="grow">{r.text[locale]}</span>
              {owner ? <span className="lp-sr">{t("pairN", { n: numberOf(owner) })}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Spot, list version: a plain radio list of the same regions (screen readers, small screens). */
export function SpotList({ step, st, locale, t, onPick }: { step: SpotStep; st: StepState; locale: Locale; t: T; onPick: (id: string) => void }) {
  return (
    <div className="choices" role="radiogroup" aria-label={t("spotAria")}>
      {step.regions.map((r) => {
        const picked = st.sel.includes(r.id);
        const state = judged(st) && picked ? (step.answer.includes(r.id) ? "is-right" : "is-wrong") : picked ? "is-selected" : "";
        return (
          <button key={r.id} type="button" role="radio" aria-checked={picked} aria-disabled={!open(st) || undefined} className={`choice press ${state}`} onClick={() => open(st) && onPick(r.id)}>
            <span className="grow">{r.label[locale]}</span>
          </button>
        );
      })}
    </div>
  );
}
