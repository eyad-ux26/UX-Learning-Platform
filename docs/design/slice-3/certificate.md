# Certificate and Share on LinkedIn (S3-16, 7 November 2026)

Eyad asked for three things: a better certificate design, a better look on phones, and a "Share on LinkedIn" button that opens a ready-written post with the certificate image.

Canvas: page "7 · Slice 3 · Progress", board **S3-16**, component `CertPages`. It has three views: `cert`, `share` and `public`, each shown in EN and AR, on phone and desktop. The CSS is the "Certificate, Share on LinkedIn, public certificate page (S3-16)" block in `system/uxgate.css`.

## The certificate art

- **Drawn at 1200 × 628.** This is LinkedIn's link-preview size, so one picture serves as the certificate on the page, the PNG download and the `og:image`. The PDF puts the same art on an A4 landscape page.
- **Always light, like paper.** It keeps the same colours in dark mode.
- **Band** (the start side, 340px): the white logo, the "Certificate of skill" overline in highlight, the seal, and three numbers at the bottom: skills Shown, skill checks and lessons. The background is the navy gradient with a dot grid, and a highlight bar marks the inner edge.
- **Main area**, top to bottom:
  - "This certifies that".
  - The name inside a **selection frame with 4 handles**, the brand's design-tool motif.
  - "showed every skill of the path", then the path name in link blue.
  - The "how" line.
  - A footer with Issued date, Certificate ID and "Verify at uxgate.org/c/CODE".
- **Arabic** mirrors the layout (the band moves to the right) and uses the Arabic path name. The stat label is «مهارة «أثبتت»».
- **Phones** (`.cx.is-tall`) show the same parts stacked: the band on top (logo, overline and seal, with the three numbers as small tiles), then the main area. Text sizes are 30/21/13px, so everything stays readable at 358px wide. This replaces the shrunk landscape art, which was unreadable on phones.

## Certificate page (`/app/certificate/[pathId]`)

- **Desktop:** the art at 720px wide on the left. On the right are the actions, then the settings card.
- **Phones:** the tall art first, then the same actions full width, with the bottom bar below.
- Actions, in this order:
  1. **Share on LinkedIn**: primary, with an "in" mark. Opens the share sheet.
  2. **Add to LinkedIn profile**: secondary. Opens `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=<path name> certificate&organizationName=UXGate&issueYear=<yyyy>&issueMonth=<m>&certUrl=<public url>&certId=<ID>` in a new tab. LinkedIn fills in its Licenses & certifications form. If the certificate page is off, turn it on first, as in the share sheet, because certUrl must open.
  3. Three small tiles: **PDF** (the existing print flow), **Image** (downloads the 1200 × 628 PNG from the og route) and **Copy link** (the public URL, with a "Copied" toast).
- **Settings card:**
  - "Certificate page" switch: Private, only you can open it, or Public, anyone with the link.
  - "Check this certificate" row showing the URL and ID.
- **Privacy note:** "Visitors see your name, the path, the skill count and the date. Never your email, XP or streak."

## Share on LinkedIn (sheet on phones, dialog on desktop)

- **Your post:** the ready text, shown as the post will read. EN and AR versions follow the app language:
  - EN: "I earned my UXGate certificate in {path}. I showed all {n} skills on new cases, with no hints, in {checks} skill checks. / See it here: {url} / #UX #UXDesign #UXGate"
  - AR: «حصلت على شهادة UXGate في مسار «{path}». أثبتّ كل المهارات الـ{n} في حالات جديدة، بدون تلميحات، في {checks} اختبارات مهارة. / شاهدها هنا: {url} / #UX #تجربة_المستخدم #UXGate». Use the plural rules for {n} and {checks}.
- **How the link looks on LinkedIn:** the art at card size, then the og:title and `uxgate.org`.
- **Notice**, shown only while the certificate page is private: "Sharing turns your certificate page on, so LinkedIn can show the image…". Pressing the main button turns the page on, as the switch does.
- **Main button: "Copy the text and open LinkedIn".** It:
  1. Turns the page on if needed.
  2. Copies the post text to the clipboard.
  3. Opens `https://www.linkedin.com/feed/?shareActive=true&text=<encoded post text including the URL>` in a new tab. On phones the LinkedIn app may open instead.
- **Fallback:** LinkedIn sometimes drops the prefilled text, mostly in its phone app. The text is already copied, so the line under the button says "If LinkedIn opens without the text, paste it. It's already copied." If shareActive stops working, use `https://www.linkedin.com/sharing/share-offsite/?url=<public url>`, LinkedIn's documented share link. It opens with the link preview, and the copied text can be pasted.
- **Why not attach the image directly:** LinkedIn's share links can't carry an image. The certificate reaches the post through the link preview: LinkedIn reads `og:image` from the public page. Attaching a real image file would need LinkedIn's API with the learner signing in to LinkedIn, which is out of scope for launch. "Download image" covers people who want to attach it themselves.

