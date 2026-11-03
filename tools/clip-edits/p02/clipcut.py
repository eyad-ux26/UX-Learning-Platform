"""Cut one P02 clip from a heuristics video: the voice track and the trainer's camera.

Usage: python clipcut.py CLIP_ID "heu N" START END
Writes remotion/public/<cNN>/voice.m4a and remotion/public/<cNN>/cam.mp4, plus cuts/<CLIP_ID>.json with the
detected camera modes. The source shows the trainer either full frame or in a box at the top right of a slide.
The camera track crops the box on slides, scales the full frame otherwise, and holds the last good frame over
slides that carry no camera.
"""
import json, os, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
SRC = Path(r"D:\Eyad\UX Learning Platform\Video Courses\Usability Heuristics")
BOX = (1414, 0, 506, 334)  # x, y, w, h of the camera box on slides
FPS_SCAN = 5
W, H = 472, 320  # the presenter box ratio (236x160)
FULL = ""


def frames(src, a, b, fps):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(a), "-to", str(b), "-i", str(src), "-vf", f"fps={fps},scale=480:270",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 270, 480, 3).astype(np.int16)


def mode(f):
    s = 480 / 1920
    side = f[int(700 * s):int(1000 * s), int(20 * s):int(360 * s)]  # the slide template's teal sidebar
    band = f[int(80 * s):int(300 * s), int(560 * s):int(1380 * s)]  # white title area of a slide
    teal = (side[..., 2] - side[..., 0]).mean() > 40
    if teal and band.mean() > 200:
        box = f[0:int(334 * s), int(1402 * s):].mean(axis=2)
        return "box" if box.std() > 25 and box.mean() < 200 else "gap"
    return "full"


_CASCADE = None


def face_crop(src, a, t0, t1, region):
    """A crop (w:h:x:y in source pixels) inside `region` that centres the trainer's face, at the presenter ratio."""
    global _CASCADE
    import cv2
    if _CASCADE is None:
        _CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    rx, ry, rw, rh = region
    found = []
    for k in range(6):
        t = a + t0 + (t1 - t0) * (k + 0.5) / 6
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(src), "-frames:v", "1", "-vf",
                              f"crop={rw}:{rh}:{rx}:{ry}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
        if len(raw) != rw * rh:
            continue
        img = np.frombuffer(raw, np.uint8).reshape(rh, rw)
        faces = _CASCADE.detectMultiScale(img, 1.1, 5, minSize=(rh // 8, rh // 8))
        if len(faces):
            x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
            found.append((x + w / 2, y + h / 2, h))
    if not found:
        return None
    cx, cy, fh = (float(np.median([f[i] for f in found])) for i in range(3))
    h = min(rh, fh * float(os.environ.get("ZOOM", "2.3")))
    w = h * W / H
    if w > rw:
        w = rw; h = w * H / W
    x = min(max(cx - w / 2, 0), rw - w)
    y = min(max(cy - h * 0.42, 0), rh - h)
    return f"{int(w)}:{int(h)}:{int(rx + x)}:{int(ry + y)}"


def segments(modes, step):
    out = []
    for i, m in enumerate(modes):
        if out and out[-1][2] == m:
            out[-1][1] = (i + 1) * step
        else:
            out.append([i * step, (i + 1) * step, m])
    # drop flickers shorter than 0.6 s into their neighbour
    clean = []
    for s in out:
        if clean and s[1] - s[0] < 0.6:
            clean[-1][1] = s[1]
        elif clean and clean[-1][2] == s[2]:
            clean[-1][1] = s[1]
        else:
            clean.append(s)
    return clean


def main():
    global FULL
    cid, vid, a, b = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    FULL = sys.argv[5] if len(sys.argv) > 5 else ""  # optional w:h:x:y crop for full-frame camera shots
    key = "c" + cid.split("-C")[1]
    src = SRC / f"{vid}.mp4"
    out = ROOT / "remotion" / "public" / key
    out.mkdir(parents=True, exist_ok=True)
    dur = b - a
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-to", str(b), "-i", str(src), "-vn", "-ac", "1",
                    "-c:a", "aac", "-b:a", "128k", str(out / "voice.m4a")], check=True)
    segs = segments([mode(f) for f in frames(src, a, b, FPS_SCAN)], 1 / FPS_SCAN)
    segs[-1][1] = dur
    if segs[0][2] == "gap":
        segs[0][2] = "full"
    parts, labels = [], []
    for i, (t0, t1, m) in enumerate(segs):
        if m == "gap":
            parts[-1] = parts[-1].replace(f"[v{i - 1}]", "") + f",tpad=stop_mode=clone:stop_duration={t1 - t0:.3f}[v{i - 1}]"
            continue
        region = BOX if m == "box" else (tuple(int(n) for n in [FULL.split(":")[2], FULL.split(":")[3], FULL.split(":")[0], FULL.split(":")[1]]) if FULL else (0, 0, 1920, 1080))
        fc_ = face_crop(src, a, t0, t1, region)
        crop = f"crop={fc_}," if fc_ else (f"crop={BOX[2]}:{BOX[3]}:{BOX[0]}:{BOX[1]}," if m == "box" else (f"crop={FULL}," if FULL else ""))
        print(f"  {m} {t0:.1f}-{t1:.1f}: {crop or 'full frame'}", flush=True)
        parts.append(f"[0:v]trim=start={t0:.3f}:end={t1:.3f},setpts=PTS-STARTPTS,{crop}scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps=30[v{i}]")
        labels.append(f"[v{i}]")
    fc = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=1:a=0[out]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-to", str(b), "-i", str(src), "-filter_complex", fc,
                    "-map", "[out]", "-an", "-c:v", "libx264", "-crf", "22", "-preset", "fast", "-pix_fmt", "yuv420p",
                    str(out / "cam.mp4")], check=True)
    (ROOT / "cuts").mkdir(exist_ok=True)
    json.dump({"clip": cid, "video": vid, "start": a, "end": b, "modes": segs}, open(ROOT / "cuts" / f"{cid}.json", "w"), indent=1)
    print(cid, f"{dur:.1f}s", " ".join(f"{m}:{t0:.1f}-{t1:.1f}" for t0, t1, m in segs))


if __name__ == "__main__":
    main()
