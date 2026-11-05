"""Animated versions: same drawings, CSS keyframes inside each SVG."""
import os
import sys
import set1
import set2
import set3

BASE = ('[class^="a-"],[class*=" a-"]{transform-box:fill-box;transform-origin:center}'
        '.a-tw{animation:tw 1.8s ease-in-out infinite}.a-d2{animation-delay:.6s}.a-d3{animation-delay:1.2s}'
        '@keyframes tw{0%,100%{transform:scale(.4);opacity:.35}50%{transform:scale(1);opacity:1}}')

CONF = ['#78E4FC', '#FFC53F', '#1677C0', '#60BEBB', '#F2545B', '#78E4FC', '#FFC53F', '#97E3C0']


def confetti(s):
    for i, c in enumerate(CONF):
        x = 44 + i * 22
        s.add(f'<rect class="a-conf" style="animation-delay:{.15 + (i % 4) * .12:.2f}s" x="{x}" y="20" width="8" height="12" rx="2" fill="{c}"/>')


ANIMS = {
    'lesson-done': (set1.trophy, '.a-pop{transform-origin:50% 100%;animation:pop .7s cubic-bezier(.2,.8,.3,1.25) both}'
                    '@keyframes pop{0%{transform:translateY(24px) scale(.6);opacity:0}100%{transform:none;opacity:1}}'
                    '.a-conf{opacity:0;animation:conf 1.8s ease-in forwards}'
                    '@keyframes conf{0%{transform:translateY(-30px) rotate(0);opacity:0}12%{opacity:1}100%{transform:translateY(170px) rotate(540deg);opacity:0}}',
                    confetti),
    'streak': (set1.flame, '.a-flick{transform-origin:50% 100%;animation:flick 1.3s ease-in-out infinite alternate}'
               '@keyframes flick{0%{transform:scale(1,1) skewX(0)}50%{transform:scale(1.03,.96) skewX(-2deg)}100%{transform:scale(.98,1.04) skewX(2deg)}}'
               '.a-core{transform-origin:50% 100%;animation:core .7s ease-in-out infinite alternate}'
               '@keyframes core{from{transform:scale(1)}to{transform:scale(.86,1.1)}}', None),
    'reminder': (set1.bell, '.a-swing{transform-origin:50% 0%;animation:swing 2.8s ease-in-out infinite}'
                 '@keyframes swing{0%,42%,100%{transform:rotate(0)}6%{transform:rotate(14deg)}13%{transform:rotate(-12deg)}20%{transform:rotate(9deg)}27%{transform:rotate(-6deg)}34%{transform:rotate(3deg)}}'
                 '.a-badge{animation:badge 2.8s ease-out infinite}@keyframes badge{0%,30%,100%{transform:scale(1)}8%{transform:scale(1.25)}}'
                 '.a-wave{animation:wave 2.8s infinite}@keyframes wave{0%,40%,100%{opacity:0}8%,30%{opacity:1}}', None),
    'hint': (set1.bulb, '.a-glow{animation:glow 1.8s ease-in-out infinite alternate}@keyframes glow{from{opacity:.15}to{opacity:.6}}'
             '.a-rays{animation:rays 1.8s ease-in-out infinite alternate}@keyframes rays{from{opacity:.2}to{opacity:1}}', None),
    'welcome': (set2.gate, '.a-door{transform-origin:0% 50%;animation:door 1.6s cubic-bezier(.3,.7,.2,1) .3s both}'
                '@keyframes door{from{transform:scaleX(1.4)}to{transform:scaleX(.8)}}'
                '.a-light{animation:light 1.6s ease-out .5s both}@keyframes light{from{opacity:0}to{opacity:.35}}', None),
    'offline': (set3.offline, '.a-float{animation:float 3s ease-in-out infinite}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}'
                '.a-badge{animation:badge 3s ease-in-out infinite}@keyframes badge{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}', None),
    'saving': (set3.shield, '.a-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 2.4s ease-out infinite}'
               '@keyframes draw{0%{stroke-dashoffset:1;opacity:1}35%,85%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}', None),
    'xp': (set1.star, '.a-spin{animation:spin 2.6s ease-in-out infinite}'
           '@keyframes spin{0%{transform:scaleX(1)}12%{transform:scaleX(.08)}24%{transform:scaleX(1)}60%{transform:translateY(-8px)}100%{transform:translateY(0)}}', None),
    'searching': (set3.search, '.a-orbit{animation:orbit 2.2s linear infinite}'
                  '@keyframes orbit{0%,100%{transform:translate(7px,0)}25%{transform:translate(0,7px)}50%{transform:translate(-7px,0)}75%{transform:translate(0,-7px)}}', None),
}


def scope(css, name):
    """Prefix selectors and keyframe names so inlined SVGs never clash."""
    import re
    root = f'#a{name}-svg '
    css = re.sub(r'@keyframes (\w+)', lambda m: f'@keyframes {name}-{m.group(1)}', css)
    css = re.sub(r'animation:(\w+)', lambda m: f'animation:{name}-{m.group(1)}', css)
    css = re.sub(r'(^|})(\.a-[\w-]+|\[class[^{]*)', lambda m: m.group(1) + root + m.group(2), css)
    css = css.replace('],[class*=', '],' + root + '[class*=').replace(',.a-', ',' + root + '.a-')
    return css


def build(out):
    os.makedirs(out, exist_ok=True)
    names = []
    for name, (fn, css, extra) in ANIMS.items():
        s = fn()
        if extra:
            extra(s)
        s.css = [scope(BASE + css, name)]
        txt = s.svg().replace('<svg ', f'<svg id="a{name}-svg" ', 1).replace(f'"{s.name}-', f'"a{name}-').replace(f'#{s.name}-', f'#a{name}-')
        open(os.path.join(out, f'uxgate-anim-{name}.svg'), 'w').write(txt)
        names.append(name)
    return names


if __name__ == '__main__':
    names = build(sys.argv[1])
    cells = ''.join(f'<figure><img src="uxgate-anim-{n}.svg"><figcaption>{n}</figcaption></figure>' for n in names)
    open(os.path.join(sys.argv[1], 'sheet.html'), 'w').write(
        '<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px sans-serif}'
        '.row{display:grid;grid-template-columns:repeat(5,200px);gap:8px;padding:16px}figure{margin:0;border-radius:16px;padding:8px;text-align:center;background:#F2FAFD}'
        f'img{{width:180px;height:180px}}</style><div class="row">{cells}</div>')
    print(names)
