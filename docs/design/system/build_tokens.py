import json
C={ # name: (light, dark, usage)
'ground':('#F2FAFD','#00121B','Page background (ice / night)'),
'surface':('#FFFFFF','#032E3B','Cards, choices, sheets'),
'surface-2':('#F5FBFD','#062A36','Hover on surfaces'),
'panel':('#D8F4FB','#08384A','Pale cyan panels, next lesson card'),
'mint':('#DDF5E8','#0D3326','Mint cards, right feedback'),
'line':('#D3E8F0','#1A4F63','2px outlines on pressables'),
'line-field':('#6C8A9A','#4A86A0','Input, checkbox and radio borders (3:1)'),
'ledge':('#C3DDE8','#1A4F63','Solid 4px ledge under neutral pressables'),
'track':('#E2F0F5','#0B3445','Progress tracks, tab rails'),
'text':('#012E4B','#EAF7FC','Headlines and body'),
'text-2':('#3D5D73','#9CC3D3','Secondary text'),
'text-3':('#4F7287','#7FA3B5','Meta, placeholders, inactive nav'),
'brand':('#005F99','#4CC3E8','Primary action, selected key'),
'brand-ledge':('#003F66','#1E7FA6','Ledge under primary'),
'on-brand':('#FFFFFF','#00121B','Text on brand'),
'link':('#005F99','#4CC3E8','Links, ghost buttons'),
'sky':('#1A93BE','#78E4FC','Display subtitles, 24px+ only'),
'highlight':('#78E4FC','#78E4FC','XP, progress fill, highlight pills'),
'highlight-ledge':('#2BB5DE','#2BB5DE','Ledge under highlight'),
'on-highlight':('#012E4B','#012E4B','Text on cyan'),
'selected-bg':('#E0F4FD','#08384A','Selected choice fill (never a verdict)'),
'selected-line':('#1677C0','#4CC3E8','Selected outline, ledge and selection frame (3:1)'),
'right-bg':('#DDF5E8','#0D3326','Right feedback'),
'right-line':('#3DAA80','#4CD69A','Right outline and ledge'),
'right-text':('#1F7A52','#4CD69A','Right word and icon'),
'wrong-bg':('#FDE8EB','#3A0F18','Not quite feedback'),
'wrong-line':('#E8707F','#FF6B7D','Wrong outline and ledge'),
'wrong-text':('#B4233A','#FF8A99','Wrong word, icon, field errors'),
'warn-bg':('#FFF1D6','#3A2A06','Hints, cautions'),
'warn-line':('#E8A93A','#E8A93A','Hint outline'),
'warn-text':('#8A5A00','#FFC970','Hint text'),
'reward':('#F5B83D','#F5B83D','Trophies, stars, Kept skills'),
'reward-ledge':('#C98A12','#C98A12','Ledge under reward'),
'on-reward':('#012E4B','#012E4B','Text on gold'),
'streak':('#F59E2B','#F59E2B','Streak flame'),
'disabled-bg':('#E5EFF3','#0B2C38','Disabled fill'),
'disabled-text':('#5E7A8A','#7A98A8','Disabled text'),
'focus':('#005F99','#78E4FC','3px focus ring, 3px offset'),
}
def L(h):
  h=h.lstrip('#');c=[int(h[i:i+2],16)/255 for i in (0,2,4)];c=[v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4 for v in c];return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):x,y=L(a),L(b);return round((max(x,y)+0.05)/(min(x,y)+0.05),2)
P=[('text','surface',4.5),('text','ground',4.5),('text-2','surface',4.5),('text-2','ground',4.5),('text-3','surface',4.5),('text-3','ground',4.5),('link','surface',4.5),('on-brand','brand',4.5),('on-highlight','highlight',4.5),('text','panel',4.5),('text','selected-bg',4.5),('right-text','right-bg',4.5),('wrong-text','wrong-bg',4.5),('warn-text','warn-bg',4.5),('on-reward','reward',4.5),('wrong-text','surface',4.5),('sky','ground',3.0),('line-field','surface',3.0),('focus','ground',3.0),('selected-line','surface',3.0),('selected-line','selected-bg',3.0),('right-line','right-bg',None)]
rows=[]
for a,b,need in P:
  l=cr(C[a][0],C[b][0]);d=cr(C[a][1],C[b][1])
  rows.append({'fg':a,'bg':b,'need':need,'light':l,'dark':d,'pass':(need is None) or (l>=need and d>=need)})
