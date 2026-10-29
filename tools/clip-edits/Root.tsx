import React from "react";
import { Composition } from "remotion";
import { fontsReady } from "./brand/fonts";
import { C01, C01_FRAMES } from "./clips/C01";
import { C02, C02_FRAMES } from "./clips/C02";
import { C03, C03_FRAMES } from "./clips/C03";

const meta = async () => {
  await fontsReady;
  return {};
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="P14-C01" component={C01} width={1080} height={1080} fps={30} durationInFrames={C01_FRAMES} calculateMetadata={meta} />
    <Composition id="P14-C02" component={C02} width={1080} height={1080} fps={30} durationInFrames={C02_FRAMES} calculateMetadata={meta} />
    <Composition id="P14-C03" component={C03} width={1080} height={1080} fps={30} durationInFrames={C03_FRAMES} calculateMetadata={meta} />
  </>
);
