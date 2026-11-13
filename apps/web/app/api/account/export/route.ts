import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { withinDbLimit } from "@/lib/server/rate-limit";
import { EXPORT_TABLES, buildExport } from "@/lib/export";

export const dynamic = "force-dynamic";

/**
 * Download my data: every row the learner owns, as one JSON file. Read with the learner's own session, so row-level
 * security guarantees no other learner's rows can be in it, and every query also filters on their id.
 */
export async function GET() {
  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (hasServiceKey() && !(await withinDbLimit(createAdminClient(), user.id, "data-export", 10, 3600))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "3600" } });
  }
  const tables: Record<string, unknown[]> = {};
  await Promise.all(
    EXPORT_TABLES.map(async ({ table, columns }) => {
      const { data, error } = await db.from(table).select(columns).eq("user_id", user.id).limit(10000);
      // A table another slice adds later may not exist yet on this database; leave it out instead of failing the download.
      if (!error) tables[table] = data ?? [];
    }),
  );
  const body = buildExport(
    {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at,
      provider: (user.app_metadata?.provider as string | undefined) ?? "email",
    },
    tables,
    new Date(),
  );
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="uxgate-data-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
