#!/usr/bin/env python3
"""UXGate sound effects generator.

Every sound in this set is synthesized from scratch by this script using
plain math (sine, triangle and FM oscillators, filtered noise, envelopes and
a small algorithmic reverb). No recordings, samples, loops, presets or
third-party sound libraries are used, so the output carries no third-party
rights. Run it again to regenerate the exact same files (fixed random seed).

Usage: python3 generate_sfx.py OUT_DIR
Needs: numpy. Writes 48 kHz 16-bit mono WAV files.
"""
import sys, os, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(20261030)

# ---------- building blocks ----------

def t_axis(dur):
    return np.arange(int(SR * dur)) / SR

def note(name):
    """Note name like 'D6' or 'F#4' to Hz (A4 = 440)."""
    names = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + (octave - 4) * 12) / 12)

def env(n, a=0.002, d=0.1, s=0.0, r=0.05, hold=0.0):
    """ADSR-style envelope over n samples (exponential decay feel)."""
    out = np.zeros(n)
    ia, ih = int(a * SR), int(hold * SR)
    i = 0
    seg = min(ia, n); out[:seg] = np.linspace(0, 1, seg, endpoint=False) if seg else out[:seg]; i += seg
    seg = min(ih, n - i); out[i:i + seg] = 1; i += seg
    rest = n - i
    if rest > 0:
        tt = np.arange(rest) / SR
        out[i:] = s + (1 - s) * np.exp(-tt / max(d, 1e-4))
        rel = min(int(r * SR), rest)
        if rel > 0:
            out[n - rel:] *= np.linspace(1, 0, rel) ** 2
    return out

def sine(freq, dur, phase=0.0):
    t = t_axis(dur)
    if callable(freq):
        f = freq(t)
        return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)
    return np.sin(2 * np.pi * freq * t + phase)

def tri(freq, dur):
    t = t_axis(dur)
    ph = (freq * t) % 1.0
    return 4 * np.abs(ph - 0.5) - 1

def fm_bell(freq, dur, ratio=3.5, index=2.2, decay=0.6, bright_decay=0.15):
    """Glassy bell: FM with a decaying modulation index."""
    t = t_axis(dur)
    idx = index * np.exp(-t / bright_decay)
    mod = np.sin(2 * np.pi * freq * ratio * t)
    car = np.sin(2 * np.pi * freq * t + idx * mod)
    partial = 0.25 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t / (decay * 0.4))
    return (car + partial) * env(len(t), a=0.0015, d=decay, r=min(0.08, dur / 3))

def marimba(freq, dur, decay=0.18):
    """Soft wooden mallet: sine + fourth harmonic with fast decay."""
    t = t_axis(dur)
    body = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t / 0.03)
    return body * env(len(t), a=0.001, d=decay, r=0.03)

def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y

def onepole_hp(x, cutoff):
    return x - onepole_lp(x, cutoff)

def noise(dur):
    return rng.uniform(-1, 1, int(SR * dur))

def band_noise(dur, lo, hi):
    return onepole_lp(onepole_hp(noise(dur), lo), hi)

def sweep_noise(dur, f0, f1, q_lo=0.5):
    """Noise through a moving low-pass: a whoosh from f0 to f1 (Hz)."""
    x = noise(dur)
    n = len(x); cut = np.geomspace(f0, f1, n)
    y = np.empty(n); acc = 0.0
    a = np.exp(-2 * np.pi * cut / SR)
    for i in range(n):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return onepole_hp(y, f0 * q_lo)

def click(dur=0.012, cutoff=6000, hp=1500):
    x = onepole_hp(onepole_lp(noise(dur), cutoff), hp)
    return x * env(len(x), a=0.0003, d=0.0025, r=0.002)

def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    end = min(len(buf), i + len(sig))
    buf[i:end] += gain * sig[:end - i]
    return buf

def blank(dur):
    return np.zeros(int(SR * dur))

