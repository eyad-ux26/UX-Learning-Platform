// Pure helpers for the certificate page and Share on LinkedIn (design S3-16, docs/design/slice-3/certificate.md).
export const certId = (pathId: string, code: string) => `UXG-${pathId}-${code.slice(0, 6).toUpperCase()}`;
export const publicUrl = (origin: string, locale: string, code: string) => `${origin}/${locale}/c/${code}`;
/** The picture LinkedIn shows: the og route, with a version so a changed name or switch is not served from LinkedIn's cache. */
export const ogUrl = (origin: string, locale: string, code: string, changedAt: string) =>
  `${origin}/${locale}/c/${code}/og.png?v=${new Date(changedAt).getTime()}`;

/** The post text: lines joined by a blank line, the link last before the tags. */
export function postText(lines: { intro: string; seeIt: string; tags: string }, url: string): string {
  return [lines.intro, `${lines.seeIt} ${url}`, lines.tags].join("\n\n");
}
/** Opens LinkedIn's composer with the text. LinkedIn sometimes drops it (mostly in its phone app), which is why the text is also copied. */
export const linkedInFeedUrl = (text: string) =>
  `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
/** The documented share link: it opens with the link preview (the og image) and no text. */
export const linkedInOffsiteUrl = (url: string) =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
/** Opens LinkedIn's "Add license or certification" form, filled in. certUrl must open, so the certificate page has to be on. */
export function linkedInProfileUrl(p: { pathName: string; issuedAt: string; url: string; id: string }): string {
  const d = new Date(p.issuedAt);
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${p.pathName} certificate`,
    organizationName: "UXGate",
    issueYear: String(d.getUTCFullYear()),
    issueMonth: String(d.getUTCMonth() + 1),
    certUrl: p.url,
    certId: p.id,
  });
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}

/** A download file name from the learner's name and the path: "UXGate certificate - Salma Ahmed - Forms That Flow.pdf". `ascii` is the safe fallback for old browsers. */
export function certFileName(name: string, pathName: string, ext: string): { utf8: string; ascii: string } {
  const clean = (s: string) =>
    s
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const utf8 = `UXGate certificate - ${clean(name) || "learner"} - ${clean(pathName)}.${ext}`;
  const ascii =
    utf8
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/\s+/g, " ")
      .replace(/-\s+-/g, "-")
      .trim() || `uxgate-certificate.${ext}`;
  return { utf8, ascii: ascii.includes(`.${ext}`) ? ascii : `${ascii}.${ext}` };
}
