# Example screens: mock vocabulary

Every lesson example should look like a real app or website. This is the YAML a `mock` can use: a named product, screen chrome, overlays, blocks, built-in illustrations and icons. `npm run validate` rejects an unknown product id, block kind, art name or icon, and the player test renders every mock in English and Arabic.

All text fields take `{ en, ar }`, a plain string, or a `"@fixture"`. `**bold**` works in every text field. Every block still takes `gap`, `size`, `emphasis`, `tone`, `color`, `weight`, `px`, `nowrap`, `height`, `overlap`, `ring` and `region`. The new blocks take them too.

---

## 1. The product: `app`

Every realistic mock names its product. Use a product id from the shared registry (`content/products.yaml`, built from `products.md`):

```yaml
mock:
  app: kanz                 # name, colour, icon and domain come from content/products.yaml
```

Or write it inline (only for a one-off product in a re-test):

```yaml
  app: { name: { en: "Kanz", ar: "كنز" }, color: "#0F766E", icon: wallet, domain: kanz.example }
```

**Product ids.** An id is the domain stem without `.example`, with hyphens and apostrophes removed: `dar.example` is `dar`, and `tab-a.example` is `taba`. These are the ids in `content/products.yaml` today:

`nashat`, `raha`, `dar`, `dukkani`, `rasid`, `lamma`, `lokma`, `tayyar`, `sallah`, `usta`, `nazeef`, `rehla`, `mishwar`, `zad`, `nuzul`, `sakan`, `beyouti`, `manara`, `maktaba`, `waraq`, `hadaf`, `rokhsati`, `mekaneeky`, `rakna`, `dawaa`, `tazkara`, `adasa`, `shabaka`, `tabkha`, `suwar`, `taba`, `bareed`, `wasl`, `dafaa`, `masroof`, `nafaqat`, `tard`, `satr`, `mudawwana`, `lamha`, `sahn`, `harf`, `fikra`, `basira`, `lawha`, `nasij`, `shasha`, `mirsad`, `qaima`, `kanz`, `khatt`, `fatoora`, `mozakra`, `aman`, `kalima`, `volta`, `naghma`, `hakawy`, `mawid`, `herfa`, `wazifa`, `ard`, `dawra`, `kadr`, `beit`, `mesbah`, `khabar`, `mashhad`, `safha`, `hisn`, `qareeb`, `warda`, `jamia`.

To add a product, add it to `products.md` and ask the Dev thread to add it to `content/products.yaml`, or add the line yourself in your content PR. The validator rejects unknown ids, unknown kinds and unknown `art` names.

- `color` becomes the mock's brand colour. Buttons, links, the active tab, switches, checkboxes, focus rings and badges use it, so the old purple goes away.
- The product name shows above the device as a quiet label ("Kanz · Example"). This replaces the MOCK chip.
- Old mocks without `app` keep the neutral palette.

## 2. Screen chrome (all at mock level)

```yaml
mock:
  app: kanz
  frame: phone              # phone (default) | small (320 px phone) | tablet | wide (laptop browser)
  status: true              # phone status bar (time, signal, battery). On by default when app/appbar/tabbar is set
  appbar:
    title: { en: "Saved cards", ar: "البطاقات المحفوظة" }
    back: true              # back arrow, mirrored in Arabic
    actions: [ { icon: plus, aria: { en: "Add card", ar: "أضف بطاقة" } } ]   # 0-2 icon buttons; each can take a region
    large: false            # true = big title under the bar (iOS style)
    logo: false             # true = product icon + name instead of a title (home screens)
  tabbar:
    active: 1
    items:
      - { icon: house, text: { en: "Home", ar: "الرئيسية" } }
      - { icon: credit-card, text: { en: "Cards", ar: "البطاقات" }, count: 2 }
      - { icon: user, text: { en: "Profile", ar: "حسابي" } }
  footer:                   # sticky area above the tab bar or at the bottom: the main action
    - { kind: button, text: { en: "Add a card", ar: "أضف بطاقة" } }
  blocks: [ ... ]
```

Web pages, with `frame: wide`:

```yaml
mock:
  app: dar
  frame: wide
  url: dar.example/washers/lg-8kg      # browser bar. Defaults to the product domain
  navbar:                               # the site's own header: logo, links, actions
    links: [ { en: "Washers", ar: "غسالات" }, { en: "Fridges", ar: "ثلاجات" }, { en: "Offers", ar: "العروض" } ]
    active: 0
    search: { en: "Search Dar", ar: "ابحث في دار" }   # optional search box in the header
    actions: [ { icon: shopping-cart, count: 2 }, { icon: user } ]
  blocks: [ ... ]
```

