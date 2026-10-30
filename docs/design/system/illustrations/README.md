# UXGate illustrations

Soft 3D illustrations in UXGate's brand style: 33 stills and 9 animations. Usage rules are in [`../../handoff/05-playful-style-and-illustrations.md`](../../handoff/05-playful-style-and-illustrations.md). Gallery: https://claude.ai/artifact/VEQxq7qzAxXtjdiZDuZViR

| Folder | Contents |
| --- | --- |
| `static/` | `uxgate-ill-<name>.svg`, 240 × 240 |
| `png/` | The same at 480 × 480, transparent |
| `animated/` | `uxgate-anim-<name>.svg`, CSS animation inside, respects reduced motion |
| `png-poster/` | A still frame of each animation |
| `source/` | The Python generator (`lib.py` holds the materials, light and shadow) |

Regenerate from `source/`:

```sh
python3 sheet.py ../static set1 set2 set3   # stills (also writes a contact sheet)
python3 -c "import anim; anim.build('../animated')"
```
