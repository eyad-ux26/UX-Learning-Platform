import { redirect } from "next/navigation";
import { getAdminState } from "@/lib/admin/guard";
import { GateCard } from "../GateCard";
import { SignInForms } from "../GateForms";
import { gateSignOut } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function AdminSignIn({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string; out?: string }> }) {
  const sp = await searchParams;
  const s = await getAdminState();
  if (s.kind === "ok") redirect("/admin");
  if (s.kind === "two_step_setup" || s.kind === "two_step_verify") redirect("/admin/two-step");
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin") ? sp.next : "/admin";
  return (
    <GateCard title="Sign in to the admin panel" step="Step 1 of 2" sub="Use your UXGate account. Two-step sign-in comes next.">
      {sp.expired ? <p className="a-note t-sm"><span className="i i-clock" aria-hidden="true" />Your admin session ended (30 minutes idle or 12 hours in total). Sign in again.</p> : null}
      {sp.out ? <p className="a-ok"><span className="i i-check-circle-fill" aria-hidden="true" />You are signed out.</p> : null}
      {s.kind === "expired" ? <ExpiredSignOut /> : <SignInForms next={next} />}
    </GateCard>
  );
}

function ExpiredSignOut() {
  return (
    <form action={gateSignOut} className="a-stack">
      <p className="t-sm ink-2">For your safety, sign out and sign in again to start a new admin session.</p>
      <button className="a-btn pri" type="submit">Sign out and start again</button>
    </form>
  );
}
