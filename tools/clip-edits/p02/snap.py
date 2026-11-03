"""Print the quietest moments near a time in a heuristics video: python snap.py "heu N" T [window]"""
import subprocess, sys
import numpy as np
vid, t = sys.argv[1], float(sys.argv[2]); w = float(sys.argv[3]) if len(sys.argv) > 3 else 4
src = rf"D:\Eyad\UX Learning Platform\Video Courses\Usability Heuristics\{vid}.mp4"
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t - w), "-to", str(t + w), "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(float)
hop = 800  # 50 ms
rms = np.array([np.sqrt((x[i:i + hop] ** 2).mean()) for i in range(0, len(x) - hop, hop)])
db = 20 * np.log10(rms + 1)
thr = np.percentile(db, 20) + 3
runs, cur = [], None
for i, v in enumerate(db):
    if v <= thr:
        cur = [i, i] if cur is None else [cur[0], i]
    elif cur:
        runs.append(cur); cur = None
if cur: runs.append(cur)
for a, b in runs:
    if b - a >= 3: print(f"quiet {t - w + a * 0.05:.2f} - {t - w + (b + 1) * 0.05:.2f}")
