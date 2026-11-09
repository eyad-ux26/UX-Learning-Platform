# Proposal: video courses, earned certificates, landing (S3-18, 8 November 2026)

**Status: APPROVED by Eyad, 9 Nov 2026 22:58Z: Paths option B, plus the earned certificates and the two landing sections. Canvas v111. Options A and C stay on the board for reference only and are not built.**

## Build brief (for Dev)

Build these four pieces, matching canvas v111, board S3-18 (frames 2 and 3 = Paths option B and its search state, 5 = Profile certificates, 6 and 7 = landing):
1. **Paths tab, option B** (`optB`, `optBSearch`): search field, "Featured courses" carousel of the video courses, then "All paths" in catalog order. Card layout, illustrations, search and keywords are specified below under option B. Read `kind` from the code catalog, not `paths.kind` (see the build note at the end).
2. **Profile, Certificates tab** (`certs`): earned first, compact green-outlined card without a certificate picture.
3. **Landing, «المميزات المختلفة في UXGate»** (`landDiff`), right after the hero.
4. **Landing, every path ends with a certificate** (`landCert`).

Path illustrations: `slice-3/img/paths/{id}.svg` and `{id}-dark.svg`. Instructor photos: `slice-3/img/*-avatar.jpg`. The instructor per path is still an assumption (P14 Eyad Mahmoud, P02 Mahmoud Raslan); store it on the path so it can be corrected without code.

Canvas: page "7 · Slice 3 · Progress", board **S3-18**, component `SpotlightPages`. The views are `optA`, `optB`, `optC`, `certs`, `landDiff` and `landCert`. The CSS is the "Proposal 8 Nov 2026 (S3-18)" block at the end of `system/uxgate.css`.

Eyad's asks:
- Make earned certificates stand out and put them first.
- Show the instructor, with a photo, on hybrid (video) paths. Highlight those paths and sort them first, so the first impression isn't like Uxcel.
- Add a home page section "المميزات المختلفة في UXGate".
- Say that every path ends with a certificate that can be shared on LinkedIn.

## Instructor photos

- The crops are in `slice-3/img/` and `/mnt/project-files/media/instructors/`. On the canvas they are stored as uploaded files (`/_blob/…`):
  - `*-avatar.jpg`: 240 × 240, head and shoulders, shown in a circle.
  - `*-media.jpg`: 660 × 500, head and shoulders with room around them, used in the big cards' picture area.
  - `*-portrait.jpg`: 332 × 448, kept as a spare.
- The sources are Eyad's course covers.
- **To confirm:** which instructor teaches which path. The canvas assumes P14 Patterns That Fit is taught by Eyad Mahmoud (إياد محمود) and P02 Find and Fix Usability by Mahmoud Raslan (محمود رسلان).
- Store the instructor on the path (`path.yaml`: `instructor: { name: {en, ar}, photo }`), so a path can show its instructor without a code change.

## Paths tab: three options

Video courses are the `hybrid` paths: P02 and P14 today.

