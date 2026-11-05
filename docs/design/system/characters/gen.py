"""UXGate scenario characters: 8 original people, soft-shaded vector style.

Output: out/svg/uxgate-char-<id>-<expr>-<variant>.svg
  expr: talk, smile, think
  variant: bust (cut-out, bottom fades out) and avatar (round tile)
Same light as the illustration set: one light at the top left, glossy
highlight on the left edge, no outlines.
"""
import json, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(f'{OUT}/svg', exist_ok=True)

SKIN = {
    'light':  ('#FBE4CF', '#F0C6A2', '#D49C76'),
    'lmed':   ('#F6D6B6', '#E2AE85', '#C4875E'),
    'med':    ('#EBC29C', '#CF9A6C', '#A9714A'),
    'mdeep':  ('#D9A57A', '#B97E52', '#8E5A35'),
    'deep':   ('#BF8A5E', '#996339', '#6E4325'),
}
INK = '#1C2733'      # eyes
LIP = '#7A2E3A'      # mouth

C = {  # name: (light, base, shade)
    'blue':  ('#3A8FC4', '#005F99', '#003F66'),
    'navy':  ('#2A5B7C', '#0E3D5E', '#012E4B'),
    'cyan':  ('#B8F1FE', '#78E4FC', '#2BB5DE'),
    'teal':  ('#9EDBD8', '#60BEBB', '#3A9592'),
    'mint':  ('#BDE9D3', '#7CCBA8', '#3DAA80'),
    'ice':   ('#FFFFFF', '#F2FAFD', '#C3DDE8'),
    'sky':   ('#EAF6FC', '#CFE9F5', '#9CCBE0'),
    'sand':  ('#EBD9BC', '#CFAE7E', '#A9875A'),
    'stone': ('#C9D2D8', '#9AA7B0', '#6F7D87'),
}
TILE = {  # pastel discs behind avatars, readable on light and dark
    'teal': ('#E6F7F6', '#CDEDEB', '#A9DEDB'),
    'cyan': ('#EAFBFF', '#D2F5FE', '#A6E9FA'),
    'mint': ('#EEFAF3', '#DDF5E8', '#BCE8D1'),
    'sand': ('#FAF3E8', '#F1E6D3', '#E2CFAE'),
    'blue': ('#EAF4FB', '#D6EAF6', '#B3D6EC'),
    'sky':  ('#EEF7FC', '#DCEFF8', '#BCDDEE'),
}
HAIR = {
    'black': ('#4A3A33', '#1E1714', '#0E0A08'),
    'dark':  ('#6B4A38', '#3A271D', '#1F140E'),
    'grey':  ('#E3E6E8', '#B9BFC4', '#8C949A'),
}

CAST = [
    dict(id='sara', en='Sara', ar='سارة', role_en='Product designer', role_ar='مصممة منتجات (Product designer)',
         age='late 20s', skin='lmed', woman=True, scarf='teal', band='navy', top='blue', inner='ice', accent='teal',
         pin=True, brows='soft'),
    dict(id='hana', en='Hana', ar='هناء', role_en='Gym owner', role_ar='صاحبة نادٍ رياضي',
         age='early 30s', skin='med', woman=True, sport=True, scarf='navy', band='blue', top='cyan', inner='navy', accent='cyan',
         face=(33, 36), brows='strong'),
    dict(id='nour', en='Nour', ar='نور', role_en='Clinic manager', role_ar='مديرة عيادة',
         age='around 40', skin='light', woman=True, scarf='mint', band='teal', top='ice', inner='teal', accent='mint',
         coat=True, drape='short', face=(30, 38), brows='arched'),
    dict(id='mona', en='Mona', ar='منى', role_en='Design lead', role_ar='قائدة فريق التصميم (Design lead)',
         age='around 50', skin='mdeep', woman=True, scarf='sand', band='navy', top='navy', inner='ice', accent='sand',
         glasses=True, lines=True, brows='soft'),
    dict(id='karim', en='Karim', ar='كريم', role_en='Front-end developer', role_ar='مطوّر واجهات (Front-end developer)',
         age='mid 20s', skin='lmed', hair='curly', hcol='black', top='blue', accent='blue', hoodie=True, headphones=True,
         beard='stubble', brows='strong'),
    dict(id='tarek', en='Tarek', ar='طارق', role_en='Product manager', role_ar='مدير منتج (Product manager)',
         age='mid 30s', skin='med', hair='part', hcol='dark', top='teal', accent='sky', collar=True, beard='full', face=(34, 40),
         brows='strong'),
    dict(id='youssef', en='Youssef', ar='يوسف', role_en='Shop owner', role_ar='صاحب متجر',
         age='mid 50s', skin='mdeep', hair='bald', hcol='grey', top='sand', inner='ice', accent='sand', collar=True,
         glasses=True, mustache=True, face=(35, 38), lines=True, brows='soft'),
    dict(id='rami', en='Rami', ar='رامي', role_en='Junior designer', role_ar='مصمم مبتدئ (Junior designer)',
         age='early 20s', skin='deep', hair='fade', hcol='black', top='navy', accent='mint', tee=True, strap='mint', face=(31, 41),
         brows='soft'),
]