def reverb(x, size=0.6, mix=0.18, damp=5000):
    """Small algorithmic room: decaying filtered noise impulse, FFT convolution."""
    n_ir = int(SR * size)
    ir = noise(size) * np.exp(-np.arange(n_ir) / (SR * size / 5))
    ir = onepole_lp(ir, damp)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    n = len(x) + n_ir
    nfft = 1 << (n - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:n]
    dry = np.concatenate([x, np.zeros(n_ir)])
    return (1 - mix) * dry + mix * wet * 0.5

def finish(x, peak_db=-3.0, fade=0.01, tail_trim=True):
    x = x - np.mean(x)
    if tail_trim:
        thr = np.max(np.abs(x)) * 10 ** (-60 / 20)
        idx = np.where(np.abs(x) > thr)[0]
        if len(idx):
            x = x[:idx[-1] + int(0.02 * SR)]
    nf = min(int(fade * SR), len(x) // 4)
    if nf:
        x[-nf:] *= np.linspace(1, 0, nf)
    x[:16] *= np.linspace(0, 1, 16)
    peak = np.max(np.abs(x)) + 1e-12
    return x * (10 ** (peak_db / 20) / peak)

# ---------- the set ----------

def ui_tap():
    x = blank(0.06)
    place(x, click(0.012, 7000, 1800), 0)
    place(x, sine(1650, 0.04) * env(int(SR * 0.04), a=0.0005, d=0.012, r=0.01), 0, 0.35)
    return finish(x, -12)

def ui_toggle(up=True):
    x = blank(0.12)
    f1, f2 = (1200, 1600) if up else (1600, 1150)
    for k, f in enumerate((f1, f2)):
        s = sine(f, 0.05) * env(int(SR * 0.05), a=0.0008, d=0.015, r=0.01)
        place(x, s, k * 0.035, 0.8)
    place(x, click(0.01, 6000, 2000), 0, 0.5)
    return finish(x, -12)

def nav_switch():
    x = blank(0.09)
    place(x, click(0.01, 5000, 1200), 0, 0.8)
    place(x, tri(880, 0.06) * env(int(SR * 0.06), a=0.001, d=0.02, r=0.015), 0.004, 0.3)
    return finish(x, -13)

def select_snap():
    """Picking an answer: the selection frame snaps on."""
    x = blank(0.16)
    place(x, click(0.008, 9000, 2500), 0, 1.0)
    glide = sine(lambda t: 880 + (1175 - 880) * np.minimum(t / 0.035, 1), 0.11)
    place(x, glide * env(int(SR * 0.11), a=0.001, d=0.04, r=0.03), 0.004, 0.55)
    place(x, click(0.006, 8000, 3000), 0.045, 0.35)  # second tiny snap: the handles land
    return finish(reverb(x, 0.25, 0.12), -9)

def check_press():
    x = blank(0.16)
    body = sine(lambda t: 220 * np.exp(-t / 0.08) + 140, 0.14) * env(int(SR * 0.14), a=0.001, d=0.05, r=0.03)
    place(x, body, 0, 1.0)
    place(x, click(0.01, 4000, 800), 0, 0.5)
    return finish(x, -8)

def answer_right():
    x = blank(0.9)
    place(x, fm_bell(note('D6'), 0.6, ratio=3.0, index=1.6, decay=0.35), 0, 0.8)
    place(x, fm_bell(note('A6'), 0.7, ratio=3.0, index=1.6, decay=0.45), 0.09, 0.9)
    for i in range(6):  # small sparkle
        f = note('D7') * 2 ** (rng.integers(0, 8) / 12)
        place(x, sine(f, 0.08) * env(int(SR * 0.08), a=0.001, d=0.02, r=0.02), 0.14 + i * 0.03, 0.12)
    return finish(reverb(x, 0.8, 0.22), -4)

def answer_right_streak():
    x = blank(1.1)
    for k, n in enumerate(('D6', 'F#6', 'A6', 'D7')):
        place(x, fm_bell(note(n), 0.7, ratio=3.0, index=1.5, decay=0.4), k * 0.075, 0.75)
    return finish(reverb(x, 0.9, 0.24), -4)

def answer_wrong():
    """Gentle and low, never a buzzer."""
    x = blank(0.55)
    place(x, marimba(note('F#4'), 0.3, 0.14), 0, 0.9)
    place(x, marimba(note('D4'), 0.4, 0.2), 0.13, 1.0)
    return finish(reverb(x, 0.5, 0.15, damp=3000), -6)

def answer_also_works():
    x = blank(0.8)
    place(x, fm_bell(note('A5'), 0.6, ratio=2.0, index=1.2, decay=0.35), 0, 0.8)
    place(x, fm_bell(note('F#6'), 0.6, ratio=2.0, index=1.2, decay=0.4), 0.11, 0.7)
    return finish(reverb(x, 0.7, 0.2), -5)

def hint_open():
    """A comment pin pops onto the canvas."""
    x = blank(0.3)
    pop = sine(lambda t: 1100 * np.exp(-t / 0.03) + 520, 0.09) * env(int(SR * 0.09), a=0.001, d=0.03, r=0.02)
    place(x, pop, 0, 1.0)
    place(x, fm_bell(note('E6'), 0.25, ratio=2.0, index=0.8, decay=0.12), 0.05, 0.35)
    return finish(reverb(x, 0.3, 0.15), -8)

def reveal_answer():
    x = blank(0.7)
    w = sweep_noise(0.25, 600, 4000) * env(int(SR * 0.25), a=0.08, d=0.08, r=0.05)
    place(x, w, 0, 0.35)
    place(x, fm_bell(note('A5'), 0.5, ratio=2.0, index=0.9, decay=0.3), 0.16, 0.7)
    return finish(reverb(x, 0.6, 0.2), -7)

def sheet(up=True):
    dur = 0.28
    w = sweep_noise(dur, 500, 5000) if up else sweep_noise(dur, 4000, 400)
    w *= env(len(w), a=0.1 if up else 0.01, d=0.08, r=0.06)
    return finish(w, -14)

def xp_tick():
    x = blank(0.08)
    place(x, fm_bell(note('B6'), 0.07, ratio=4.0, index=1.0, decay=0.03), 0, 1.0)
    return finish(x, -12)

def xp_gain():
    x = blank(0.9)
    for i in range(14):
        f = note('A6') * 2 ** (rng.choice([0, 2, 4, 7, 9, 12, 14]) / 12)
        g = 0.25 + 0.75 * (1 - i / 14)
        place(x, fm_bell(f, 0.18, ratio=3.0, index=0.9, decay=0.06), 0.02 + i * 0.03, 0.4 * g)
    place(x, fm_bell(note('D7'), 0.5, ratio=2.0, index=1.0, decay=0.25), 0.0, 0.5)
    return finish(reverb(x, 0.6, 0.2), -6)

def goal_complete():
    x = blank(1.6)
    seq = ('D5', 'F#5', 'A5', 'D6')
    for k, n in enumerate(seq):
        place(x, fm_bell(note(n), 0.8, ratio=2.0, index=1.3, decay=0.4), k * 0.1, 0.7)
    for n in ('D5', 'A5', 'F#6'):
        place(x, fm_bell(note(n), 1.1, ratio=2.0, index=0.9, decay=0.7), 0.42, 0.45)
    return finish(reverb(x, 1.0, 0.25), -3)

def streak_extend():
    x = blank(1.2)
    w = sweep_noise(0.45, 300, 3500) * env(int(SR * 0.45), a=0.2, d=0.1, r=0.1)
    place(x, w, 0, 0.45)
    for k, n in enumerate(('A5', 'D6', 'F#6')):
        place(x, fm_bell(note(n), 0.7, ratio=3.0, index=1.4, decay=0.35), 0.28 + k * 0.08, 0.7)
    return finish(reverb(x, 0.9, 0.22), -4)

def streak_freeze():
    """Icy, glassy shimmer."""
    x = blank(1.2)
    for i in range(18):
        f = note('E7') * 2 ** (rng.uniform(-5, 7) / 12)
        place(x, fm_bell(f, 0.3, ratio=5.01, index=2.5, decay=0.12), i * 0.035, 0.3)
    place(x, fm_bell(note('B6'), 0.9, ratio=5.01, index=1.5, decay=0.5), 0.0, 0.5)
    return finish(reverb(x, 1.1, 0.35, damp=9000), -6)

def lesson_complete():
    x = blank(2.6)
    chords = [(('D5', 'F#5', 'A5'), 0.0), (('G5', 'B5', 'D6'), 0.32), (('A5', 'C#6', 'E6'), 0.64), (('D6', 'F#6', 'A6'), 0.98)]
    for names, at in chords:
        for k, n in enumerate(names):
            place(x, fm_bell(note(n), 1.2 if at > 0.9 else 0.7, ratio=2.0, index=1.3, decay=0.8 if at > 0.9 else 0.35), at + k * 0.045, 0.45)
    for i in range(16):
        f = note('D7') * 2 ** (rng.choice([0, 4, 7, 12]) / 12)
        place(x, sine(f, 0.1) * env(int(SR * 0.1), a=0.001, d=0.03, r=0.03), 1.0 + i * 0.04, 0.08)
    return finish(reverb(x, 1.3, 0.28), -2)

def skill_up():
    x = blank(1.0)
    rise = sine(lambda t: 400 * 2 ** (np.minimum(t / 0.35, 1) * 2), 0.4) * env(int(SR * 0.4), a=0.15, d=0.15, r=0.1)
    place(x, rise, 0, 0.35)
    place(x, fm_bell(note('A6'), 0.6, ratio=3.0, index=1.5, decay=0.35), 0.3, 0.8)
    place(x, fm_bell(note('E7'), 0.5, ratio=3.0, index=1.2, decay=0.3), 0.38, 0.5)
    return finish(reverb(x, 0.8, 0.22), -5)

def badge_unlock():
    x = blank(1.8)
    for k, n in enumerate(('D5', 'A5', 'D6', 'F#6', 'A6')):
        place(x, fm_bell(note(n), 1.3, ratio=2.0, index=1.4, decay=0.8), k * 0.03, 0.45)
    for i in range(12):
        f = note('A6') * 2 ** (rng.choice([0, 5, 7, 12, 17]) / 12)
        place(x, fm_bell(f, 0.2, ratio=4.0, index=1.0, decay=0.07), 0.2 + i * 0.05, 0.18)
    return finish(reverb(x, 1.3, 0.3), -3)

def gate_open():
    """A new unit unlocks: the gate opens with a low swell and an open fifth."""
    x = blank(1.8)
    w = sweep_noise(0.9, 150, 2500) * env(int(SR * 0.9), a=0.45, d=0.25, r=0.2)
    place(x, w, 0, 0.5)
    t = t_axis(1.4)
    pad = (np.sin(2 * np.pi * note('D3') * t) + 0.6 * np.sin(2 * np.pi * note('A3') * t) + 0.3 * np.sin(2 * np.pi * note('D4') * t))
    pad *= env(len(t), a=0.35, d=0.5, r=0.3)
    place(x, pad, 0.25, 0.45)
    place(x, fm_bell(note('A5'), 1.0, ratio=2.0, index=1.0, decay=0.6), 0.55, 0.55)
    place(x, fm_bell(note('D6'), 1.0, ratio=2.0, index=1.0, decay=0.6), 0.66, 0.5)
    return finish(reverb(x, 1.2, 0.3), -3)

def lesson_start():
    x = blank(0.7)
    w = sweep_noise(0.2, 800, 6000) * env(int(SR * 0.2), a=0.06, d=0.06, r=0.05)
    place(x, w, 0, 0.3)
    place(x, fm_bell(note('A5'), 0.4, ratio=2.0, index=1.0, decay=0.2), 0.06, 0.7)
    place(x, fm_bell(note('E6'), 0.5, ratio=2.0, index=1.0, decay=0.3), 0.14, 0.7)
    return finish(reverb(x, 0.6, 0.2), -6)

def error_soft():
    x = blank(0.3)
    for k in range(2):
        s = tri(196, 0.07) * env(int(SR * 0.07), a=0.002, d=0.03, r=0.02)
        place(x, onepole_lp(s, 1500), k * 0.1, 1.0)
    return finish(x, -9)

def notification():
    x = blank(0.7)
    place(x, fm_bell(note('E6'), 0.4, ratio=2.0, index=1.0, decay=0.2), 0, 0.7)
    place(x, fm_bell(note('B6'), 0.5, ratio=2.0, index=1.0, decay=0.3), 0.1, 0.6)
    return finish(reverb(x, 0.5, 0.18), -8)

def welcome():
    x = blank(1.6)
    for k, n in enumerate(('A5', 'D6', 'F#6', 'A6')):
        place(x, fm_bell(note(n), 1.0, ratio=2.0, index=1.2, decay=0.55), k * 0.11, 0.6)
    t = t_axis(1.2)
    pad = (np.sin(2 * np.pi * note('D4') * t) + 0.5 * np.sin(2 * np.pi * note('F#4') * t)) * env(len(t), a=0.3, d=0.5, r=0.3)
    place(x, pad, 0.1, 0.25)
    return finish(reverb(x, 1.1, 0.26), -4)

SOUNDS = [
    # (file name, function, event in the product)
    ('ui-tap', ui_tap, 'Any button or card press'),
    ('ui-toggle-on', lambda: ui_toggle(True), 'Switch, checkbox or chip turns on'),
    ('ui-toggle-off', lambda: ui_toggle(False), 'Switch, checkbox or chip turns off'),
    ('nav-switch', nav_switch, 'Toolbar or tab changes'),
    ('select-snap', select_snap, 'An answer is picked: the selection frame snaps on'),
    ('check-press', check_press, 'Check is pressed (plays before the verdict)'),
    ('answer-right', answer_right, 'Right answer'),
    ('answer-right-streak', answer_right_streak, 'Third right answer in a row'),
    ('answer-wrong', answer_wrong, 'Wrong answer (gentle, never a buzzer)'),
    ('answer-also-works', answer_also_works, 'Accepted alternative answer'),
    ('hint-open', hint_open, 'A hint comment pin appears'),
    ('reveal-answer', reveal_answer, 'Show the answer after 3 tries'),
    ('sheet-up', lambda: sheet(True), 'Feedback sheet or dialog opens'),
    ('sheet-down', lambda: sheet(False), 'Feedback sheet or dialog closes'),
    ('xp-tick', xp_tick, 'Each step of the XP count-up'),
    ('xp-gain', xp_gain, '+XP pill appears'),
    ('goal-complete', goal_complete, 'Daily goal ring closes'),
    ('streak-extend', streak_extend, 'Streak grows by one day'),
    ('streak-freeze', streak_freeze, 'A streak freeze is used or earned'),
    ('lesson-start', lesson_start, 'A lesson opens'),
    ('lesson-complete', lesson_complete, 'Lesson end screen'),
    ('skill-up', skill_up, 'A skill moves to Practiced, Shown or Kept'),
    ('badge-unlock', badge_unlock, 'Unit badge earned'),
    ('gate-open', gate_open, 'A new unit unlocks (pairs with the logo gate animation)'),
    ('welcome', welcome, 'Account created, first time on Home'),
    ('notification', notification, 'Toast or reminder'),
    ('error-soft', error_soft, 'Form or network error'),
]

def write_wav(path, x):
    pcm = np.clip(x, -1, 1)
    pcm = (pcm * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'out'
    os.makedirs(out, exist_ok=True)
    for name, fn, event in SOUNDS:
        x = fn()
        write_wav(os.path.join(out, name + '.wav'), x)
        print('%-20s %5.2fs  %s' % (name, len(x) / SR, event))
