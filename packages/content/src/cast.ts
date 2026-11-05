import raw from "../dist/cast.json";
import type { CastMember } from "./types";

/** The scenario characters. Compiled from content/cast.yaml. A lesson or step names one with `speaker: <id>`; the avatars live in apps/web/public/char/. */
export const cast = raw as unknown as CastMember[];
export const getCast = (id: string | undefined): CastMember | undefined => (id ? cast.find((c) => c.id === id) : undefined);
