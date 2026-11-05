import math
from lib import Ill, NAVY


def star_pts(cx, cy, R, r, n=5, rot=-90):
    pts = []
    for k in range(n * 2):
        a = math.radians(rot + k * 180 / n)
        rr = R if k % 2 == 0 else r
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return ' '.join(pts)


def trophy():
    s = Ill('trophy', 'Trophy')
    s.floor(rx=56)
    g = s.mat('gold')
    s.add('<g class="a-pop">')
    s.add(f'<path d="M84 74C58 70 54 110 90 114" fill="none" stroke="{g}" stroke-width="9" stroke-linecap="round"/>')
    s.add(f'<path d="M156 74C182 70 186 110 150 114" fill="none" stroke="{g}" stroke-width="9" stroke-linecap="round"/>')
    s.add(f'<path d="M110 132H130L132 160H108Z" fill="{s.mat("gold", "l")}"/>')
    s.add(f'<rect x="84" y="158" width="72" height="40" rx="9" fill="{s.mat("navy")}"/>')
    s.add(f'<rect x="102" y="170" width="36" height="14" rx="4" fill="{s.mat("gold")}"/>')
    s.add(f'<path d="M78 58H162V80C162 114 144 136 120 138C96 136 78 114 78 80Z" fill="{s.rad("gold", .3, .2, .95)}"/>')
    s.add('<ellipse cx="120" cy="59" rx="42" ry="7" fill="#C97C08" opacity=".55"/>')
    s.add(f'<polygon points="{star_pts(120, 94, 19, 8.5)}" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round" opacity=".95"/>')
    s.shine('M88 70C86 92 92 112 104 124C94 106 92 88 94 70Z', .7)
    s.add('</g>')
    s.spark(176, 46, 1.1, '#78E4FC', 'a-tw')
    s.spark(60, 54, .7, '#FFC53F', 'a-tw a-d2')
    s.spark(186, 120, .6, '#78E4FC', 'a-tw a-d3')
    return s