Add `fit: true` to a wide frame whose rows would clip on a phone. Below 440 px it is zoomed to 80% and laid out 25% wider, and its rows wrap instead of clipping. Leave it off when the page already fits, so text stays full size.

Other mock-level options:

| Key | Meaning |
| --- | --- |
| `theme: dark` | The whole screen in dark mode, with exact colours. It replaces group `tone: night` for full screens; `night` still works. |
| `keyboard: text` / `number` | Draws the phone keyboard at the bottom, for when a field is being typed in. |
| `screen: lock` | A lock-screen wallpaper with a big clock, for `notification` blocks. |
| `reader` | A "Screen reader says" caption strip under the device, with a speaker icon and the spoken text in quotes: `reader: { en: "Button, Pay now", ar: "زر، ادفع الآن" }`. |
| `width`, `height`, `dir`, `gray`, `blur`, `caption` | As before. |

## 3. Overlays (supported now)

```yaml
  overlay:
    type: dialog            # dialog | sheet | full | toast | banner | menu | side   (a banner sits under the app bar and pushes the screen down)
    close: true             # ✕ in the corner
    scrim: true             # dims the screen. Default: on for dialog, sheet, side and menu; off for toast and banner
    tall: true              # sheet only: nearly full height
    handle: false           # sheet only: hide the grab handle
    title: { en: "Filters", ar: "الفلاتر" }   # new: a header row for sheet, side and full
    blocks: [ ... ]
```

- `menu`: an overflow menu opened under the app bar's last action (`⋮`). Its blocks are usually `listitem`s.
- `side`: a side sheet from the end edge, for filter panels.
- `fab: { icon: plus, text }` works as before. `icon` can now be a Phosphor name.

## 4. Blocks

### Basic blocks

`title`, `heading`, `text`, `meta`, `small`, `chip`, `pill`, `line`, `button`, `link`, `image`, `banner`, `tip`, `iconbtn`, `field`, `select`, `radio`, `check`, `toggle`, `stepper`, `segmented`, `slider`, `calendar`, `wheel`, `chips`, `divider`, `group`, `row`. See `docs/content-format.md` for their props.

Extra props on basic blocks:
- `button`, `link`, `chip`, `iconbtn` take `icon` (a Phosphor name) and `aria` (the accessible name, for icon-only buttons). `button` also takes `style: outline` and `style: text`.
- `image` takes `art` (the built-in illustration set, below) and `alt`. With `art`, it draws a picture instead of the striped box. `text` becomes an optional caption on the picture.
- `field` takes `icon` (a leading icon) and `trail` (trailing text or an icon, such as `eye`).
- `banner` takes `icon`, and `tone: info | good | warn | bad`.

### New blocks

**`icon`**: a single Phosphor icon.
```yaml
- { kind: icon, icon: bell-ringing, size: l, color: brand }
```

**`avatar`**: initials, a built-in face, or the product's logo.
```yaml
- { kind: avatar, text: "Hassan Ali", art: man-1, size: m }    # art optional; without it, initials on the brand colour
```

**`listitem`**: a row. Every part is optional.
```yaml
- kind: listitem
  icon: credit-card          # or avatar: { text, art }, or art: food-koshary (a thumbnail)
  text: { en: "Visa ending 4821", ar: "Visa تنتهي بـ 4821" }
  sub: { en: "Expires 08/28", ar: "تنتهي 08/28" }
  value: { en: "Default", ar: "الأساسية" }    # trailing text
  chevron: true              # or toggle: true / false, or badge: { text, tone }, or check: true
  swipe: { text: { en: "Delete", ar: "حذف" }, tone: bad }   # draws the row half-swiped with the action showing
```

**`card`**: a raised card, optionally with a picture on top.
```yaml
- kind: card
  art: hotel-room
  blocks:
    - { kind: heading, text: { en: "Nile view room", ar: "غرفة بإطلالة على النيل" } }
    - { kind: price, text: { en: "EGP 2,400", ar: "2,400 جنيه" }, per: { en: "/ night", ar: "/ الليلة" } }
```