class Doc:
    def __init__(self, pid):
        self.pid, self.defs, self.n = pid, [], 0

    def uid(self, k):
        self.n += 1
        return f'{self.pid}-{k}{self.n}'

    def lin(self, trio, x1=0, y1=0, x2=1, y2=1):
        i = self.uid('g')
        a, b, c = trio
        self.defs.append(f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
                         f'<stop offset="0" stop-color="{a}"/><stop offset=".55" stop-color="{b}"/>'
                         f'<stop offset="1" stop-color="{c}"/></linearGradient>')
        return f'url(#{i})'

    def rad(self, trio, cx=.32, cy=.26, r=.95):
        i = self.uid('r')
        a, b, c = trio
        self.defs.append(f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">'
                         f'<stop offset="0" stop-color="{a}"/><stop offset=".6" stop-color="{b}"/>'
                         f'<stop offset="1" stop-color="{c}"/></radialGradient>')
        return f'url(#{i})'

    def blur(self, sd):
        i = self.uid('b')
        self.defs.append(f'<filter id="{i}" x="-50%" y="-50%" width="200%" height="200%">'
                         f'<feGaussianBlur stdDeviation="{sd}"/></filter>')
        return f'url(#{i})'

    def clip(self, inner):
        i = self.uid('c')
        self.defs.append(f'<clipPath id="{i}">{inner}</clipPath>')
        return f'url(#{i})'


FACE_W = dict(cx=120, cy=100, rx=31, ry=37)
FACE_M = dict(cx=120, cy=100, rx=33, ry=39)


def ell(d, **kw):
    a = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in kw.items())
    return f'<ellipse cx="{d["cx"]}" cy="{d["cy"]}" rx="{d["rx"]}" ry="{d["ry"]}" {a}/>'


def gloss(doc, d, op=.55):
    return f'<path d="{d}" fill="#fff" opacity="{op}" filter="{doc.blur(2.2)}"/>'


