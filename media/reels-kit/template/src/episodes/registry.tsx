import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Composition, Folder, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { T } from "../brand/theme";
import { fontsReady } from "../brand/fonts";
import { Captions } from "../components/Captions";
import { Timeline } from "../lib/timeline";

export type SceneProps = { timeline: Timeline };
export type EpisodeProps = { timeline: Timeline | null; timelinePath: string };
export type EpisodeDef = {
  /** Composition id prefix, letters/digits/dashes only (e.g. "Ep01"). */
  id: string;
  /** Folder under public/episodes/ holding timeline.json (+ narration.normalized.wav). */
  folder: string;
  Scene: React.FC<SceneProps>;
};

const withTimeline: CalculateMetadataFunction<EpisodeProps> = async ({ props, abortSignal }) => {
  await fontsReady;
  const res = await fetch(staticFile(props.timelinePath), { signal: abortSignal });
  const timeline = (await res.json()) as Timeline;
  return { durationInFrames: timeline.durationInFrames, fps: timeline.fps, props: { ...props, timeline } };
};

const useMs = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (frame / fps) * 1000;
};

const CaptionLayer: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const ms = useMs();
  return <Captions pages={timeline.captions} ms={ms} />;
};

/** Three compositions per episode so ONE visual render feeds both the narrated and the silent MP4. */
export const registerEpisode = (ep: EpisodeDef) => {
  const Full: React.FC<EpisodeProps> = ({ timeline }) =>
    timeline ? (
      <AbsoluteFill>
        <ep.Scene timeline={timeline} />
        <CaptionLayer timeline={timeline} />
        {timeline.audio ? <Audio src={staticFile(timeline.audio)} /> : null}
        {timeline.sfx ? <Audio src={staticFile(timeline.sfx)} /> : null}
      </AbsoluteFill>
    ) : null;
  const Visual: React.FC<EpisodeProps> = ({ timeline }) => (timeline ? <ep.Scene timeline={timeline} /> : null);
  const CaptionsOnly: React.FC<EpisodeProps> = ({ timeline }) =>
    timeline ? (
      <AbsoluteFill style={{ backgroundColor: "transparent" }}>
        <CaptionLayer timeline={timeline} />
      </AbsoluteFill>
    ) : null;
  const common = {
    width: T.layout.width,
    height: T.layout.height,
    fps: T.layout.fps,
    durationInFrames: 300,
    defaultProps: { timeline: null, timelinePath: `episodes/${ep.folder}/timeline.json` } as EpisodeProps,
    calculateMetadata: withTimeline,
  };
  return (
    <Folder name={ep.id} key={ep.id}>
      <Composition id={`${ep.id}-Full`} component={Full} {...common} />
      <Composition id={`${ep.id}-Visual`} component={Visual} {...common} />
      <Composition id={`${ep.id}-Captions`} component={CaptionsOnly} {...common} />
    </Folder>
  );
};
