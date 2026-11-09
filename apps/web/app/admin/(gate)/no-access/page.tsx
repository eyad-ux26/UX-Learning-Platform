import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminState } from "@/lib/admin/guard";
import { GateCard } from "../GateCard";
import { gateSignOut } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "No access" };

export default async function NoAccessPage() {
  const s = await getAdminState();
  if (s.kind === "ok") redirect("/admin");
  if (s.kind === "signed_out") redirect("/admin/signin");
  if (s.kind === "not_configured") return <GateCard title="Not set up on this host" sub="The admin panel needs the server key of the database (SUPABASE_SERVICE_ROLE_KEY)."><span /></GateCard>;
  const email = "email" in s ? s.email : "";
  return (
    <GateCard title={s.kind === "suspended" ? "Your admin access is paused" : "You don’t have admin access"}
      sub={s.kind === "suspended" ? "A super admin suspended this account. Your past actions stay in the audit log." : `${email} is not on the UXGate team. A super admin can invite you; the invite comes by email.`}>
      <div className="a-row" style={{ gap: 8 }}>
        <form action={gateSignOut}><button className="a-btn" type="submit">Sign out</button></form>
        <Link className="a-btn ghost" href="/">Go to UXGate</Link>
      </div>
    </GateCard>
  );
}
