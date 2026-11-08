# Proposal: video courses, earned certificates, landing (S3-18, 8 November 2026)

**Status: proposal. Eyad picks the Paths option before anything is built.**

Canvas: page "7 · Slice 3 · Progress", board **S3-18**, component `SpotlightPages`. The views are `optA`, `optB`, `optC`, `certs`, `landDiff` and `landCert`. The CSS is the "Proposal 8 Nov 2026 (S3-18)" block at the end of `system/uxgate.css`.

Eyad's asks:
- Make earned certificates stand out and put them first.
- Show the instructor, with a photo, on hybrid (video) paths. Highlight those paths and sort them first, so the first impression isn't like Uxcel.
- Add a home page section "المميزات المختلفة في UXGate".
- Say that every path ends with a certificate that can be shared on LinkedIn.

## Instructor photos

- The crops are in `slice-3/img/` and `/mnt/project-files/media/instructors/`:
  - `*-avatar.jpg`: 240 × 240, head and shoulders, shown in a circle.
  - `*-portrait.jpg`: 332 × 448, used for the big cards.
- The sources are Eyad's course covers.
- **To confirm:** which instructor teaches which path. The canvas assumes P14 Patterns That Fit is taught by Eyad Mahmoud (إياد محمود) and P02 Find and Fix Usability by Mahmoud Raslan (محمود رسلان).
- Store the instructor on the path (`path.yaml`: `instructor: { name: {en, ar}, photo }`), so a path can show its instructor without a code change.

## Paths tab: three options

Video courses are the `hybrid` paths: P02 and P14 today.

- **A · Two groups, big video cards (recommended).**
  - "Video courses with an instructor" / «كورسات بالفيديو مع مدرّب» comes first.
  - Each video course is a navy card with:
    - the instructor's portrait on the end side
    - a "Video + practice" over-line
    - the path name and subtitle
    - the unit count and "Unit 1 free"
    - the instructor's avatar, name and "Instructor"
  - Phones show the cards in one column. Desktop shows 2 columns.
  - "Interactive paths" / «مسارات تفاعلية» follows in the normal card grid.
- **B · Instructor spotlight.**
  - A swipeable row of big instructor cards, with dots and a "Start free" button.
  - Then one list, video courses first.
- **C · One list, video first.**
  - The smallest change.
  - Video course cards get:
    - a light blue gradient and border
    - the instructor's avatar on the path picture
    - the line "Videos with {name}"

In every option, "Your paths" and "Completed" (S3-17) stay above these sections once the learner has joined a path.

## Profile, Certificates tab: earned first

- **Earned · N** / «حصلت عليها · N» comes first. Each earned certificate is a green-outlined mint card with:
  - the certificate picture, with a check stamp
  - an "Earned" chip
  - the path name
  - "{n} skills Shown · {date}"
  - **Share on LinkedIn** (primary), which opens the S3-16 share sheet
  - **View certificate** (secondary)
- On phones, the picture spans the card width.
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