**`badge`**: a small status label. `tone`: `brand` (default), `good`, `warn`, `bad`, `neutral`. Also `count: 3` on tabbar items, appbar actions and navbar actions draws a red count dot.
```yaml
- { kind: badge, text: { en: "Suggested", ar: "مقترح" }, icon: sparkle }
```

**`searchbar`**: with optional typed text, a caret, and suggestion rows under it.
```yaml
- kind: searchbar
  text: { en: "wash", ar: "غسا" }
  filled: true
  focus: true
  suggest:                    # optional dropdown. The typed part is regular weight; write the rest in **bold**
    - { icon: magnifying-glass, text: { en: "wash**ing machine**", ar: "غسا**لة**" }, value: { en: "Washers", ar: "غسالات" } }
```

**`chat`**: one message bubble. `from`: `me` (end side, brand colour), `them` (a person), or `ai` (the assistant, with a sparkle avatar).
```yaml
- { kind: chat, from: them, name: "Hana", avatar: { art: woman-1 }, text: { en: "Is the 6 pm class still on?", ar: "هل حصة 6 مساءً ما زالت قائمة؟" }, time: "5:42" }
- { kind: chat, from: ai, text: { en: "Here are 3 options…", ar: "هذه 3 خيارات…" }, actions: [copy, regenerate] }
```

**`composer`**: the message or prompt box at the bottom of a chat. Put it in `footer`.
```yaml
footer: [ { kind: composer, text: { en: "Ask Fikra anything", ar: "اسأل فكرة أي شيء" } } ]
```

**`price`**: a price, with an optional old price (struck through) and unit.
```yaml
- { kind: price, text: { en: "EGP 120", ar: "120 جنيه" }, was: { en: "EGP 150", ar: "150 جنيه" }, per: { en: "/ month", ar: "/ شهريًا" }, size: l }
```

**`list`**: a real bulleted, numbered or checked list.
```yaml
- { kind: list, style: bullet, items: [ { en: "Free delivery", ar: "توصيل مجاني" }, { en: "**2-year** warranty", ar: "ضمان **سنتين**" } ] }   # style: bullet | number | check
```

**`progress`**: a bar or a ring.
```yaml
- { kind: progress, value: 40, label: { en: "Step 2 of 5", ar: "الخطوة 2 من 5" } }    # ring: true for a ring
```

**`notification`**: a push notification. It uses the mock's `app` unless it sets its own. Stack several in a row on `screen: lock`.
```yaml
- { kind: notification, app: rehla, title: { en: "Bus leaves in 10 min", ar: "الحافلة تتحرك بعد 10 دقائق" }, text: { en: "Gate 4 · Seat 12", ar: "البوابة 4 · المقعد 12" }, time: { en: "now", ar: "الآن" } }
```

**`quote`**: an interview or transcript quote.
```yaml
- { kind: quote, text: { en: "I never know if it saved.", ar: "لا أعرف أبدًا إن كان قد حُفظ." }, name: { en: "Participant 3", ar: "المشارك 3" }, time: "12:40" }
```

**`table`**: a simple table, best in `frame: wide`.
```yaml
- kind: table
  head: [ { en: "Theme", ar: "المحور" }, { en: "People", ar: "الأشخاص" } ]
  rows:
    - [ { en: "Can't find receipts", ar: "لا يجدون الإيصالات" }, "7 / 8" ]
```

**`accordion`**: a section header with a chevron. When open, its `blocks` show under it.
```yaml
- { kind: accordion, text: { en: "Delivery and returns", ar: "التوصيل والإرجاع" }, open: true, blocks: [ { kind: small, text: { en: "Free over EGP 500", ar: "مجاني فوق 500 جنيه" } } ] }
```

Learners can tap an accordion to open or close it. This changes only the picture, never their answer. `open` sets how it starts, so give a closed row its `blocks` too, because they show when it is opened. In `spot` steps, accordions stay as drawn.

**`more`**: shows that the list goes on past what the screen shows, such as "+12 more questions". It fades the block above it. `fade: false` turns the fade off. Use it whenever an option claims more than the picture can fit (for example, "all 14 open").
```yaml
- { kind: more, text: { en: "+12 more questions, all open", ar: "+12 سؤالًا آخر، كلها مفتوحة" } }
```

**`tabs`**: an in-page tab strip with an underline. This is different from `segmented`.
```yaml
- { kind: tabs, options: [ { en: "Upcoming", ar: "القادمة" }, { en: "Past", ar: "السابقة" } ], value: 0 }
```

