import { requireAdmin } from "@/lib/admin/guard";
import { navFor, roleName } from "@/lib/admin/permissions";
import { navCounts } from "@/lib/admin/data/counts";
import { Nav } from "@/components/admin/Nav";
import { TopBar } from "@/components/admin/TopBar";

export const dynamic = "force-dynamic";

// The panel shell. The guard here only builds the menu; every page and action checks its own permission again.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const { counts, bell } = await navCounts(ctx).catch(() => ({ counts: {}, bell: 0 }));
  const initials = ctx.name.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "A";
  const roleLabel = ctx.roles.length ? ctx.roles.map((r) => roleName(r)).join(" · ") + (ctx.founding ? " · founding" : "") : "No role yet";
  return (
    <div className="a-shell">
      <Nav groups={navFor(ctx.perms)} counts={counts} />
      <div className="a-main">
        <TopBar name={ctx.name} roleLabel={roleLabel} initials={initials} env={ctx.env} bell={bell} groups={navFor(ctx.perms)} counts={counts} />
        {children}
      </div>
    </div>
  );
}
