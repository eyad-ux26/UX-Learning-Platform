from lib import Ill, NAVY

CORAL = '#F2545B'


def empty():
    s = Ill('empty-box', 'Empty box')
    s.floor(rx=66)
    s.add(f'<path d="M60 100L120 84L180 100L120 116Z" fill="{s.mat("navy")}"/>')
    s.add(f'<path d="M60 100L120 116V196L60 178Z" fill="{s.mat("white", "l")}"/>')
    s.add(f'<path d="M180 100L120 116V196L180 178Z" fill="{s.mat("ice", "r")}"/>')
    s.add(f'<path d="M60 100L36 76L96 62L120 84Z" fill="{s.mat("white")}"/>')
    s.add(f'<path d="M180 100L204 76L144 62L120 84Z" fill="{s.mat("ice")}"/>')
    s.add('<path d="M120 116V196" stroke="#9CC6D8" stroke-width="2"/>')
    s.add(f'<rect x="78" y="140" width="28" height="7" rx="3.5" fill="#78E4FC" transform="skewY(15)"/>')
    s.spark(186, 44, .8, '#78E4FC')
    s.spark(60, 44, .6, '#FFC53F')
    return s


def offline():
    s = Ill('offline', 'Offline')
    s.floor(rx=64)
    s.add('<g class="a-float">')
    s.add(f'<path d="M72 168C50 168 38 152 38 136C38 118 52 106 70 106C74 80 94 62 120 62C146 62 164 78 170 100C190 100 204 116 204 134C204 152 190 168 170 168Z" fill="{s.rad("white", .35, .25, .95)}"/>')
    s.shine('M60 120C56 132 58 146 66 154C64 142 66 130 72 122Z', .8)
    s.add(f'<path d="M96 132C110 120 130 120 144 132M106 146C114 140 126 140 134 146" fill="none" stroke="#9CC6D8" stroke-width="6" stroke-linecap="round"/>')
    s.add('<circle cx="120" cy="158" r="5" fill="#9CC6D8"/>')
    s.add('</g>')
    s.add('<g class="a-badge">')
    s.add(f'<circle cx="168" cy="160" r="26" fill="{s.mat("coral")}"/>')
    s.add('<path d="M156 160H180" stroke="#fff" stroke-width="7" stroke-linecap="round"/>')
    s.add('</g>')
    return s


def search():
    s = Ill('search', 'Search')
    s.floor(rx=56)
    s.add('<g class="a-orbit">')
    s.add(f'<path d="M140 140L182 182" stroke="{s.mat("navy")}" stroke-width="20" stroke-linecap="round"/>')
    s.add(f'<circle cx="106" cy="104" r="54" fill="{s.mat("blue")}"/>')
    s.add(f'<circle cx="106" cy="104" r="40" fill="{s.rad("cyan", .35, .3, .9)}"/>')
    s.add('<path d="M84 86A28 28 0 0 1 112 76" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/>')
    s.add('</g>')
    s.spark(182, 58, .9, '#78E4FC', 'a-tw')
    return s


def shield():
    s = Ill('shield', 'Saved and safe')
    s.floor(rx=52)
    s.add(f'<path d="M120 36L178 58V112C178 152 152 182 120 196C88 182 62 152 62 112V58Z" fill="{s.mat("blue")}"/>')
    s.add(f'<path d="M120 52L164 68V112C164 144 144 168 120 180C96 168 76 144 76 112V68Z" fill="{s.rad("cyan", .35, .25, .95)}"/>')
    s.add('<path class="a-draw" pathLength="1" d="M98 114L114 130L144 98" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>')
    s.shine('M72 70C70 100 74 132 88 160C82 130 80 100 84 72Z', .5)
    return s