def body(doc, p):
    """Torso and neck. Returns svg."""
    s = []
    sk = SKIN[p['skin']]
    top = C[p['top']]
    torso = 'M44 236 C44 190 62 164 100 154 L140 154 C178 164 196 190 196 236 Z'
    # neck
    s.append(f'<path d="M106 120 H134 V158 C134 166 106 166 106 158 Z" fill="{doc.lin((sk[1], sk[2], sk[2]), 0, 0, 0, 1)}"/>')
    s.append(f'<path d="{torso}" fill="{doc.lin(top, 0, 0, 1, 1)}"/>')
    if p.get('coat'):
        inner = C[p['inner']]
        s.append(f'<path d="M100 156 L120 200 L140 156 C134 168 106 168 100 156Z" fill="{doc.lin(inner, 0, 0, 1, 1)}"/>')
        # lapels
        s.append(f'<path d="M100 155 L120 202 L108 236 H96 L92 190 Z" fill="#E4F1F6"/>')
        s.append(f'<path d="M140 155 L120 202 L132 236 H144 L148 190 Z" fill="#D3E6EE"/>')
        # stethoscope
        s.append('<path d="M100 160 C92 186 100 206 112 210" fill="none" stroke="#0E3D5E" stroke-width="4" stroke-linecap="round"/>')
        s.append('<path d="M140 160 C148 186 140 206 128 210" fill="none" stroke="#0E3D5E" stroke-width="4" stroke-linecap="round"/>')
        s.append('<path d="M112 210 Q120 214 128 210" fill="none" stroke="#0E3D5E" stroke-width="4" stroke-linecap="round"/>')
        s.append('<circle cx="120" cy="220" r="7" fill="#9AA7B0"/><circle cx="118" cy="218" r="2.5" fill="#fff" opacity=".8"/>')
        s.append('<path d="M120 212 V214" stroke="#0E3D5E" stroke-width="4"/>')
    elif p.get('hoodie'):
        hood = C[p['top']]
        s.append(f'<path d="M84 162 C92 150 104 148 120 152 C136 148 148 150 156 162 C150 176 134 182 120 182 C106 182 90 176 84 162Z" fill="{doc.lin((hood[0], hood[2], hood[2]), 0, 0, 0, 1)}" opacity=".9"/>')
        s.append('<path d="M110 176 V204 M130 176 V204" stroke="#B8F1FE" stroke-width="3" stroke-linecap="round"/>')
        s.append('<circle cx="110" cy="206" r="3" fill="#B8F1FE"/><circle cx="130" cy="206" r="3" fill="#B8F1FE"/>')
        s.append('<path d="M84 214 H156 V236 H84Z" fill="#003F66" opacity=".35"/>')
    elif p.get('collar'):
        inner = C.get(p.get('inner'), C['ice'])
        if p['top'] == 'sand':  # sweater over a shirt
            s.append(f'<path d="M104 156 L120 184 L136 156 Z" fill="{doc.lin(inner, 0, 0, 1, 1)}"/>')
            s.append('<path d="M104 156 L114 170 L120 158 Z M136 156 L126 170 L120 158 Z" fill="#fff"/>')
            s.append('<path d="M100 155 L120 190 L140 155" fill="none" stroke="#A9875A" stroke-width="4" stroke-linejoin="round"/>')
        else:  # open collar shirt
            s.append('<path d="M106 156 L120 176 L134 156 Z" fill="#B97E52" opacity=".0"/>')
            s.append(f'<path d="M106 155 L120 176 L134 155 C128 162 112 162 106 155Z" fill="{SKIN[p["skin"]][2]}"/>')
            s.append('<path d="M104 152 L96 172 L118 176 Z" fill="#EAF6FC"/><path d="M136 152 L144 172 L122 176 Z" fill="#DCEFF8"/>')
            s.append('<path d="M120 178 V236" stroke="#9CCBE0" stroke-width="2"/><circle cx="120" cy="196" r="2" fill="#9CCBE0"/><circle cx="120" cy="216" r="2" fill="#9CCBE0"/>')
    elif p.get('tee'):
        s.append(f'<path d="M104 155 C108 166 132 166 136 155" fill="none" stroke="{C["navy"][2]}" stroke-width="5"/>')
        s.append('<circle cx="140" cy="200" r="9" fill="#78E4FC"/><path d="M134 200 H146" stroke="#012E4B" stroke-width="2.4" stroke-linecap="round"/>')
        st = C[p['strap']]
        s.append(f'<path d="M78 236 C76 206 80 180 90 162 L100 166 C90 182 88 206 90 236 Z" fill="{doc.lin(st, 0, 0, 1, 1)}"/>')
        s.append(f'<path d="M162 236 C164 206 160 180 150 162 L140 166 C150 182 152 206 150 236 Z" fill="{doc.lin(st, 1, 0, 0, 1)}"/>')
    elif p.get('sport'):
        inner = C[p['inner']]
        s.append(f'<path d="M110 168 H130 V236 H110 Z" fill="{doc.lin(inner, 0, 0, 1, 0)}" opacity=".0"/>')
        s.append('<path d="M120 172 V236" stroke="#0E3D5E" stroke-width="3"/>')
        s.append('<rect x="116" y="184" width="8" height="12" rx="3" fill="#0E3D5E"/>')
        s.append('<path d="M60 236 C62 210 70 190 84 176" fill="none" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round"/>')
        s.append('<path d="M180 236 C178 210 170 190 156 176" fill="none" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round"/>')
    elif p.get('woman'):
        inner = C[p['inner']]
        s.append(f'<path d="M96 186 L120 236 L144 186 Z" fill="{doc.lin(inner, 0, 0, 1, 1)}"/>')
    if p.get('headphones'):
        s.append('<path d="M90 166 C96 184 144 184 150 166" fill="none" stroke="#012E4B" stroke-width="5" stroke-linecap="round"/>')
        for x, r in ((86, -20), (154, 20)):
            s.append(f'<g transform="rotate({r} {x} 160)"><rect x="{x - 10}" y="146" width="20" height="28" rx="9" fill="{doc.lin(C["navy"], 0, 0, 1, 1)}"/>'
                     f'<rect x="{x - 6}" y="150" width="12" height="20" rx="6" fill="{doc.lin(C["cyan"], 0, 0, 1, 1)}"/></g>')
    # gloss on left shoulder
    s.append(gloss(doc, 'M58 226 C58 200 68 182 88 170 C76 184 70 204 70 226 Z', .45))
    return ''.join(s)


