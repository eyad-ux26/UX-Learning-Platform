import { EpisodeDef } from "./registry";
import { DebuggerPreviewScene } from "./debugger-preview/Scene";
// Example episode scenes (code only; recordings are not bundled): ./trust-calibration, ./search-suggestions, ./iterative-refinement
// import { TrustCalibrationScene } from "./trust-calibration/Scene";
// import { SearchSuggestionsScene } from "./search-suggestions/Scene";
// import { IterativeRefinementScene } from "./iterative-refinement/Scene";

// Register each episode here: { id, folder, Scene }. The id prefixes its three compositions (-Full, -Visual, -Captions).
export const EPISODES: EpisodeDef[] = [
  { id: "DebuggerPreview", folder: "debugger-preview", Scene: DebuggerPreviewScene },
  // { id: "TrustCalibration", folder: "trust-calibration", Scene: TrustCalibrationScene },
  // { id: "SearchSuggestions", folder: "search-suggestions", Scene: SearchSuggestionsScene },
  // { id: "IterativeRefinement", folder: "iterative-refinement", Scene: IterativeRefinementScene },
];
