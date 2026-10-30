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