def scarf(doc, p, front):
    sc = C[p['scarf']]
    if p.get('sport'):
        outer = ('M120 50 C146 50 162 70 162 100 C162 126 160 142 166 154 C170 166 152 176 120 176 '
                 'C88 176 70 166 74 154 C80 142 78 126 78 100 C78 70 94 50 120 50 Z')
    else:
        if p.get('drape') == 'short':
            outer = ('M120 48 C147 48 164 68 164 99 C164 124 161 140 167 152 C173 166 152 178 120 178 '
                     'C88 178 67 166 73 152 C79 140 76 124 76 99 C76 68 93 48 120 48 Z')
        else:
            outer = ('M120 48 C147 48 164 68 164 99 C164 124 162 140 168 154 C176 172 166 192 146 198 '
                     'C134 202 106 202 94 198 C74 192 64 172 72 154 C78 140 76 124 76 99 C76 68 93 48 120 48 Z')
    fw = p.get('face', (FACE_W['rx'], FACE_W['ry']))
    hx, hy, hrx, hry = 120, 103, fw[0] - 2.5, fw[1] - 2.5   # face opening, a little smaller than the face
    hole = f'M{hx - hrx} {hy} a{hrx} {hry} 0 1 0 {2 * hrx} 0 a{hrx} {hry} 0 1 0 {-2 * hrx} 0Z'
    if not front:
        return f'<path d="{outer}" fill="{sc[2]}"/>'
    s = []
    band = C[p['band']]
    hp = doc.clip(f'<path d="{hole}"/>')
    # under-scarf band on the forehead, seen through the opening
    s.append(f'<g clip-path="{hp}"><path d="M80 50 H160 V80 Q120 68 80 80 Z" fill="{doc.lin(band, 0, 0, 1, 1)}"/>'
             f'<path d="M80 80 Q120 68 160 80" fill="none" stroke="{band[2]}" stroke-width="3" opacity=".5" filter="{doc.blur(1.2)}"/></g>')
    # the scarf itself, with the face opening cut out
    s.append(f'<path d="{outer} {hole}" fill-rule="evenodd" fill="{doc.lin(sc, 0, 0, 1, 1)}"/>')
    # depth: soft shade inside the opening edge
    s.append(f'<g clip-path="{hp}"><path d="{hole}" fill="none" stroke="{sc[2]}" stroke-width="5" opacity=".35" filter="{doc.blur(1.6)}"/></g>')
    # shade under the chin where the scarf wraps
    s.append(f'<path d="M98 140 C108 148 132 148 142 140 C134 152 106 152 98 140Z" fill="{sc[2]}" opacity=".45"/>')
    if p.get('pin'):
        s.append(f'<circle cx="151" cy="128" r="4.5" fill="{doc.rad(C["cyan"], .3, .3, 1)}"/><circle cx="149.6" cy="126.6" r="1.4" fill="#fff"/>')
    # gloss on the left edge of the scarf
    s.append(gloss(doc, 'M84 72 C78 92 78 124 84 146 C86 124 86 94 92 74 Z', .5))
    # the wrap: fabric crossing from the temple to under the chin
    s.append(f'<path d="M156 80 C160 112 150 140 116 150" fill="none" stroke="{sc[2]}" stroke-width="3" opacity=".45" stroke-linecap="round"/>')
    s.append(f'<path d="M157 84 C160 112 151 138 120 147" fill="none" stroke="{sc[0]}" stroke-width="1.6" opacity=".55" stroke-linecap="round"/>')
    if not p.get('sport') and p.get('drape') != 'short':
        # a soft fold across the drape
        s.append(f'<path d="M80 168 C100 184 140 186 162 170" fill="none" stroke="{sc[2]}" stroke-width="3" opacity=".35" stroke-linecap="round"/>')
    return ''.join(s)


