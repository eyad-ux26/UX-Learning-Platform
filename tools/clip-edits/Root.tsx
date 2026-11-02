import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import { themeVars } from "./brand/theme";
import { fontsReady } from "./brand/fonts";
import { C01, C01_FRAMES } from "./clips/C01";
import { C02, C02_FRAMES } from "./clips/C02";
import { C03, C03_FRAMES } from "./clips/C03";
import { C04, C04_FRAMES } from "./clips/C04";
import { C05, C05_FRAMES } from "./clips/C05";
import { C06, C06_FRAMES } from "./clips/C06";
import { C07, C07_FRAMES } from "./clips/C07";
import { C08, C08_FRAMES } from "./clips/C08";
import { C09, C09_FRAMES } from "./clips/C09";
import { C10, C10_FRAMES } from "./clips/C10";
import { C11, C11_FRAMES } from "./clips/C11";
import { C12, C12_FRAMES } from "./clips/C12";
import { C13, C13_FRAMES } from "./clips/C13";
import { C15, C15_FRAMES } from "./clips/C15";
import { C16, C16_FRAMES } from "./clips/C16";
import { C17, C17_FRAMES } from "./clips/C17";
import { C18, C18_FRAMES } from "./clips/C18";
import { C14, C14_FRAMES } from "./clips/C14";

const meta = async () => {
  await fontsReady;
  return {};
};
const clips: [string, React.FC, number][] = [
  ["P14-C01", C01, C01_FRAMES],
  ["P14-C02", C02, C02_FRAMES],
  ["P14-C03", C03, C03_FRAMES],
  ["P14-C04", C04, C04_FRAMES],
  ["P14-C05", C05, C05_FRAMES],
  ["P14-C06", C06, C06_FRAMES],
  ["P14-C07", C07, C07_FRAMES],
  ["P14-C08", C08, C08_FRAMES],
  ["P14-C09", C09, C09_FRAMES],
  ["P14-C10", C10, C10_FRAMES],
  ["P14-C11", C11, C11_FRAMES],
  ["P14-C12", C12, C12_FRAMES],
  ["P14-C13", C13, C13_FRAMES],
  ["P14-C15", C15, C15_FRAMES],
  ["P14-C16", C16, C16_FRAMES],
  ["P14-C17", C17, C17_FRAMES],
  ["P14-C18", C18, C18_FRAMES],
  ["P14-C14", C14, C14_FRAMES],
];

/** Every clip runs in the UXGate night look; the example product inside resets to its own light palette. */
const night = (Clip: React.FC): React.FC => () => (
  <AbsoluteFill style={themeVars(1)}>
    <Clip />
  </AbsoluteFill>
);
const wrapped = clips.map(([id, c, n]) => [id, night(c), n] as [string, React.FC, number]);

export const RemotionRoot: React.FC = () => (
  <>
    {wrapped.map(([id, c, n]) => (
      <Composition key={id} id={id} component={c} width={1080} height={1080} fps={30} durationInFrames={n} calculateMetadata={meta} />
    ))}
  </>
);