**`chart`**: a small bar or line chart drawn from values.
```yaml
- { kind: chart, type: bar, values: [12, 18, 9, 22], labels: [ "Jan", "Feb", "Mar", "Apr" ], highlight: 3 }
```

**`seatmap`**: a grid of seats.
```yaml
- { kind: seatmap, rows: 6, cols: 8, taken: [ [0,1], [2,4] ], picked: [ [3,3] ], aisle: 4 }
```

### Props for any block

| Prop | Meaning |
| --- | --- |
| `mark: 3` | A numbered badge on the block's corner, such as screen-reader reading order or callouts. |
| `note: { en, ar }` | A small dark tag pinned to the block, for time-based behaviour on a still screen, such as "Moves every 3 s" or "Flashes 3× a second". |
| `sticky: true` | On a `button`, pins it to the bottom of the screen. Prefer the mock's `footer`. |

## 5. Built-in illustrations (`art`, new)

`image`, `card`, `listitem` and `avatar` take `art`. These are flat drawings made for UXGate, never stock photos or real brands. Each one works at any size and has the same look in EN and AR.

- **People:** `woman-1` (hijab), `woman-2` (hijab), `woman-3`, `man-1`, `man-2`, `man-3`, `doctor`, `family`, `people`
- **Food:** `food-koshary`, `food-burger`, `food-pizza`, `food-salad`, `food-grill`, `food-dessert`, `coffee`, `bread`
- **Places:** `hotel-room`, `beach`, `desert`, `city-night`, `gym`, `clinic`, `x-ray`, `cafe`, `workshop`, `map`, `map-route`
- **Products:** `washing-machine`, `fridge`, `laptop`, `phone`, `earbuds`, `tv`, `shirt`, `sneakers`, `bed-sheet`, `book`, `box`, `bank-card`, `receipt`, `medicine`, `shelf` (an empty shop shelf)
- **Transport:** `bus`, `car`
- **Documents and UI:** `chart`, `document`, `qr`, `photo` (a family photo print)

Need one that isn't listed? Ask the PM thread before you write it. The validator rejects unknown `art` names.

## 6. Icons

`icon` fields take a [Phosphor](https://phosphoricons.com) name, such as `bank`, `credit-card`, `bell`, `magnifying-glass`, `shopping-cart` or `heart`. Add `-fill` for the filled style (`heart-fill`). The validator checks each name against Phosphor, and the build adds every icon used in the content. The old emoji/character icons in `fab`, `chips` and `iconbtn` still work.

## 7. Rules that don't change

- `region` works on any block, including the new ones, and on appbar actions, tabbar items and navbar actions. `spot`, `tune`, `compare` and `order` work as before.
- Old YAML renders without edits. Mocks without `app` show a clean device frame with no status bar.
- `npm run validate` must have 0 errors. It will warn about mocks with no `app` once the content threads start rewriting.

## 8. A full example: the saved-cards step, rewritten

```yaml
mock:
  app: kanz
  appbar: { title: { en: "Saved cards", ar: "البطاقات المحفوظة" }, back: true }
  blocks:
    - kind: listitem
      art: bank-card
      text: { en: "Visa ending 4821", ar: "Visa تنتهي بـ 4821" }
      sub: { en: "Expires 08/28 · Default", ar: "تنتهي 08/28 · الأساسية" }
      value: { en: "Remove", ar: "حذف" }
  overlay:
    type: dialog
    blocks:
      - { kind: heading, text: { en: "Remove Visa ending 4821?", ar: "حذف Visa التي تنتهي بـ 4821؟" } }
      - { kind: small, text: { en: "To use it again, you'll add it again with a code from your bank.", ar: "لاستخدامها مجددًا، ستضيفها من جديد برمز من البنك." }, gap: s }
      - { kind: button, text: { en: "Remove card", ar: "احذف البطاقة" }, style: danger, gap: m }
      - { kind: button, text: { en: "Keep card", ar: "أبقِ البطاقة" }, style: text, gap: s }
```

## Not supported yet

- Several device frames side by side in one mock, such as phone, tablet and laptop together (P10 U04). For now, use a `compare` step, or one frame per step.
- Tap-to-try controls on realistic screens. The unit preview draws realistic mocks with the app's own renderer, as still screens like the app. Older mocks in the preview keep their tap-to-try toggles, radios and sliders.