for r in rows: print(r)
T={'$description':'UXGate design tokens v0.1 (Sprint 1). Same names in tokens.css as --ug-<group>-<name>.',
'color':{'light':{k:v[0] for k,v in C.items()},'dark':{k:v[1] for k,v in C.items()},'usage':{k:v[2] for k,v in C.items()},
 'brand':{'navy':'#012E4B','blue':'#005F99','cyan':'#78E4FC','logo-teal':'#60BEBB','ice':'#F2FAFD','pale-cyan':'#D8F4FB','mint':'#DDF5E8','night':'#00121B','night-2':'#032E3B'}},
'contrast':rows,
'font':{'family':{'en':"'Titillium Web', 'Cairo', system-ui, sans-serif",'ar':"'Cairo', 'Titillium Web', system-ui, sans-serif"},'weights':{'en':[400,600,700],'ar':[400,600,700,800]},'numeric':'tabular-nums for counters and XP'},
'type':{ # size, lineEn, lineAr, weightEn, weightAr
 'display':[40,44,56,700,800],'h1':[30,36,44,700,800],'h2':[24,30,36,700,700],'h3':[19,25,30,700,700],'lead':[18,27,32,400,400],'body':[16,24,28,400,400],'label':[15,20,24,700,700],'button':[17,20,24,700,700],'small':[14,20,24,400,400],'caption':[12,16,20,700,700]},
'video':{'canvas':'1080x1080 and 1080x1920, 30 fps, night look','title':[72,80,100,700,800],'caption':[44,54,68,700,700],'label':[28,34,44,700,700]},
'space':{'0':0,'1':2,'2':4,'3':8,'4':12,'5':16,'6':20,'7':24,'8':32,'9':40,'10':48,'11':64},
'radius':{'xs':8,'sm':10,'md':14,'lg':16,'xl':20,'2xl':28,'pill':999},
'size':{'touch':44,'button-sm':44,'button':52,'button-lg':56,'choice':60,'progress':16,'progress-sm':10,'ledge':4,'outline':2,'focus-ring':3},
'elevation':{'ledge':'0 4px 0 {ledge}','ledge-sm':'0 3px 0 {ledge}','pressed':'0 0 0 {ledge} + translateY(4px)','soft':{'light':'0 12px 32px -12px rgba(1,46,75,0.18)','dark':'0 12px 32px -12px rgba(0,0,0,0.6)'},'sheet':{'light':'0 -10px 40px -10px rgba(1,46,75,0.25)','dark':'0 -10px 40px -10px rgba(0,0,0,0.7)'}},
'motion':{'duration':{'press':80,'fast':140,'base':220,'slow':360,'count-up':600},'easing':{'linear':'linear','out':'cubic-bezier(.2,.8,.2,1)','pop':'cubic-bezier(.2,.8,.3,1.25)'},'rules':['Press: translateY(4px), ledge to 0, 80ms linear','Select: scale .97 to 1, 220ms pop','Reward: scale .6 to 1 with overshoot, 360ms pop; XP counts up over 600ms','Wrong: no shake, no flash','prefers-reduced-motion: press still sinks with no bounce; selection frame appears at once; rewards, XP and trophies fade in (140ms); confetti and loops (flame, bell) show still frames; sound unchanged']}}
json.dump(T,open('tokens.json','w'),indent=2,ensure_ascii=False)
css=['/* UXGate design tokens v0.1 · generated from tokens.json */',':root, [data-theme="light"] {']
for k,v in C.items(): css.append(f'  --ug-color-{k}: {v[0]};')
for k,v in T['space'].items(): css.append(f'  --ug-space-{k}: {v}px;')
for k,v in T['radius'].items(): css.append(f'  --ug-radius-{k}: {v}px;')
for k,v in T['size'].items(): css.append(f'  --ug-size-{k}: {v}px;')
for k,v in T['motion']['duration'].items(): css.append(f'  --ug-duration-{k}: {v}ms;')
for k,v in T['motion']['easing'].items(): css.append(f'  --ug-ease-{k}: {v};')
css.append("  --ug-font-en: "+T['font']['family']['en']+";")
css.append("  --ug-font-ar: "+T['font']['family']['ar']+";")
css.append("  --ug-shadow-soft: "+T['elevation']['soft']['light']+";")
css.append("  --ug-shadow-sheet: "+T['elevation']['sheet']['light']+";")
for k,v in T['type'].items():
  css.append(f'  --ug-type-{k}-size: {v[0]}px; --ug-type-{k}-line: {v[1]}px; --ug-type-{k}-weight: {v[3]};')
css.append('}')
css.append('[data-theme="dark"] {')
for k,v in C.items(): css.append(f'  --ug-color-{k}: {v[1]};')
css.append("  --ug-shadow-soft: "+T['elevation']['soft']['dark']+";")
css.append("  --ug-shadow-sheet: "+T['elevation']['sheet']['dark']+";")
css.append('}')
css.append('[lang="ar"] {')
for k,v in T['type'].items(): css.append(f'  --ug-type-{k}-line: {v[2]}px; --ug-type-{k}-weight: {v[4]};')
css.append('}')
css.append('@media (prefers-reduced-motion: reduce) { :root { --ug-duration-press: 1ms; --ug-duration-fast: 1ms; --ug-duration-base: 1ms; --ug-duration-slow: 1ms; --ug-duration-count-up: 1ms; } }')
open('tokens.css','w').write('\n'.join(css)+'\n')
