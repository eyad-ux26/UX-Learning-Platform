import { PathName } from "@/components/PathName";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { content, type Locale } from "@uxgate/content";
import { Logo } from "@/components/Logo";
import { Link } from "@/i18n/navigation";
import { localPathName } from "@/lib/catalog";
import { HANDLE_RE, isShown } from "@/lib/certificate";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/env";

// Read on every request: turning the page off must take it down at once, so nothing here may be cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function load(handle: string) {
  if (!HANDLE_RE.test(handle) || !hasSupabase()) return null;
  try {
    const db = createAdminClient();
    const { data: p } = await db
      .from("profiles")
      .select("user_id, display_name, share_enabled")
      .ilike("handle", handle)
      .maybeSingle();
    if (!p || !p.share_enabled || !p.display_name) return null;
    const { data: states } = await db
      .from("skill_states")
      .select("skill_id, state, shown_at")
      .eq("user_id", p.user_id)
      .in("state", ["shown", "kept"]);
    return {
      name: p.display_name as string,
      states: (states ?? []).filter((s) => isShown(s.state as "shown" | "kept")),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const d = await load(handle);
  return d ? { title: `${d.name} · UXGate`, robots: { index: false } } : { title: "UXGate", robots: { index: false } };
}

/** The public achievement page: name, path, skills Shown and the date, nothing else. Off by default, so most handles are a 404. */
export default async function PublicPage({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const d = await load(handle);
  if (!d) notFound();
  const t = await getTranslations("pub");
  const loc = locale as Locale;
  const byId = new Map(d.states.map((s) => [s.skill_id as string, s.shown_at as string | null]));
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const paths = [...new Set(content.units.map((u) => u.pathId))]
    .map((pid) => {
      const skills = content.units
        .filter((u) => u.pathId === pid)
        .flatMap((u) => u.skills)
        .filter((s) => byId.has(s.id));
      const last =
        skills
          .map((s) => byId.get(s.id))
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;
      return { pid, skills, last };
    })
    .filter((p) => p.skills.length > 0);
  return (
    <main className="pub-page">
      <Logo height={32} />
      <h1 className="t-h1">{d.name}</h1>
      <p className="t-small ink-2">{t("by")}</p>
      {paths.length === 0 ? (
        <p className="t-small ink-2">{t("empty")}</p>
      ) : (
        paths.map((p) => (
          <section
            key={p.pid}
            className="card"
            style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
          >
            <h2 className="t-h2">
              <PathName name={localPathName(p.pid, locale) ?? ""} />
            </h2>
            <p className="t-over">{t("skillsShown")}</p>
            <ul style={{ paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {p.skills.map((s) => (
                <li key={s.id} className="t-small">
                  {s.title[loc]}
                </li>
              ))}
            </ul>
            {p.last ? <p className="t-small ink-2">{t("on", { date: fmt.format(new Date(p.last)) })}</p> : null}
          </section>
        ))
      )}
      <Link href="/" className="btn btn-primary btn-lg press">
        {t("cta")}
      </Link>
    </main>
  );
}