def bell():
    s = Ill('bell', 'Bell')
    s.floor(rx=54)
    s.add('<g class="a-swing">')
    s.add(f'<circle cx="120" cy="166" r="13" fill="{s.mat("gold")}"/>')
    s.add(f'<circle cx="120" cy="50" r="9" fill="{s.mat("gold")}"/>')
    s.add(f'<path d="M120 54C90 54 80 78 80 104V132L66 150H174L160 132V104C160 78 150 54 120 54Z" fill="{s.rad("gold", .3, .25, .9)}"/>')
    s.add(f'<rect x="62" y="146" width="116" height="14" rx="7" fill="{s.mat("gold", "t")}"/>')
    s.shine('M92 82C90 100 90 118 92 132C98 116 100 98 106 78Z', .7)
    s.add('</g>')
    s.add('<g class="a-badge">')
    s.add(f'<circle cx="160" cy="66" r="17" fill="{s.mat("coral")}"/>')
    s.add('<path d="M156 61L162 57V76" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
    s.add('</g>')
    s.add('<path class="a-wave" d="M52 92C48 100 48 110 52 118M42 86C36 98 36 112 42 124" fill="none" stroke="#78E4FC" stroke-width="4" stroke-linecap="round"/>')
    return s


def flame():
    s = Ill('flame', 'Streak flame')
    s.floor(rx=46)
    s.add('<g class="a-flick">')
    s.add(f'<path d="M120 36C132 68 168 84 166 132C164 170 142 192 120 192C94 192 74 170 74 138C74 110 92 96 98 74C106 94 110 98 116 104C112 80 112 58 120 36Z" fill="{s.rad("flame", .5, .8, .85)}"/>')
    s.add('<path class="a-core" d="M120 112C130 128 146 138 144 158C142 176 132 184 120 184C106 184 96 176 96 160C96 142 112 132 120 112Z" fill="#FFE27A"/>')
    s.add('<path d="M120 140C126 150 132 156 131 166C130 174 126 178 120 178C113 178 109 174 109 166C109 156 116 150 120 140Z" fill="#FFF7D6"/>')
    s.shine('M100 92C92 110 88 128 92 148C96 128 100 112 108 98Z', .55)
    s.add('</g>')
    s.spark(170, 60, .8, '#FFC53F', 'a-tw')
    s.spark(64, 82, .6, '#78E4FC', 'a-tw a-d2')
    return s


def bulb():
    s = Ill('bulb', 'Light bulb')
    s.floor(rx=40)
    s.add(f'<circle class="a-glow" cx="120" cy="94" r="64" fill="#FFD25A" opacity=".35" filter="{s.blur(14)}"/>')
    s.add(f'<path d="M120 46A48 48 0 0 1 154 128C148 136 146 142 146 150H94C94 142 92 136 86 128A48 48 0 0 1 120 46Z" fill="{s.rad("gold", .4, .35, .75)}"/>')
    s.add('<path d="M108 148V118L114 108L120 118L126 108L132 118V148" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>')
    s.add(f'<rect x="94" y="150" width="52" height="12" rx="5" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="96" y="164" width="48" height="12" rx="5" fill="{s.mat("ice")}"/>')
    s.add(f'<path d="M104 178H136C136 190 128 196 120 196C112 196 104 190 104 178Z" fill="{s.mat("navy")}"/>')
    s.shine('M96 70C88 84 88 100 94 112C96 96 102 84 112 74Z', .8)
    s.add('<path class="a-rays" d="M120 22V32M66 44L73 51M174 44L167 51M50 94H60M180 94H190" stroke="#FFC53F" stroke-width="5" stroke-linecap="round"/>')
    return s


def lock():
    s = Ill('lock', 'Locked')
    s.floor(rx=54)
    s.add(f'<path d="M90 110V82C90 62 103 50 120 50C137 50 150 62 150 82V110" fill="none" stroke="{s.mat("ice", "l")}" stroke-width="16" stroke-linecap="round"/>')
    s.add(f'<rect x="68" y="100" width="104" height="96" rx="22" fill="{s.mat("blue")}"/>')
    s.add(f'<rect x="68" y="100" width="104" height="96" rx="22" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>')
    s.add(f'<circle cx="120" cy="140" r="12" fill="{NAVY}"/><rect x="115" y="142" width="10" height="24" rx="5" fill="{NAVY}"/>')
    s.shine('M80 112C78 136 78 160 82 182C88 160 88 136 92 112Z', .45)
    return s


def gift():
    s = Ill('gift', 'Gift')
    s.floor(rx=60)
    s.add(f'<rect x="74" y="108" width="92" height="88" rx="10" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="64" y="90" width="112" height="26" rx="8" fill="{s.mat("white", "t")}"/>')
    s.add(f'<rect x="111" y="90" width="18" height="106" fill="{s.mat("blue", "l")}"/>')
    s.add('<rect x="74" y="116" width="92" height="6" fill="#9CC6D8" opacity=".5"/>')
    s.add(f'<path d="M120 90C108 66 80 62 82 80C84 92 104 92 120 90Z" fill="{s.mat("cyan")}"/>')
    s.add(f'<path d="M120 90C132 66 160 62 158 80C156 92 136 92 120 90Z" fill="{s.mat("cyan")}"/>')
    s.add(f'<circle cx="120" cy="88" r="9" fill="{s.mat("blue")}"/>')
    s.shine('M80 130C78 150 78 170 82 186C86 168 86 148 88 130Z', .8)
    s.spark(176, 64, .9, '#FFC53F')
    s.spark(58, 70, .6, '#78E4FC')
    return s


def star():
    s = Ill('xp-star', 'XP star')
    s.floor(rx=50)
    pts = star_pts(120, 112, 70, 32)
    s.add('<g class="a-spin">')
    s.add(f'<polygon points="{pts}" fill="{s.rad("gold", .35, .3, .8)}" stroke="{s.rad("gold", .35, .3, .8)}" stroke-width="14" stroke-linejoin="round"/>')
    s.add(f'<polygon points="{star_pts(120, 116, 34, 16)}" fill="#FFF3C4" opacity=".6" stroke="#FFF3C4" stroke-width="6" stroke-linejoin="round" stroke-opacity=".6"/>')
    s.shine('M98 72L112 50C108 64 106 74 108 84Z', .8)
    s.add('</g>')
    s.spark(186, 54, 1, '#78E4FC', 'a-tw')
    s.spark(54, 150, .7, '#78E4FC', 'a-tw a-d2')
    s.spark(190, 160, .5, '#FFC53F', 'a-tw a-d3')
    return s


def medal():
    s = Ill('medal', 'Skill medal')
    s.floor(rx=44)
    s.add(f'<path d="M84 30H112L132 104H104Z" fill="{s.mat("blue", "t")}"/>')
    s.add(f'<path d="M156 30H128L108 104H136Z" fill="{s.mat("cyan", "t")}"/>')
    s.add(f'<circle cx="120" cy="140" r="50" fill="{s.rad("gold", .3, .25, .9)}"/>')
    s.add(f'<circle cx="120" cy="140" r="36" fill="{s.mat("gold", "r")}" opacity=".9"/>')
    s.add(f'<polygon points="{star_pts(120, 141, 20, 9)}" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>')
    s.shine('M84 120C80 136 82 152 90 164C90 148 92 134 98 122Z', .7)
    return s


ALL = [trophy, bell, flame, bulb, lock, gift, star, medal]
