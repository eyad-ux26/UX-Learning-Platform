"""Write SVGs from the given modules and a light/dark contact sheet."""
import importlib
import os
import sys

out = sys.argv[1]
mods = sys.argv[2:]
os.makedirs(out, exist_ok=True)
names = []
for m in mods:
    mod = importlib.import_module(m)
    for fn in mod.ALL:
        ill = fn()
        p = os.path.join(out, f'uxgate-ill-{ill.name}.svg')
        open(p, 'w').write(ill.svg())
        names.append(ill.name)

cells = ''.join(f'<figure><img src="uxgate-ill-{n}.svg"><figcaption>{n}</figcaption></figure>' for n in names)
html = f'''<!doctype html><meta charset="utf-8"><style>
body{{margin:0;font:13px sans-serif}}
.row{{display:grid;grid-template-columns:repeat(6,200px);gap:8px;padding:16px}}
figure{{margin:0;border-radius:16px;padding:8px;text-align:center}}
img{{width:180px;height:180px}}
.l figure{{background:#F2FAFD;color:#012E4B}} .d{{background:#00121B}} .d figure{{background:linear-gradient(160deg,#032E3B,#00121B);color:#EAF9FF}}
</style><div class="row l">{cells}</div><div class="row d">{cells}</div>'''
open(os.path.join(out, 'sheet.html'), 'w').write(html)
print(len(names))
