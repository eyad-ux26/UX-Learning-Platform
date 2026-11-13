// How each inbox item reads and where it opens. Copy lives in messages (namespace "inbox"); an item stores only data.
import type { InboxKind } from "./notifications";

type L = { en: string; ar: string };
export type InboxData = {
  lesson?: L;
  path?: string;
  minutes?: number;
  count?: number;
  name?: L;
  cert?: boolean;
  status?: "accepted" | "declined";
  xp?: number;
};

export type InboxCopy = {
  icon: string;
  tone: "" | "is-mint" | "is-gold" | "is-warm";
  title: string;
  body: string;
  go: string;
  values: Record<string, string | number>;
};

const pick = (l: L | undefined, locale: "en" | "ar") => (l ? l[locale] || l.en : "");

export function inboxCopy(kind: InboxKind, d: InboxData, locale: "en" | "ar" = "en"): InboxCopy {
  switch (kind) {
    case "reminder":
      return d.lesson
        ? {
            icon: "ph-bell",
            tone: "",
            title: "t_reminder",
            body: "b_reminder",
            go: "go_reminder",
            values: { lesson: pick(d.lesson, locale), minutes: d.minutes ?? 5, path: d.path ?? "" },
          }
        : { icon: "ph-bell", tone: "", title: "t_reminder", body: "b_reminder_short", go: "go_reminder", values: {} };
    case "goal":
      return { icon: "ph-flame", tone: "is-warm", title: "t_goal", body: "b_goal", go: "go_goal", values: {} };
    case "review":
      return {
        icon: "ph-review",
        tone: "",
        title: "t_review",
        body: "b_review",
        go: "go_review",
        values: { count: d.count ?? 1, minutes: d.minutes ?? 5 },
      };
    case "badge":
      if (d.cert)
        return {
          icon: "ph-certificate",
          tone: "is-gold",
          title: "t_cert",
          body: "b_cert",
          go: "go_cert",
          values: { path: d.path ?? "" },
        };
      return d.name
        ? {
            icon: "ph-star-fill",
            tone: "is-gold",
            title: "t_badge",
            body: "b_badge",
            go: "go_badge",
            values: { name: pick(d.name, locale) },
          }
        : {
            icon: "ph-star-fill",
            tone: "is-gold",
            title: "t_badge_plain",
            body: "b_badge",
            go: "go_badge",
            values: {},
          };
    case "answer":
      return d.status === "accepted"
        ? {
            icon: "ph-chat-text",
            tone: "is-mint",
            title: "t_answer_yes",
            body: "b_answer_yes",
            go: "go_answer",
            values: { xp: d.xp ?? 10 },
          }
        : {
            icon: "ph-chat-text",
            tone: "",
            title: "t_answer_kept",
            body: "b_answer_kept",
            go: "go_answer",
            values: {},
          };
    case "billing":
      return { icon: "ph-check-circle", tone: "", title: "t_billing", body: "b_billing", go: "go_billing", values: {} };
    case "welcome":
    default:
      return {
        icon: "ph-hand-waving",
        tone: "is-mint",
        title: "t_welcome",
        body: "b_welcome",
        go: "go_welcome",
        values: {},
      };
  }
}

/** "2 h", "Yesterday", "1 Nov": short times on the right of each row. */
export function shortAgo(
  at: string,
  now: Date,
  locale: "en" | "ar",
): { key: "now" | "minAgo" | "hAgo" | "yesterday" | null; count?: number; text?: string } {
  const t = new Date(at).getTime();
  const mins = Math.max(0, Math.round((now.getTime() - t) / 60000));
  if (mins < 1) return { key: "now" };
  if (mins < 60) return { key: "minAgo", count: mins };
  if (mins < 24 * 60) return { key: "hAgo", count: Math.round(mins / 60) };
  if (mins < 48 * 60) return { key: "yesterday" };
  return {
    key: null,
    text: new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
      day: "numeric",
      month: "short",
    }).format(new Date(at)),
  };
}

/** Only paths inside the app may be stored as where an item opens. */
export const safeHref = (h: string | null | undefined) =>
  h && /^\/[A-Za-z0-9/_?=&.-]*$/.test(h) && !h.startsWith("//") ? h : "/app";
