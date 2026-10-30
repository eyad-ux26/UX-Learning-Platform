// UXGate video theme for Remotion clips (reels-style lesson videos).
// Source of truth: the UXGate design system (Claude Design). Videos always use the night look,
// whatever theme the learner picked in the app.

export const fps = 30;

/** Canvases. Lesson clips are square; reels and stories are 9:16. */
export const canvas = {
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  wide: { width: 1920, height: 1080 },
  /** Keep text and logos inside these insets (px on the canvas). */
  safe: { top: 96, bottom: 120, side: 72 },
} as const;

export const color = {
  night: "#00121B", // background base
  nightTop: "#032E3B", // gradient start (160deg, nightTop 0% -> night 70%)
  panel: "#001C27", // cards on night
  line: "#0E3A4A",
  ice: "#EAF9FF", // text on night
  iceMuted: "#9CC0CF",
  navy: "#012E4B", // text on light cards
  blue: "#005F99", // UXGate blue
  wordmarkBlue: "#1E72B8",
  teal: "#60BEBB", // logo gradient start
  cyan: "#78E4FC", // highlight, key words, progress, pills
  cyanInk: "#006E8F", // cyan as text on light
  iceBg: "#F2FAFD", // light end card
  mint: "#DDF5E8",
  success: "#4CD69A",
  successOnLight: "#0A7A55",
  danger: "#FF6B7D",
  dangerOnLight: "#D6334A",
} as const;

export const gradient = {
  night: `linear-gradient(160deg, ${color.nightTop} 0%, ${color.night} 70%)`,
  logo: "linear-gradient(135deg, #60BEBB 0%, #54B3B7 10%, #187CA4 66%, #00669C 93%, #005F99 100%)",
} as const;

/** Load these with @remotion/google-fonts or a <link>. */
export const font = {
  display: '"Space Grotesk", "IBM Plex Sans Arabic", sans-serif', // Latin titles
  sans: '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif',
  arabic: '"IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif', // all Arabic text
  mono: '"JetBrains Mono", monospace', // numbers, labels, clip ids
} as const;

/** Type sizes on the 1080 canvas. Arabic uses the same sizes with lineHeight +0.15. */
export const type = {
  title: { fontSize: 84, lineHeight: 1.12, fontWeight: 700 },
  subtitle: { fontSize: 40, lineHeight: 1.35, fontWeight: 500 },
  body: { fontSize: 44, lineHeight: 1.45, fontWeight: 500 },
  caption: { fontSize: 46, lineHeight: 1.5, fontWeight: 600 },
  captionSecondary: { fontSize: 34, lineHeight: 1.4, fontWeight: 500 },
  label: { fontSize: 30, lineHeight: 1.3, fontWeight: 600 }, // mono pills
} as const;

export const radius = { pill: 999, card: 36, caption: 30, small: 18 } as const;

/** Timings in frames at 30 fps. */
export const timing = {
  titleCard: 75, // 2.5 s opening card
  recapCard: 180, // 6 s "ملخص الفيديو" card
  logoSplash: 45, // 1.5 s
  logoIntro: 36, // 1.2 s
  enter: 9, // 0.3 s for elements entering (ease standard)
  exit: 6, // 0.2 s
  stagger: 3, // between list items
  captionMinHold: 30, // 1 s minimum on screen
} as const;

export const ease = {
  standard: [0.2, 0, 0, 1] as const, // Easing.bezier(...ease.standard)
  exit: [0.4, 0, 1, 1] as const,
  pop: [0.3, 1.6, 0.5, 1] as const,
} as const;

/** Caption rules: max 2 lines per language, 42 characters per line, key words in cyan. */
export const captionStyle = {
  background: "rgba(0,18,27,0.86)",
  color: color.ice,
  highlight: color.cyan,
  paddingX: 30,
  paddingY: 16,
  radius: radius.caption,
  bottom: canvas.safe.bottom,
} as const;
