"""Accurate Arabic transcript (medium, no VAD, word times) for source windows: python retx.py "heu N:A:B" ..."""
import json, os, subprocess, sys
from pathlib import Path
for d in (Path(sys.prefix) / "Lib" / "site-packages" / "nvidia").glob("*/bin"):
    os.add_dll_directory(str(d)); os.environ["PATH"] = str(d) + os.pathsep + os.environ["PATH"]
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel(r"C:\Users\eyadm\uxgate-web\models\medium", device="cuda", compute_type="int8_float16")
out = Path(__file__).parent / "retx"; out.mkdir(exist_ok=True)
for spec in sys.argv[1:]:
    vid, a, b = spec.split(":"); a, b = float(a), float(b)
    src = rf"D:\Eyad\UX Learning Platform\Video Courses\Usability Heuristics\{vid}.mp4"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(a), "-to", str(b), "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segs, _ = m.transcribe(x, language="ar", task="transcribe", vad_filter=False, beam_size=5, word_timestamps=True, condition_on_previous_text=False)
    rows = [{"start": round(a + s.start, 2), "end": round(a + s.end, 2), "text": s.text.strip(), "words": [[round(a + w.start, 2), w.word.strip()] for w in s.words]} for s in segs]
    name = f"{vid}_{int(a)}_{int(b)}"
    json.dump(rows, open(out / f"{name}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("done", name, len(rows), flush=True)