## Public certificate page (`/c/[code]`, `/ar/c/[code]`)

- New route, with the same visual language as the public pages:
  - Logo and language link.
  - "Verified certificate" chip (mint, seal check).
  - h1 "{name} · {path}".
  - The art: 1000px on desktop, tall on phones.
  - A facts list: issued to, path, skills Shown "40 of 40", issued date, certificate ID.
  - A "What this means" panel with "Start learning on UXGate" and "Unit 1 of every path is free."
- **Off by default.** It's a 404 until the learner turns the certificate page on, or shares, and again as soon as they turn it off. Read it on every request with no cache, like `/u/[handle]`.
- `noindex` for search engines. LinkedIn still reads the Open Graph tags.
- **Metadata:**
  - og:title "{name} · {path} · UXGate certificate".
  - og:description is the "how" line.
  - og:image `/c/[code]/og.png`: a 1200 × 628 PNG made with `next/og` from the same art, in the page's language, with fonts embedded.
  - og:url, plus `twitter:card` summary_large_image.
- **LinkedIn caching:** LinkedIn caches link previews. The image URL should change if a name is edited, for example by adding `?v=<updated_at>`.

## Data

- New column `certificates.public boolean not null default false`, set by the switch and by sharing. This is separate from the achievement page (`profiles.share_enabled`, `/u/[handle]`).
- The page reads by `code` and returns only:
  - display name
  - path
  - skill counts
  - issued date
  - code

## Accessibility

- The art is an `article` labelled "Certificate of skill", and its text is real text.
- The share sheet is a modal dialog: focus moves into it, Esc closes it, and focus returns to the button.
- The post preview is read-only text.
- "Copied" is announced in a polite live region.

## Check the name before the first certificate (approved by Eyad 7 Nov, canvas v83)

The name printed on a certificate is hard to take back once it's on LinkedIn, and Google sign-ups used to get their email prefix as their name. The proposal adds two things.

1. **A one-time check** the first time a certificate is issued (views `nameCheck` and `nameFix`). It opens as a sheet over the certificate page before anything can be shared or downloaded.
   - Title "Your first certificate is ready" / «شهادتك الأولى جاهزة», with a certificate icon.
   - A preview of the name in the certificate's selection frame, under "Your certificate will show" / «ستعرض شهادتك».
   - **Normal name** (`nameCheck`): "Yes, use this name" (primary) and "Edit the name" (secondary). Edit turns the sheet into the field state.
   - **Name looks like part of an email** (`nameFix`): it contains `@`, a digit, `.` or `_`, or it equals the email's local part. The sheet opens with the "Name on your certificates" field already focused and the line "Your name came from your email. Write it the way you want it on your certificate." The preview updates as the learner types. The button is "Save and see my certificate". The rule is 2 to 60 characters after trimming, with the error under the field (design audit U1).
   - Footnote: "You can change it later in Settings. Copies you've already shared keep the old name."
   - Store `profiles.name_confirmed_at`. The sheet shows only while it's empty, so it appears once per account, not once per certificate. Saving updates `display_name` too.
2. **A quiet row afterwards:** "Name on certificates · {name} · Edit" at the top of the certificate page's settings card. It opens Settings > Profile > Name.

Esc or the scrim closes the sheet without confirming. The sheet comes back on the next visit, and Share, Add to profile, PDF and Image open it first until the name is confirmed.

## Build notes (PR #213)

- Download PDF makes a real PDF file instead of opening the print dialog.
- Phones keep the landscape certificate, scaled to fit the width, instead of the stacked tall version (`.cx.is-tall`). The S3-16 board still shows the tall version.

## Build notes (PR #218)

- The share sheet offers 3 post versions as chips above the post. The post text can be edited before sharing, and the edited text is what gets copied and opened in LinkedIn.
- The phone share sheet was fixed.
- The S3-16 board's share frame still shows one fixed, read-only post. PR #220 made the post read-only again, so the "Accessibility" note that the post preview is read-only text applies again.

## Build notes (PR #219)

- The post versions start in English. A "Translate to Arabic" / "Show in English" toggle switches all three versions.
- The selected version uses the app's selected chip style with a check icon.
- **Phones:** LinkedIn's app ignores prefilled text sent in a link. So the post text is copied, LinkedIn's share composer opens with the certificate link preview, and a toast tells the learner to paste the text.
- Desktop is unchanged.

## Build notes (PR #220, from Eyad's feedback on #219)

- The post text is read-only. There's no editing inside UXGate, and learners edit it in LinkedIn.
- **Phones:** the text is copied and LinkedIn's composer opens.
  - On Android, a link opens the LinkedIn app directly. If the app isn't installed, it falls back to LinkedIn's website.
  - Other phones use the normal LinkedIn link.
  - A toast tells the learner to paste the text.
- The "Translate to Arabic" button shows the translate icon.