def hair(doc, p, back):
    kind, h = p.get('hair'), HAIR[p.get('hcol', 'black')]
    if back:
        return ''
    s = []
    g = doc.lin(h, 0, 0, 1, 1)
    if kind == 'curly':
        s.append(f'<path d="M86 96 C82 64 100 50 120 50 C140 50 158 64 154 96 C150 84 138 76 120 76 C102 76 90 84 86 96Z" fill="{g}"/>')
        for cx, cy, r in [(90, 78, 11), (98, 64, 12), (111, 55, 12), (126, 54, 12), (140, 60, 12), (150, 72, 11),
                          (104, 72, 10), (120, 66, 10), (136, 70, 10)]:
            s.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{doc.rad(h, .3, .25, 1)}"/>')
        s.append(gloss(doc, 'M94 62 C100 56 108 52 116 52 C108 56 100 60 96 66 Z', .35))
    elif kind == 'part':
        s.append(f'<path d="M86 100 C80 66 98 50 122 50 C146 50 160 66 154 100 C152 88 148 80 142 74 '
                 f'C126 82 104 82 92 86 C89 90 87 95 86 100Z" fill="{g}"/>')
        s.append(f'<path d="M104 56 C116 60 130 64 142 74" fill="none" stroke="{h[0]}" stroke-width="2" opacity=".6"/>')
        s.append(gloss(doc, 'M92 74 C96 62 104 56 114 54 C106 60 100 66 96 78 Z', .3))
    elif kind == 'fade':
        s.append(f'<path d="M87 94 C85 64 101 52 120 52 C139 52 155 64 153 94 C151 86 147 81 141 79 '
                 f'C132 76 108 76 99 79 C93 81 89 86 87 94Z" fill="{g}"/>')
        s.append(f'<path d="M87 94 C87 100 88 106 90 110 L92 108 C91 102 91 97 91 90Z" fill="{h[1]}"/>')
        s.append(f'<path d="M153 94 C153 100 152 106 150 110 L148 108 C149 102 149 97 149 90Z" fill="{h[1]}"/>')
        for i, x in enumerate(range(98, 144, 6)):
            y = 60 + (i % 2) * 6
            s.append(f'<circle cx="{x}" cy="{y}" r="1.4" fill="{h[0]}" opacity=".5"/>')
    elif kind == 'bald':
        s.append(f'<path d="M86 104 C84 92 86 84 90 78 C92 88 92 96 94 106 Z" fill="{g}"/>')
        s.append(f'<path d="M154 104 C156 92 154 84 150 78 C148 88 148 96 146 106 Z" fill="{g}"/>')
        s.append(f'<path d="M104 64 C112 60 128 60 136 64" fill="none" stroke="{h[1]}" stroke-width="3" opacity=".5" stroke-linecap="round"/>')
    return ''.join(s)