- **A · Two groups, big video cards (recommended).**
  - "Video courses with an instructor" / «كورسات بالفيديو مع مدرّب» comes first.
  - Each video course is a white card, like the other path cards (revised 8 Nov after Eyad's review: lighter colours, one photo, calmer type). It has:
    - **A picture area on top** in the light panel colour, with the path's own art centred in a white tile and a "Video + practice" pill in the corner. No instructor photo here (Eyad, v98).
    - **A small round instructor photo** (32px, 36px on desktop, thin highlight ring) beside "With {name}" under the path name.
    - **The path name** at 18px, 700 weight (22px on desktop).
    - **The subtitle** at 14px, regular weight, at most 2 lines.
    - **A footer row** with "With **{instructor}**" and the chips for the unit count and "Unit 1 free".
  - Phones show the cards in one column. Desktop shows 2 columns.
  - "Interactive paths" / «مسارات تفاعلية» follows in the normal card grid.
- **B · Instructor spotlight.**
  - A swipeable row of video course cards, with dots. Each card (Eyad, 9 Nov, v102) has the path art beside the name and description, like the list cards, then the small round instructor photo with "With {name}", then the same tags as other cards (Video, units, Unit 1 free). No Start button. Light blue gradient and border.
  - The row has a title above it with a star icon: "Featured courses" / «كورسات مميّزة» (Eyad picked it, 9 Nov). "Most in demand" / "Most watched" can replace it once real data backs them.
  - Then "All paths" in catalog order (P01, P10, P14, P02, P05, P15, P12, P13), not video courses first (Eyad, 9 Nov, v109). The video courses still get the highlight, the instructor line and the Unit 1 free tag. Every card in this list and in the carousel uses the same layout (Eyad, 9 Nov, v107): name and description at the start, the instructor line for video courses, the tags along the bottom, and a path illustration on the end side, flush with the card's bottom corner and cropped by the card edge, like the Headspace reference Eyad sent. No icon tile, no caret.
  - **Search** (Eyad, 9 Nov, v109): a pill-shaped search field sits under the page lead, above Featured courses. It matches the path name, the description and a keyword list per path, in the current language, case-insensitive, substring match. While a query is typed the carousel hides and the list becomes "N paths for “query”", each card showing the matched keyword as a small highlighted chip when the match came from keywords. A clear button sits at the end of the field. Keywords are in `SpotlightPages.dc.html` (`KW`): EN and AR lists of 9 to 11 terms per path such as validation, checkout, contrast, WCAG, screen reader, bottom sheet, toast, microcopy, chatbot, ChatGPT. Dev: store keywords in the code catalog next to `sub`, search client-side over the 8 paths, debounce 150 ms, and treat Arabic diacritics and hamza forms as equal (normalise أ إ آ to ا and strip tashkeel).
  - **Path illustrations** (9 Nov): one SVG per path with no background, in `docs/design/slice-3/img/paths/` (also `/mnt/project-files/media/path-art/`). 160 x 140 viewBox, flat shapes in navy, brand blue, sky, mint green, amber and coral. Each shows the path's subject: P14 phone with bottom sheet, dialog and toast; P02 magnifier over a screen with a warning and a check; P01 form fields with a check and a cursor; P10 blocks shrinking in size with an eye; P05 accessibility figure in a high-contrast circle with a text size badge and a tap target; P15 speech bubble with short lines and a pencil; P12 AI sparkle in a chat bubble with a trust shield; P13 magic wand over a wireframe with sparkles. The illustration mirrors in RTL. Dark mode swaps navy for a lighter blue (`-dark.svg` in the same folder, generated by replacing #012E4B with #4A90B0). Card: `padding-inline-end` 124px (168px desktop), illustration 120 x 105 (164 x 144 desktop), carousel card 136 x 119 (196 x 172 desktop), `overflow: hidden` so the card edge crops it. Dev: serve them as static SVGs and pick by path id; new paths need a new drawing in the same style.
- **C · One list, video first.**
  - The smallest change.
  - Video course cards get:
    - a light blue gradient and border
    - a picture tile showing only the instructor's photo, centred on the face, with a thin highlight ring and no extra badges (Eyad, 8 Nov, rev 2)
    - the line "Videos with {name}"

Every path card in every option shows the path's description from the catalog (`sub` in `catalog-list.ts`), at most 2 lines (Eyad, 9 Nov).

In every option, "Your paths" and "Completed" (S3-17) stay above these sections once the learner has joined a path.

## Profile, Certificates tab: earned first

- **Earned · N** / «حصلت عليها · N» comes first. Each earned certificate is a green-outlined mint card with:
  - an "Earned" chip
  - the path name
  - "{n} skills Shown · {date}"
  - **Share on LinkedIn** (primary), which opens the S3-16 share sheet
  - **View certificate** (secondary)
- No certificate picture on the card, to keep it compact (Eyad, v99). **View certificate** opens it.
- **In progress · N** follows: grey cards with a locked certificate thumbnail, "{n} of {t} skills Shown…" and a progress bar.

## Landing: «المميزات المختلفة في UXGate»

- This is a navy, full-width section with the most visual weight on the page. Place it right after the hero.
- The highlighted word is drawn with a `mark` element:
  - **AR:** «المميزات **المختلفة** في UXGate»
  - **EN:** "What's **different** about UXGate"
- **Lead:**
  - **EN:** "Not another English-only course library. UXGate is built for Arab designers who want to practise real decisions."
  - **AR:** «ليست مكتبة كورسات أخرى بالإنجليزية فقط. UXGate مصمَّمة للمصمّمين العرب الذين يريدون التدرّب على قرارات حقيقية.»
- Six points. The first two are highlighted, and the second shows both instructors' avatars:

| EN | AR |
| --- | --- |
| **Arabic first, English too.** Every lesson is in Arabic and English. English UX terms stay, with a short Arabic explanation. | **بالعربية أولًا، وبالإنجليزية أيضًا.** كل درس بالعربية والإنجليزية. نُبقي مصطلحات UX الإنجليزية مع شرح عربي قصير. |
| **Video courses with Arab instructors.** Some paths mix short videos from working UX designers with hands-on practice. | **كورسات بالفيديو مع مدرّبين عرب.** بعض المسارات تجمع فيديوهات قصيرة من مصمّمي UX يعملون في المجال مع تدريب عملي. |
| **Decide on real screens.** You fix realistic apps and sites, in Arabic and English, right-to-left included. No trivia quizzes. | **قرارات على شاشات حقيقية.** تُصلح تطبيقات ومواقع واقعية بالعربية والإنجليزية، ومنها الشاشات من اليمين لليسار. لا أسئلة حفظ. |
| **Prove every skill.** Each unit ends with a skill check on a case you have not seen, with no hints. Missed skills come back for review. | **أثبت كل مهارة.** تنتهي كل وحدة باختبار مهارة على حالة لم ترها، بدون تلميحات. والمهارات التي فاتتك تعود للمراجعة. |
| **A certificate that means it.** You earn it only by showing every skill of the path. Share it on LinkedIn, and anyone can check it. | **شهادة لها معنى.** تحصل عليها فقط عندما تُثبت كل مهارات المسار. شاركها على LinkedIn، ويستطيع أي أحد التحقّق منها. |
| **Built on trusted research.** Lessons follow NN/g, IxDF and Google PAIR guidance, written for our region. | **مبنية على مصادر موثوقة.** الدروس تتبع إرشادات NN/g وIxDF وGoogle PAIR، ومكتوبة لمنطقتنا. |

The page never names Uxcel or any other product. The difference is made by what UXGate offers.

## Landing: every path ends with a certificate

- **Over-line:** "Every path ends with a certificate" / «كل مسار ينتهي بشهادة».
- **Heading:** "Finish a path, earn a certificate, share it on LinkedIn." / «أكمل المسار، واحصل على شهادة، وشاركها على LinkedIn.»
- **Three points:**
  - Earned, not given.
  - Share on LinkedIn in one tap.
  - Anyone can check it at uxgate.org/c/.
- **Picture:** a LinkedIn post card showing the post text, the certificate art and the link line.
- Also add a "Certificate" link to the landing header.

## Accessibility

- The cards are links. Their accessible names are "{path}. Video course with {instructor}" for video courses, and "{path} certificate, earned" for certificates.
- Photos in cards are decorative (`alt=""`), because the instructor's name is in the text.
- The highlighted word in the heading uses `mark`. The heading still reads as one sentence.
- The carousel in option B needs previous and next buttons, and must not auto-advance.

## Optional: one drawn image per video course

If you want one image that merges the path and the instructor, generate one per course with this prompt (for example in ChatGPT), with the instructor's cover photo attached:

> Square 1:1 course thumbnail for a UX learning app called UXGate. Use the attached photo of the instructor: keep his real face and likeness exactly, as a clean head-and-shoulders cut-out, smiling, centred, filling about 60% of the height. Place him inside a design-tool selection frame: a thin sky-blue (#78E4FC) rectangle with four small white square handles at the corners, slightly larger than his head and shoulders. Behind him use a soft light-blue background (#D8F4FB to #E0F4FD) with a faint navy dot grid. Around him, float 2 or 3 simple flat UI elements that show the course topic: {TOPIC ELEMENTS}. Draw them as clean vector shapes in navy (#012E4B), white and sky blue, with soft shadows and no readable text. Leave a calm margin around everything. Modern, friendly and professional, flat vector style. No logos, no extra people, no words.

- **Patterns That Fit:** "a small dialog box with two buttons, a bottom sheet sliding up from a phone edge, and a toast message bar".
- **Find and Fix Usability:** "a phone screen with a magnifying glass over it, a small amber warning marker on one button, and a green check mark beside a fixed version".

Export at 1024 × 1024 and crop to 72 px and 160 px tiles. The face must stay centred, so the same image works in the small tile and the big card.

## Build note: where "hybrid" comes from (PM, 8 Nov)

`paths.kind` in the database is still `interactive` for every path, P02 and P14 included, because the seed never writes it. The code catalog is correct: `apps/web/lib/catalog-list.ts` and `apps/web/lib/public-paths.ts` both mark P14 and P02 as `kind: "hybrid"` (checked on main, 8 Nov). Before any grouping, sorting or instructor card keys off kind, either read kind from the code catalog or make the content seed upsert `paths.kind`. Do not key off the database column as it is today.

## Build notes: PR #255 (9 Nov)

Once the learner has joined paths, the "All paths" heading reads "Start a new path" instead.
