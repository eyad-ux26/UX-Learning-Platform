import { redirect } from "next/navigation";
import { getAdminState, gatePath } from "@/lib/admin/guard";
import { GateCard } from "../GateCard";
import { TwoStepSetup, TwoStepVerify } from "../GateForms";
import { gateSignOut } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Two-step sign-in" };

export default async function TwoStep({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const s = await getAdminState();
  if (s.kind === "ok") redirect("/admin");
  if (s.kind !== "two_step_setup" && s.kind !== "two_step_verify") redirect(gatePath(s));
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin") ? sp.next : "/admin";
  const out = <form action={gateSignOut}><button className="a-btn ghost sm" type="submit">Not {s.email}? Sign out</button></form>;
  return s.kind === "two_step_setup" ? (
    <GateCard title="Set up two-step sign-in" step="Step 2 of 2" sub="Every admin account needs it. A password or Google alone is not enough for the admin panel.">
      <TwoStepSetup next={next} />{out}
    </GateCard>
  ) : (
    <GateCard title="Two-step sign-in" step="Step 2 of 2" sub={`Signed in as ${s.email}.`}>
      <TwoStepVerify next={next} />{out}
    </GateCard>
  );
}
