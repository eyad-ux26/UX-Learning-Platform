"""Shared drawing kit for the UXGate soft-3D illustration set.

One light source (top left), soft floor shadow, brand materials only.
Every SVG is 240 x 240 and self-contained; ids are prefixed per file.
"""

# light, mid, shade
MAT = {
    'white': ('#FFFFFF', '#E3F0F6', '#A9C7D6'),
    'ice':   ('#F4FCFF', '#D4EEF7', '#9CC6D8'),
    'cyan':  ('#C2F5FF', '#6AD9F7', '#1C9CC9'),
    'blue':  ('#5DB8EC', '#1677C0', '#004A7C'),
    'navy':  ('#2A5B7C', '#0E3D5E', '#012E4B'),
    'gold':  ('#FFE9A0', '#FFC53F', '#D9860A'),
    'mint':  ('#E2FAEE', '#97E3C0', '#3DAA80'),
    'teal':  ('#A8E8E4', '#60BEBB', '#2B8784'),
    'coral': ('#FF9C98', '#F2545B', '#B92537'),
    'flame': ('#FFE27A', '#FF9F2E', '#E5532A'),
}

NAVY = '#012E4B'
INK2 = '#4A6577'


class Ill:
    def __init__(self, name, title):
        self.name = name
        self.title = title
        self.defs = []
        self.body = []
        self.under = []
        self.css = []
        self._n = 0
        self._mats = {}

    # ids -----------------------------------------------------------------
    def uid(self, base):
        self._n += 1
        return f'{self.name}-{base}{self._n}'

    # paints --------------------------------------------------------------
    def mat(self, m, angle='tl'):
        """Linear gradient for a material, lit from the top left."""
        key = (m, angle)
        if key in self._mats:
            return f'url(#{self._mats[key]})'
        i = self.uid('g')
        l, mid, s = MAT[m]
        x1, y1, x2, y2 = {
            'tl': (0, 0, 1, 1), 't': (0, 0, 0, 1), 'l': (0, 0, 1, 0), 'r': (1, 0, 0, 0),
        }[angle]
        self.defs.append(
            f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{l}"/><stop offset=".55" stop-color="{mid}"/>'
            f'<stop offset="1" stop-color="{s}"/></linearGradient>')
        self._mats[key] = i
        return f'url(#{i})'

    def rad(self, m, cx=.35, cy=.3, r=.8):
        i = self.uid('r')
        l, mid, s = MAT[m]
        self.defs.append(
            f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}">'
            f'<stop offset="0" stop-color="{l}"/><stop offset=".6" stop-color="{mid}"/>'
            f'<stop offset="1" stop-color="{s}"/></radialGradient>')
        return f'url(#{i})'

    def blur(self, sd):
        i = self.uid('b')
        self.defs.append(
            f'<filter id="{i}" x="-50%" y="-50%" width="200%" height="200%">'
            f'<feGaussianBlur stdDeviation="{sd}"/></filter>')
        return f'url(#{i})'

    # pieces --------------------------------------------------------------
    def add(self, s):
        self.body.append(s)

    def floor(self, cx=120, cy=214, rx=62, ry=9, op=.16):
        self.under.append(f'<ellipse class="ug-floor" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{NAVY}" '
                 f'opacity="{op}" filter="{self.blur(5)}"/>')

    def shine(self, d, op=.75, sd=1.6):
        self.add(f'<path d="{d}" fill="#fff" opacity="{op}" filter="{self.blur(sd)}"/>')

    def spark(self, x, y, s=1, color='#78E4FC', cls=''):
        c = f' class="{cls}"' if cls else ''
        self.add(f'<g transform="translate({x} {y}) scale({s})"><path{c} fill="{color}" '
                 'd="M0-9C1-3 3-1 9 0 3 1 1 3 0 9-1 3-3 1-9 0-3-1-1-3 0-9Z"/></g>')

    def dot(self, x, y, r, color, op=1):
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" opacity="{op}"/>')

    # output --------------------------------------------------------------
    def svg(self, animated=False):
        style = ''
        if self.css:
            style = ('<style>' + ''.join(self.css) +
                     '@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>')
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" '
                f'role="img" aria-labelledby="{self.name}-t"><title id="{self.name}-t">{self.title}</title>'
                f'{style}<defs>{"".join(self.defs)}'
                f'<filter id="{self.name}-lift" x="-20%" y="-20%" width="140%" height="140%">'
                f'<feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="{NAVY}" flood-opacity=".14"/></filter>'
                f'</defs>{"".join(self.under)}<g filter="url(#{self.name}-lift)">{"".join(self.body)}</g></svg>')
