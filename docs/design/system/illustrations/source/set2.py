from lib import Ill, NAVY
from set1 import star_pts


def gate():
    """Welcome: an open door with light coming through (the UXGate idea, not the logo)."""
    s = Ill('gate', 'Open gate')
    s.floor(rx=64)
    s.add(f'<path d="M70 196V84C70 54 92 34 120 34C148 34 170 54 170 84V196Z" fill="{s.mat("navy")}"/>')
    s.add(f'<path d="M82 196V88C82 64 98 48 120 48C142 48 158 64 158 88V196Z" fill="#C2F5FF"/>')
    s.add(f'<path d="M82 196V88C82 64 98 48 120 48C142 48 158 64 158 88V196Z" fill="{s.rad("cyan", .5, .55, .8)}" opacity=".6"/>')
    s.add(f'<path class="a-light" d="M120 196L64 214H176Z" fill="#78E4FC" opacity=".35" filter="{s.blur(4)}"/>')
    s.add('<g class="a-door">')
    s.add(f'<path d="M82 196V88C82 70 92 56 106 50L136 64V206L82 196Z" fill="{s.mat("white", "l")}"/>')
    s.add(f'<path d="M136 64V206" stroke="{s.mat("ice")}" stroke-width="6"/>')
    s.add(f'<circle cx="124" cy="132" r="5" fill="{s.mat("gold")}"/>')
    s.shine('M90 96C88 120 88 160 90 188C94 160 94 122 98 92Z', .7)
    s.add('</g>')
    s.spark(186, 50, 1, '#78E4FC', 'a-tw')
    s.spark(54, 66, .7, '#FFC53F', 'a-tw a-d2')
    return s