def card():
    s = Ill('payment', 'Payment')
    s.floor(rx=72)
    s.add(f'<rect x="52" y="64" width="150" height="96" rx="14" fill="{s.mat("cyan")}" transform="rotate(-10 127 112)"/>')
    s.add(f'<rect x="38" y="80" width="150" height="96" rx="14" fill="{s.mat("blue")}"/>')
    s.add(f'<rect x="38" y="98" width="150" height="16" fill="{NAVY}" opacity=".85"/>')
    s.add(f'<rect x="54" y="126" width="28" height="20" rx="4" fill="{s.mat("gold")}"/>')
    s.add('<rect x="54" y="156" width="64" height="7" rx="3.5" fill="#fff" opacity=".7"/>')
    s.add(f'<circle cx="178" cy="168" r="24" fill="{s.mat("mint")}"/>')
    s.add('<path d="M167 168L175 176L190 160" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
    s.shine('M44 92C42 120 42 148 46 168C50 146 50 120 52 92Z', .4)
    return s


def mail():
    s = Ill('mail', 'Email')
    s.floor(rx=66)
    s.add(f'<rect x="78" y="58" width="84" height="80" rx="8" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="90" y="72" width="50" height="8" rx="4" fill="{NAVY}" opacity=".8"/><rect x="90" y="88" width="60" height="6" rx="3" fill="#9CC6D8"/><rect x="90" y="100" width="44" height="6" rx="3" fill="#9CC6D8"/>')
    s.add(f'<path d="M54 106L120 152L186 106V182C186 190 180 196 172 196H68C60 196 54 190 54 182Z" fill="{s.mat("blue")}"/>')
    s.add(f'<path d="M54 196L106 146L120 156L134 146L186 196Z" fill="{s.mat("cyan", "t")}"/>')
    s.add(f'<circle cx="178" cy="70" r="16" fill="{s.mat("coral")}"/>')
    s.add('<path d="M174 66L180 62V78" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
    return s


def error():
    s = Ill('error', 'Something went wrong')
    s.floor(rx=70)
    s.add(f'<rect x="40" y="50" width="160" height="124" rx="14" fill="{s.mat("white")}"/>')
    s.add(f'<path d="M40 64C40 56 46 50 54 50H186C194 50 200 56 200 64V74H40Z" fill="{s.mat("navy")}"/>')
    s.add('<circle cx="54" cy="62" r="4" fill="#F2545B"/><circle cx="66" cy="62" r="4" fill="#FFC53F"/><circle cx="78" cy="62" r="4" fill="#60BEBB"/>')
    s.add('<rect x="58" y="90" width="70" height="8" rx="4" fill="#9CC6D8"/><rect x="58" y="106" width="50" height="8" rx="4" fill="#9CC6D8"/>')
    s.add(f'<path d="M150 98L192 170H108Z" fill="{s.mat("gold")}" stroke="{s.mat("gold")}" stroke-width="10" stroke-linejoin="round"/>')
    s.add(f'<path d="M150 122V146" stroke="{NAVY}" stroke-width="8" stroke-linecap="round"/><circle cx="150" cy="160" r="5" fill="{NAVY}"/>')
    return s


def freeze():
    s = Ill('streak-freeze', 'Streak freeze')
    s.floor(rx=54)
    s.add(f'<rect x="64" y="60" width="112" height="124" rx="26" fill="{s.rad("cyan", .3, .25, 1)}" opacity=".95"/>')
    s.add(f'<rect x="64" y="60" width="112" height="124" rx="26" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>')
    s.add('<g stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none">'
          '<path d="M120 90V154M92 106L148 138M148 106L92 138"/>'
          '<path d="M110 94L120 102L130 94M110 150L120 142L130 150"/></g>')
    s.shine('M78 74C74 100 74 140 80 168C84 140 84 102 90 76Z', .8)
    s.spark(186, 56, .9, '#fff')
    s.spark(58, 70, .7, '#78E4FC')
    return s


def path_forms():
    s = Ill('path-forms', 'Forms path')
    s.floor(rx=62)
    s.add(f'<rect x="58" y="36" width="116" height="160" rx="16" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="72" y="52" width="60" height="9" rx="4.5" fill="{NAVY}" opacity=".85"/>')
    for y in (72, 104):
        s.add('<rect x="72" y="%d" width="40" height="6" rx="3" fill="#9CC6D8"/>' % y)
        s.add(f'<rect x="72" y="{y + 10}" width="88" height="16" rx="6" fill="#F2FAFD" stroke="#9CC6D8" stroke-width="2"/>')
    s.add('<rect x="72" y="136" width="40" height="6" rx="3" fill="#9CC6D8"/>')
    s.add('<rect x="72" y="146" width="88" height="16" rx="6" fill="#F2FAFD" stroke="#1677C0" stroke-width="2.5"/>')
    s.add(f'<rect x="72" y="172" width="88" height="14" rx="7" fill="{s.mat("blue")}"/>')
    s.add(f'<g transform="rotate(40 172 120)"><rect x="164" y="64" width="16" height="96" rx="5" fill="{s.mat("gold", "l")}"/>'
          f'<path d="M164 160H180L172 180Z" fill="#FFE9A0"/><path d="M169 172H175L172 180Z" fill="{NAVY}"/>'
          f'<rect x="164" y="60" width="16" height="14" rx="5" fill="{s.mat("coral", "l")}"/></g>')
    return s


def path_hierarchy():
    s = Ill('path-hierarchy', 'Visual hierarchy path')
    s.floor(rx=66)
    s.add(f'<rect x="88" y="40" width="108" height="76" rx="12" fill="{s.mat("ice")}"/>')
    s.add(f'<rect x="66" y="74" width="116" height="84" rx="12" fill="{s.mat("cyan")}"/>')
    s.add(f'<rect x="44" y="110" width="124" height="88" rx="14" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="58" y="126" width="80" height="14" rx="7" fill="{NAVY}" opacity=".9"/>')
    s.add('<rect x="58" y="148" width="96" height="7" rx="3.5" fill="#9CC6D8"/><rect x="58" y="161" width="70" height="7" rx="3.5" fill="#9CC6D8"/>')
    s.add(f'<rect x="58" y="176" width="46" height="12" rx="6" fill="{s.mat("blue")}"/>')
    s.add('<g fill="none" stroke="#1677C0" stroke-width="2"><rect x="54" y="121" width="88" height="24" rx="2"/></g>'
          '<g fill="#fff" stroke="#1677C0" stroke-width="2"><rect x="50" y="117" width="8" height="8"/><rect x="138" y="117" width="8" height="8"/>'
          '<rect x="50" y="141" width="8" height="8"/><rect x="138" y="141" width="8" height="8"/></g>')
    s.spark(196, 132, .8, '#78E4FC')
    return s


def path_usability():
    s = Ill('path-usability', 'Usability path')
    s.floor(rx=60)
    s.add(f'<rect x="62" y="30" width="96" height="172" rx="20" fill="{s.mat("navy")}"/>')
    s.add(f'<rect x="70" y="42" width="80" height="148" rx="12" fill="{s.mat("white")}"/>')
    s.add('<rect x="80" y="56" width="44" height="8" rx="4" fill="#012E4B" opacity=".8"/>')
    s.add('<rect x="80" y="74" width="60" height="30" rx="6" fill="#D4EEF7"/>')
    s.add('<rect x="80" y="112" width="60" height="6" rx="3" fill="#9CC6D8"/><rect x="80" y="124" width="46" height="6" rx="3" fill="#9CC6D8"/>')
    s.add('<rect x="80" y="166" width="60" height="12" rx="6" fill="#D4EEF7"/>')
    s.add(f'<circle cx="132" cy="170" r="7" fill="{CORAL}"/>')
    s.add(f'<path d="M168 156L196 184" stroke="{s.mat("navy")}" stroke-width="13" stroke-linecap="round"/>')
    s.add(f'<circle cx="148" cy="136" r="34" fill="{s.mat("blue")}"/>')
    s.add(f'<circle cx="148" cy="136" r="25" fill="#C2F5FF" opacity=".75"/>')
    s.add(f'<circle cx="148" cy="138" r="9" fill="{CORAL}"/><path d="M148 133V139" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="148" cy="143" r="1.6" fill="#fff"/>')
    return s


def article():
    s = Ill('article', 'Article')
    s.floor(rx=66)
    s.add(f'<path d="M58 54H170C178 54 184 60 184 68V184C184 192 178 198 170 198H70C62 198 56 192 56 184Z" fill="{s.mat("ice")}" transform="rotate(6 120 126)"/>')
    s.add(f'<rect x="52" y="48" width="128" height="148" rx="12" fill="{s.mat("white")}"/>')
    s.add(f'<rect x="66" y="64" width="40" height="34" rx="6" fill="{s.mat("cyan")}"/>')
    s.add(f'<rect x="114" y="66" width="52" height="8" rx="4" fill="{NAVY}" opacity=".8"/><rect x="114" y="82" width="44" height="6" rx="3" fill="#9CC6D8"/>')
    for y in (112, 126, 140, 154, 168):
        w = 100 if y != 168 else 64
        s.add(f'<rect x="66" y="{y}" width="{w}" height="6" rx="3" fill="#9CC6D8"/>')
    s.add(f'<path d="M176 30L186 44L202 42L194 56L202 70L186 68L176 82L170 66L154 62L166 52Z" fill="{s.mat("navy")}"/>')
    return s


def key():
    s = Ill('key', 'Unlock')
    s.floor(rx=56)
    s.add(f'<g transform="rotate(-35 120 120)"><circle cx="80" cy="120" r="34" fill="{s.rad("gold", .3, .25, .9)}"/>'
          f'<circle cx="74" cy="120" r="12" fill="#F2FAFD"/>'
          f'<rect x="106" y="110" width="94" height="20" rx="8" fill="{s.mat("gold", "t")}"/>'
          f'<rect x="164" y="124" width="12" height="22" rx="4" fill="{s.mat("gold", "t")}"/><rect x="184" y="124" width="12" height="16" rx="4" fill="{s.mat("gold", "t")}"/></g>')
    s.spark(176, 60, .9, '#78E4FC')
    s.spark(70, 176, .6, '#FFC53F')
    return s


def support():
    s = Ill('support', 'Support')
    s.floor(rx=56)
    s.add(f'<path d="M64 124V112C64 80 89 56 120 56C151 56 176 80 176 112V124" fill="none" stroke="{s.mat("navy", "t")}" stroke-width="12" stroke-linecap="round"/>')
    s.add(f'<rect x="50" y="110" width="34" height="56" rx="14" fill="{s.mat("blue")}"/>')
    s.add(f'<rect x="156" y="110" width="34" height="56" rx="14" fill="{s.mat("blue", "r")}"/>')
    s.add(f'<path d="M172 164C172 184 156 194 132 194" fill="none" stroke="{NAVY}" stroke-width="6" stroke-linecap="round"/>')
    s.add(f'<rect x="112" y="184" width="26" height="18" rx="9" fill="{s.mat("cyan")}"/>')
    s.add(f'<path d="M92 92C92 82 100 74 110 74H150C160 74 168 82 168 92V112C168 122 160 130 150 130H124L108 144V130C100 130 92 122 92 112Z" fill="{s.mat("white")}" transform="translate(-14 -24) scale(1.0)"/>')
    s.add('<circle cx="104" cy="74" r="4" fill="#1677C0"/><circle cx="118" cy="74" r="4" fill="#1677C0"/><circle cx="132" cy="74" r="4" fill="#1677C0"/>')
    return s


def pathmap():
    s = Ill('path-map', 'Path map')
    s.floor(rx=78)
    s.add(f'<path d="M58 190C40 170 76 156 104 150C140 142 176 136 166 110C158 92 108 98 98 80C90 66 112 54 132 50" fill="none" stroke="#9CC6D8" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 14"/>')
    for x, y, m in ((58, 186, 'mint'), (110, 148, 'mint'), (166, 112, 'blue'), (100, 80, 'white')):
        s.add(f'<circle cx="{x}" cy="{y}" r="16" fill="{s.mat(m)}"/>')
    s.add('<path d="M51 186L56 191L65 181M103 148L108 153L117 143" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
    s.add('<circle cx="166" cy="112" r="6" fill="#fff"/>')
    s.add(f'<rect x="136" y="26" width="5" height="48" rx="2.5" fill="{s.mat("navy", "l")}"/>')
    s.add(f'<path d="M141 28H178L170 40L178 52H141Z" fill="{s.mat("gold")}"/>')
    s.add(f'<ellipse cx="138" cy="74" rx="14" ry="5" fill="{s.mat("ice")}"/>')
    return s


ALL = [empty, offline, search, shield, card, mail, error, freeze, path_forms, path_hierarchy, path_usability,
       article, key, support, pathmap]
