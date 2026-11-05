// Sound effects (docs/design/sound). Rules: nothing plays before the first tap, the mute choice is remembered,
// one sound per moment, and every sound pairs with a visual change.
const MUTE_KEY = "ug-muted";
const PRELOAD = ["select-snap", "check-press", "answer-right", "answer-wrong"];

let unlocked = false;
let muted = false;
const cache = new Map<string, HTMLAudioElement>();
let listening = false;

function src(name: string) {
  const a = document.createElement("audio");
  const ogg = a.canPlayType("audio/ogg; codecs=vorbis") !== "";
  return `/sfx/${name}.${ogg ? "ogg" : "mp3"}`;
}

function load(name: string) {
  let a = cache.get(name);
  if (!a) { a = new Audio(src(name)); a.preload = "auto"; cache.set(name, a); }
  return a;
}

export function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function initSound() {
  muted = readMuted();
  if (listening || typeof window === "undefined") return;
  listening = true;
  const unlock = () => {
    unlocked = true;
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    if (!muted) PRELOAD.forEach(load);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

export function setMuted(v: boolean) {
  muted = v;
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* storage blocked: the choice lasts for this visit */ }
  if (!v && unlocked) PRELOAD.forEach(load);
}

export function play(name: string) {
  if (!unlocked || muted) return;
  try {
    const a = load(name);
    a.currentTime = 0;
    a.volume = 0.7;
    void a.play().catch(() => {});
  } catch { /* audio unavailable: the visual change still carries the meaning */ }
}