def face(doc, p, expr):
    s = []
    sk = SKIN[p['skin']]
    f = dict(FACE_W if p.get('woman') else FACE_M)
    if p.get('face'):
        f['rx'], f['ry'] = p['face']
    if not p.get('woman'):  # ears
        for x in (f['cx'] - f['rx'], f['cx'] + f['rx']):
            s.append(f'<ellipse cx="{x}" cy="104" rx="7" ry="10" fill="{sk[2]}"/>')
            s.append(f'<ellipse cx="{x}" cy="104" rx="3" ry="5" fill="{sk[1]}" opacity=".7"/>')
    s.append(ell(f, fill=doc.rad(sk)))
    # soft jaw shadow
    s.append(f'<path d="M{f["cx"] - f["rx"] + 6} 116 C96 140 144 140 {f["cx"] + f["rx"] - 6} 116 C140 134 100 134 {f["cx"] - f["rx"] + 6} 116Z" fill="{sk[2]}" opacity=".18"/>')
    # beard
    hc = HAIR[p.get('hcol', 'black')]
    if p.get('beard') == 'full':
        s.append(f'<path d="M88 102 C88 132 102 142 120 142 C138 142 152 132 152 102 C150 116 146 122 140 124 '
                 f'C132 116 108 116 100 124 C94 122 90 116 88 102Z" fill="{doc.lin(hc, 0, 0, 1, 1)}"/>')
    elif p.get('beard') == 'stubble':
        s.append(f'<path d="M90 106 C90 132 104 140 120 140 C136 140 150 132 150 106 C148 120 140 128 120 128 C100 128 92 120 90 106Z" fill="{hc[1]}" opacity=".08"/>')
    # cheeks
    s.append(f'<ellipse cx="100" cy="114" rx="7" ry="4" fill="#E9867A" opacity=".22"/>')
    s.append(f'<ellipse cx="140" cy="114" rx="7" ry="4" fill="#E9867A" opacity=".22"/>')
    # eyebrows
    bw = 3.6 if p.get('brows') == 'strong' else 2.8
    bc = HAIR[p['hcol']][1] if not p.get('woman') else '#2E211B'
    if p.get('hcol') == 'grey':
        bc = '#7D858B'
    if expr == 'think':
        L, R = 'M97 88 Q105 86 112 88', 'M128 83 Q135 78 143 83'
    elif expr == 'talk':
        L, R = 'M97 86 Q105 81 112 84', 'M128 84 Q135 81 143 86'
    else:
        L, R = 'M97 87 Q105 83 112 86', 'M128 86 Q135 83 143 87'
    if p.get('brows') == 'arched' and expr != 'think':
        L, R = 'M98 88 Q103 81 112 85', 'M128 85 Q137 81 142 88'
        bw = 2.4
    s.append(f'<path d="{L}" fill="none" stroke="{bc}" stroke-width="{bw}" stroke-linecap="round"/>')
    s.append(f'<path d="{R}" fill="none" stroke="{bc}" stroke-width="{bw}" stroke-linecap="round"/>')
    # eyes
    dx, dy = (2.2, -2) if expr == 'think' else (0, 0)
    for ex in (105, 135):
        if expr == 'smile':
            s.append(f'<path d="M{ex - 5} 101 Q{ex} 95 {ex + 5} 101" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
        else:
            s.append(f'<ellipse cx="{ex + dx}" cy="{100 + dy}" rx="4.2" ry="5.2" fill="{INK}"/>')
            s.append(f'<circle cx="{ex + dx - 1.4}" cy="{98 + dy}" r="1.4" fill="#fff"/>')
    if p.get('woman') and expr != 'smile':
        s.append(f'<path d="M100 97 L97.5 94.5 M140 97 L142.5 94.5" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>')
    if p.get('lines'):
        s.append(f'<path d="M104 118 Q102 124 105 128 M136 118 Q138 124 135 128" fill="none" stroke="{sk[2]}" stroke-width="1.8" opacity=".7" stroke-linecap="round"/>')
        if not p.get('woman'):
            s.append(f'<path d="M108 74 Q120 71 132 74 M111 80 Q120 78 129 80" fill="none" stroke="{sk[2]}" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>')
    # nose
    s.append(f'<path d="M118 104 Q116 112 120 113 Q123 113 124 111" fill="none" stroke="{sk[2]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')
    # mustache
    if p.get('mustache'):
        s.append(f'<path d="M104 120 Q112 112 120 116 Q128 112 136 120 Q128 120 120 119 Q112 120 104 120Z" fill="{doc.lin(hc, 0, 0, 1, 1)}"/>')
    # mouth
    if expr == 'talk':
        s.append(f'<path d="M110 121 Q120 120 130 121 Q128 133 120 133 Q112 133 110 121Z" fill="{LIP}"/>')
        s.append('<path d="M112 122 Q120 121.4 128 122 L127.4 124.6 Q120 124 112.6 124.6Z" fill="#fff"/>')
        s.append('<ellipse cx="120" cy="130" rx="5" ry="2.4" fill="#D9707C"/>')
    elif expr == 'smile':
        s.append(f'<path d="M108 120 Q120 132 132 120" fill="none" stroke="{LIP}" stroke-width="3.2" stroke-linecap="round"/>')
    else:
        s.append(f'<path d="M113 125 Q120 122 128 124" fill="none" stroke="{LIP}" stroke-width="3" stroke-linecap="round"/>')
    # glasses
    if p.get('glasses'):
        s.append('<g fill="#fff" fill-opacity=".14" stroke="#0E3D5E" stroke-width="2.6">'
                 '<rect x="93" y="91" width="23" height="18" rx="7"/><rect x="124" y="91" width="23" height="18" rx="7"/></g>'
                 '<path d="M116 98 Q120 95 124 98" fill="none" stroke="#0E3D5E" stroke-width="2.6"/>')
        if not p.get('woman'):
            s.append('<path d="M93 98 L88 97 M147 98 L152 97" stroke="#0E3D5E" stroke-width="2.6"/>')
    # face gloss
    s.append(gloss(doc, f'M{f["cx"] - f["rx"] + 5} 92 C{f["cx"] - f["rx"] + 4} 78 98 68 108 66 C100 72 96 82 96 96 Z', .4))
    return ''.join(s)


def character(p, expr, variant):
    pid = f'{p["id"]}-{expr}-{variant}'
    doc = Doc(pid)
    parts = []
    if p.get('woman'):
        parts.append(body(doc, p))
        parts.append(scarf(doc, p, front=False))
        parts.append(face(doc, p, expr))
        parts.append(scarf(doc, p, front=True))
    else:
        parts.append(body(doc, p))
        parts.append(face(doc, p, expr))
        parts.append(hair(doc, p, back=False))
    fig = f'<g transform="translate(120 128) scale(1.16) translate(-120 -118)">' + ''.join(parts) + '</g>'
    acc = C[p['accent']]
    if variant == 'avatar':
        # round tile: tinted disc, person clipped to it, head may sit above the rim
        t = TILE[p['accent']]
        disc = f'<circle cx="120" cy="124" r="100" fill="{doc.rad((t[0], t[1], t[2]), .3, .2, 1.1)}"/>'
        cp = doc.clip('<circle cx="120" cy="124" r="100"/>')
        art = disc + f'<g clip-path="{cp}">{fig}</g>'
    else:
        mid = doc.uid('m')
        doc.defs.append(f'<linearGradient id="{mid}-g" x1="0" y1="0" x2="0" y2="1">'
                        f'<stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
                        f'<mask id="{mid}"><rect width="240" height="240" fill="url(#{mid}-g)"/></mask>')
        art = f'<g mask="url(#{mid})">{fig}</g>'
    title = f'{p["en"]}, {p["role_en"].lower()} ({expr})'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" '
            f'aria-labelledby="{pid}-t"><title id="{pid}-t">{title}</title><defs>{"".join(doc.defs)}</defs>{art}</svg>')


if __name__ == '__main__':
    files = []
    for p in CAST:
        for e in ('talk', 'smile', 'think'):
            for v in ('bust', 'avatar'):
                name = f'uxgate-char-{p["id"]}-{e}-{v}.svg'
                open(f'{OUT}/svg/{name}', 'w').write(character(p, e, v))
                files.append(name)
    meta = [{k: p[k] for k in ('id', 'en', 'ar', 'role_en', 'role_ar', 'age')} for p in CAST]
    json.dump(meta, open(f'{OUT}/cast.json', 'w'), ensure_ascii=False, indent=1)
    print(len(files), 'files')
