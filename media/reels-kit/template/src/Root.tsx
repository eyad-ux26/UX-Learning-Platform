import React from "react";
import { Composition, Folder } from "remotion";
import { T } from "./brand/theme";
import { fontsReady } from "./brand/fonts";
import { EPISODES } from "./episodes";
import { registerEpisode } from "./episodes/registry";
import { ThemeBoard } from "./ThemeBoard";

export const RemotionRoot: React.FC = () => (
  <>
    {EPISODES.map(registerEpisode)}
    <Folder name="Design">
      <Composition
        id="ThemeBoard"
        component={ThemeBoard}
        width={T.layout.width}
        height={T.layout.height}
        fps={30}
        durationInFrames={1}
        calculateMetadata={async () => {
          await fontsReady;
          return {};
        }}
      />
    </Folder>
  </>
);
