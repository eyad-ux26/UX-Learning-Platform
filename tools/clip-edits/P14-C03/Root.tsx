import React from "react";
import { Composition } from "remotion";
import { fontsReady } from "./brand/fonts";
import { C03, C03_FRAMES } from "./clips/C03";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="P14-C03"
    component={C03}
    width={1080}
    height={1080}
    fps={30}
    durationInFrames={C03_FRAMES}
    calculateMetadata={async () => {
      await fontsReady;
      return {};
    }}
  />
);
