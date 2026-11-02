import type { CastMember } from "@uxgate/content/types";
import type { StepState } from "./engine";

export type Face = "talk" | "smile" | "think";

/** The character talks while the question is open, smiles after a right answer and thinks after a wrong one or a revealed answer. */
export function sayFace(st: Pick<StepState, "phase" | "tries">): Face {
  if (st.phase === "right" || st.phase === "main_ok") return "smile";
  if (st.phase === "wrong" || st.phase === "revealed") return "think";
  return st.tries > 0 ? "think" : "talk";
}

export const faceSrc = (c: Pick<CastMember, "id">, face: Face) => `/char/uxgate-char-${c.id}-${face}-avatar.svg`;
