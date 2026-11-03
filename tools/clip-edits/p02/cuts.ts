/* No silent gaps are cut from the P02 clips yet. */
export type Cuts = [number, number][];
export type Cover = [number, number, string];
export const CUTS: Record<string, { cuts: Cuts; covers: Cover[] }> = {};
