"use client";

import { useEffect } from "react";
import { initSound, play } from "@/lib/sound";

/** Plays one sound after the learner's next tap on the page (browsers block sound before any tap). */
export function PlayOnce({ sound }: { sound: string }) {
  useEffect(() => {
    initSound();
    const go = () => setTimeout(() => play(sound), 0);
    window.addEventListener("pointerdown", go, { once: true });
    return () => window.removeEventListener("pointerdown", go);
  }, [sound]);
  return null;
}
