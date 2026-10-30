import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { T } from "./theme";

// UXGate layer: Cairo for Arabic and Titillium Web for Latin (both SIL OFL 1.1, bundled from @fontsource) under one
// family, so mixed Arabic and English lines pick the right face per glyph. Example products keep IBM Plex Sans Arabic.
const ARABIC =
  "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC";
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const TITILLIUM: Record<number, number> = { 400: 400, 500: 600, 600: 600, 700: 700, 800: 900 };

export const fontsReady = Promise.all([
  ...[400, 500, 600, 700, 800].flatMap((w) => [
    loadFont({ family: T.font.family, url: staticFile(`fonts/cairo-arabic-${w}-normal.woff2`), weight: String(w), unicodeRange: ARABIC }),
    loadFont({ family: T.font.family, url: staticFile(`fonts/titillium-web-latin-${TITILLIUM[w]}-normal.woff2`), weight: String(w), unicodeRange: LATIN }),
  ]),
  ...[400, 500, 600, 700].flatMap((w) => [
    loadFont({ family: T.font.product, url: staticFile(`fonts/ibm-plex-sans-arabic-arabic-${w}-normal.woff2`), weight: String(w), unicodeRange: ARABIC }),
    loadFont({ family: T.font.product, url: staticFile(`fonts/ibm-plex-sans-arabic-latin-${w}-normal.woff2`), weight: String(w), unicodeRange: LATIN }),
  ]),
]);
