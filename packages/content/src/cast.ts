import raw from "./cast.json";
import type { CastMember } from "./types";

/** The scenario characters. A step names one with `say: <id>`; the avatars live in apps/web/public/char/. */
export const cast = raw as CastMember[];
export const getCast = (id: string | undefined): CastMember | undefined => (id ? cast.find((c) => c.id === id) : undefined);