def lesson():
    s = Ill('lesson-card', 'Lesson card')
    s.floor(rx=64)
    s.add(f'<rect x="62" y="48" width="122" height="150" rx="16" fill="{s.mat("ice")}" transform="rotate(8 123 123)"/>')
    s.add(f'<rect x="56" y="42" width="122" height="150" rx="16" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="70" y="58" width="94" height="54" rx="10" fill="{s.mat("cyan")}"/>')
    s.add(f'<path d="M84 98L102 78L116 92L126 84L150 104" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>')
    s.add(f'<circle cx="146" cy="74" r="7" fill="#fff"/>')
    s.add(f'<rect x="70" y="124" width="80" height="9" rx="4.5" fill="{NAVY}" opacity=".85"/>')
    s.add(f'<rect x="70" y="140" width="94" height="7" rx="3.5" fill="#9CC6D8"/>')
    s.add(f'<rect x="70" y="153" width="64" height="7" rx="3.5" fill="#9CC6D8"/>')
    s.add(f'<rect x="70" y="170" width="52" height="14" rx="7" fill="{s.mat("blue")}"/>')
    s.add(f'<circle cx="178" cy="176" r="22" fill="{s.mat("mint")}"/>')
    s.add('<path d="M168 176L176 184L190 168" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
    return s


def video():
    s = Ill('video', 'Video lesson')
    s.floor(rx=70)
    s.add(f'<rect x="40" y="56" width="160" height="112" rx="16" fill="{s.mat("navy")}"/>')
    s.add(f'<rect x="50" y="66" width="140" height="92" rx="10" fill="{s.rad("blue", .3, .2, 1)}"/>')
    s.add(f'<path d="M112 186H128L132 200H108Z" fill="{s.mat("ice", "l")}"/>')
    s.add(f'<rect x="88" y="198" width="64" height="9" rx="4.5" fill="{s.mat("white", "t")}"/>')
    s.add(f'<circle cx="120" cy="112" r="26" fill="{s.mat("cyan")}"/>')
    s.add(f'<path d="M113 98L136 112L113 126Z" fill="{NAVY}" stroke="{NAVY}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<rect x="60" y="146" width="120" height="5" rx="2.5" fill="#fff" opacity=".3"/><rect x="60" y="146" width="56" height="5" rx="2.5" fill="#78E4FC"/>')
    s.shine('M56 72C54 96 54 124 56 148C60 124 60 96 64 72Z', .35)
    return s


def skillcheck():
    s = Ill('skill-check', 'Skill check')
    s.floor(rx=56)
    s.add(f'<rect x="66" y="44" width="108" height="150" rx="14" fill="{s.mat("blue")}"/>')
    s.add(f'<rect x="76" y="56" width="88" height="128" rx="8" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="96" y="36" width="48" height="22" rx="8" fill="{s.mat("navy", "t")}"/>')
    for i, y in enumerate((80, 112, 144)):
        done = i < 2
        fill = s.mat('mint') if done else '#fff'
        stroke = '' if done else ' stroke="#9CC6D8" stroke-width="3"'
        s.add(f'<rect x="86" y="{y - 9}" width="18" height="18" rx="5" fill="{fill}"{stroke}/>')
        if done:
            s.add(f'<path d="M90 {y}L94 {y + 4}L101 {y - 4}" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>')
        s.add(f'<rect x="112" y="{y - 4}" width="{42 if i != 1 else 34}" height="8" rx="4" fill="{"#9CC6D8" if i < 2 else NAVY}" opacity="{.9 if i < 2 else .8}"/>')
    s.add(f'<polygon points="{star_pts(172, 168, 22, 10)}" fill="{s.mat("gold")}" stroke="{s.mat("gold")}" stroke-width="6" stroke-linejoin="round"/>')
    return s


def review():
    s = Ill('review', 'Review cards')
    s.floor(rx=60)
    s.add(f'<rect x="70" y="60" width="104" height="128" rx="14" fill="{s.mat("ice")}" transform="rotate(-12 122 124)"/>')
    s.add(f'<rect x="70" y="60" width="104" height="128" rx="14" fill="{s.mat("cyan")}" transform="rotate(6 122 124)"/>')
    s.add(f'<rect x="68" y="58" width="104" height="128" rx="14" fill="{s.mat("white")}"/>')
    s.add(f'<path d="M98 112A24 24 0 0 1 140 100" fill="none" stroke="{s.mat("blue")}" stroke-width="9" stroke-linecap="round"/>')
    s.add(f'<path d="M142 132A24 24 0 0 1 100 144" fill="none" stroke="{s.mat("blue")}" stroke-width="9" stroke-linecap="round"/>')
    s.add('<path d="M132 88L144 100L128 106Z" fill="#1677C0" stroke="#1677C0" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M108 156L96 144L112 138Z" fill="#1677C0" stroke="#1677C0" stroke-width="4" stroke-linejoin="round"/>')
    s.spark(186, 62, .8, '#78E4FC')
    return s


def feedback():
    s = Ill('feedback', 'Feedback')
    s.floor(rx=60)
    s.add(f'<path d="M50 60C50 50 58 42 68 42H148C158 42 166 50 166 60V112C166 122 158 130 148 130H92L68 150V130C58 130 50 122 50 112Z" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="66" y="64" width="78" height="9" rx="4.5" fill="{NAVY}" opacity=".85"/><rect x="66" y="82" width="86" height="7" rx="3.5" fill="#9CC6D8"/><rect x="66" y="96" width="60" height="7" rx="3.5" fill="#9CC6D8"/>')
    s.add(f'<path d="M96 132C96 122 104 114 114 114H176C186 114 194 122 194 132V164C194 174 186 182 176 182H174V200L154 182H114C104 182 96 174 96 164Z" fill="{s.mat("blue")}"/>')
    s.add('<path d="M128 148L140 160L162 136" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>')
    s.shine('M56 56C54 74 54 96 58 112C62 94 62 74 66 56Z', .8)
    return s


def certificate():
    s = Ill('certificate', 'Certificate')
    s.floor(rx=72)
    s.add(f'<rect x="36" y="50" width="168" height="120" rx="12" fill="{s.mat("white")}"/>')
    s.add('<rect x="46" y="60" width="148" height="100" rx="8" fill="none" stroke="#78E4FC" stroke-width="3"/>')
    s.add(f'<rect x="80" y="76" width="80" height="10" rx="5" fill="{NAVY}" opacity=".85"/>')
    s.add('<rect x="66" y="96" width="108" height="7" rx="3.5" fill="#9CC6D8"/><rect x="80" y="110" width="80" height="7" rx="3.5" fill="#9CC6D8"/>')
    s.add('<rect x="62" y="140" width="40" height="5" rx="2.5" fill="#9CC6D8"/>')
    s.add(f'<path d="M150 150L142 196L156 186L166 198L170 156Z" fill="{s.mat("blue", "t")}"/>')
    s.add(f'<path d="M170 150L178 196L164 186L154 198L150 156Z" fill="{s.mat("cyan", "t")}"/>')
    s.add(f'<circle cx="160" cy="146" r="22" fill="{s.rad("gold", .3, .25, .9)}"/>')
    s.add(f'<polygon points="{star_pts(160, 147, 10, 4.5)}" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>')
    return s


def target():
    s = Ill('target', 'Daily goal')
    s.floor(rx=58)
    s.add(f'<circle cx="114" cy="122" r="74" fill="{s.rad("white", .35, .3, .9)}"/>')
    s.add(f'<circle cx="114" cy="122" r="56" fill="{s.mat("blue")}"/>')
    s.add(f'<circle cx="114" cy="122" r="38" fill="{s.rad("white", .35, .3, .9)}"/>')
    s.add(f'<circle cx="114" cy="122" r="20" fill="{s.mat("cyan")}"/>')
    s.add(f'<path d="M116 120L178 58" stroke="{s.mat("navy")}" stroke-width="7" stroke-linecap="round"/>')
    s.add(f'<path d="M172 46L190 40L184 58L170 64Z" fill="{s.mat("gold")}"/>')
    s.add(f'<circle cx="116" cy="120" r="5" fill="{NAVY}"/>')
    s.shine('M58 100C52 118 54 140 64 156C62 138 62 118 70 100Z', .7)
    return s


def calendar():
    s = Ill('calendar', 'Calendar')
    s.floor(rx=64)
    s.add(f'<rect x="50" y="56" width="140" height="140" rx="18" fill="{s.mat("white")}"/>')
    s.add(f'<path d="M50 74C50 64 58 56 68 56H172C182 56 190 64 190 74V96H50Z" fill="{s.mat("blue")}"/>')
    s.add(f'<rect x="80" y="42" width="12" height="30" rx="6" fill="{s.mat("navy", "l")}"/><rect x="148" y="42" width="12" height="30" rx="6" fill="{s.mat("navy", "l")}"/>')
    for r in range(3):
        for c in range(4):
            x, y = 66 + c * 28, 108 + r * 26
            on = (r * 4 + c) < 6
            fill = s.mat('cyan') if on else '#E6F3F8'
            s.add(f'<rect x="{x}" y="{y}" width="20" height="18" rx="5" fill="{fill}"/>')
    s.add(f'<circle cx="178" cy="178" r="24" fill="{s.rad("flame", .5, .8, .85)}"/>')
    s.add('<path d="M178 162C182 170 190 174 189 184C188 190 184 194 178 194C171 194 167 190 167 184C167 178 172 175 174 170C176 174 177 175 178 176C178 170 177 166 178 162Z" fill="#FFE27A"/>')
    return s


def rocket():
    s = Ill('rocket', 'Start')
    s.floor(rx=40)
    s.add(f'<path d="M120 176C112 188 114 202 120 210C126 202 128 188 120 176Z" fill="{s.rad("flame", .5, .2, .9)}"/>')
    s.add(f'<path d="M96 132L72 160L76 176L100 160Z" fill="{s.mat("blue")}"/><path d="M144 132L168 160L164 176L140 160Z" fill="{s.mat("blue", "r")}"/>')
    s.add(f'<path d="M120 30C146 52 154 92 148 160H92C86 92 94 52 120 30Z" fill="{s.mat("white", "l")}"/>')
    s.add(f'<path d="M120 30C132 40 140 52 144 64H96C100 52 108 40 120 30Z" fill="{s.mat("blue")}"/>')
    s.add(f'<circle cx="120" cy="98" r="17" fill="{s.mat("navy")}"/><circle cx="120" cy="98" r="11" fill="{s.mat("cyan")}"/>')
    s.add(f'<rect x="96" y="156" width="48" height="14" rx="6" fill="{s.mat("navy", "t")}"/>')
    s.shine('M102 74C98 100 98 128 100 150C104 128 104 100 108 74Z', .8)
    s.spark(176, 60, .9, '#78E4FC')
    s.spark(58, 92, .7, '#FFC53F')
    return s


ALL = [gate, lesson, video, skillcheck, review, feedback, certificate, target, calendar, rocket]
