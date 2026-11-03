"""Build VTT captions and transcript fixtures from cues/<CLIP>.json.
Cue times are in source-video seconds; captions are shifted to clip time + INTRO (the title card)."""
import json, sys, glob
from pathlib import Path
INTRO = 2.5
ROOT = Path(__file__).resolve().parent
CAP = ROOT / "content-repo" / "content" / "paths" / "P02" / "captions"
CAP.mkdir(parents=True, exist_ok=True)
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}.{ms:03}"
fx = {}
for f in sorted(glob.glob(str(ROOT / "cues" / "*.json"))):
    d = json.load(open(f, encoding="utf-8")); cid = d["clip"]; a, b = d["start"], d["end"]
    cues = d["cues"]
    for lang in ("ar", "en"):
        out = ["WEBVTT", ""]
        for i, c in enumerate(cues, 1):
            s = max(c[0], a) - a + INTRO
            e = (cues[i][0] if i < len(cues) else b) - a + INTRO
            out += [str(i), f"{ts(s)} --> {ts(e)}", c[1 if lang == "ar" else 2], ""]
        (CAP / f"{cid}.{lang}.vtt").write_text("\n".join(out), encoding="utf-8")
    n = cid.split("-C")[1]
    fx[f"C{n}ar"] = " ".join(c[1] for c in cues)
    fx[f"C{n}en"] = " ".join(c[2] for c in cues)
    print(cid, len(cues), "cues")
# rewrite the transcript fixtures, keeping others
fp = ROOT / "content-repo" / "content" / "paths" / "P02" / "fixtures.yaml"
import yaml
cur = yaml.safe_load(open(fp, encoding="utf-8")) or {}
cur.update(fx)
with open(fp, "w", encoding="utf-8") as o:
    o.write("# Clip transcripts (C01en, C01ar, ...), shown under each clip and used as its summary source.\n")
    for k in sorted(cur):
        o.write(f"{k}: {json.dumps(cur[k], ensure_ascii=False)}\n")
