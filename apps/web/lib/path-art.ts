/** Path illustration for small labels. Paths without their own art use the map. */
const ART: Record<string, string> = { P01: "forms", P10: "hierarchy", P02: "usability" };
export const pathArt = (pathId: string) => `/ill/uxgate-ill-path-${ART[pathId] ?? "map"}.png`;
