import { Shell } from "@/components/app/Shell";
import type { Learner } from "@/lib/server/learner";

/** The signed-in frame for the slice 4 screens (settings, inbox, help, requests). */
export function AccountFrame({ me, children }: { me: Learner; locale?: string; children: React.ReactNode }) {
  return (
    <Shell me={me}>
      <div className="s4-page">{children}</div>
    </Shell>
  );
}
