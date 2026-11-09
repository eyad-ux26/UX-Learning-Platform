"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useState } from "react";
import { adminGoogleSignIn, adminPasswordSignIn, acceptInvite, startTwoStep, verifyTwoStep, type GateResult } from "./actions";

const Err = ({ s }: { s: GateResult }) => (s && !s.ok && s.error ? <p className="a-err" role="alert"><span className="i i-warning" aria-hidden="true" />{s.error}</p> : null);

export function SignInForms({ next }: { next: string }) {
  const [pw, pwAction, pwPending] = useActionState(adminPasswordSignIn, null);
  const [g, gAction, gPending] = useActionState(adminGoogleSignIn, null);
  // Kept in state so a wrong password does not clear the typed email (React resets uncontrolled fields after an action).
  const [email, setEmail] = useState("");
  return (
    <div className="a-stack">
      <form action={pwAction} className="a-stack">
        <input type="hidden" name="next" value={next} />
        <div className="a-field"><label htmlFor="em">Email</label><input id="em" name="email" type="email" className="a-in" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="a-field"><label htmlFor="pw">Password</label><input id="pw" name="password" type="password" className="a-in" autoComplete="current-password" required /></div>
        <Err s={pw} />
        <button className="a-btn pri" type="submit" disabled={pwPending} aria-busy={pwPending}>{pwPending ? "Signing in…" : "Continue"}</button>
      </form>
      <p className="t-xs ink-3" style={{ textAlign: "center" }}>or</p>
      <form action={gAction}>
        <input type="hidden" name="next" value={next} />
        <button className="a-btn" type="submit" style={{ width: "100%" }} disabled={gPending} aria-busy={gPending}><span className="i i-google-logo" aria-hidden="true" />Continue with Google</button>
        <Err s={g} />
      </form>
    </div>
  );
}

export function TwoStepSetup({ next }: { next: string }) {
  const [setup, setSetup] = useState<GateResult>(null);
  const [busy, setBusy] = useState(false);
  const [v, vAction, vPending] = useActionState(verifyTwoStep, null);
  if (!setup?.ok) {
    return (
      <div className="a-stack">
        <ol className="t-sm ink-2" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password or similar).</li>
          <li>Scan the code we show you, then type the 6 digits the app shows.</li>
        </ol>
        <Err s={setup} />
        <button className="a-btn pri" type="button" disabled={busy} aria-busy={busy} onClick={async () => { setBusy(true); setSetup(await startTwoStep()); setBusy(false); }}>
          <span className="i i-shield-check" aria-hidden="true" />Set up two-step sign-in
        </button>
      </div>
    );
  }
  return (
    <form action={vAction} className="a-stack">
      <input type="hidden" name="factorId" value={setup.factorId} />
      <input type="hidden" name="next" value={next} />
      <div className="a-qr"><img src={setup.qr} alt="QR code for your authenticator app" /></div>
      <p className="t-xs ink-2">Can’t scan? Type this key in the app: <span className="a-code">{setup.secret}</span></p>
      <div className="a-field"><label htmlFor="code">6-digit code</label><input id="code" name="code" className="a-in" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus /></div>
      <Err s={v} />
      <button className="a-btn pri" type="submit" disabled={vPending} aria-busy={vPending}>{vPending ? "Checking…" : "Turn on and continue"}</button>
    </form>
  );
}

export function TwoStepVerify({ next }: { next: string }) {
  const [v, vAction, vPending] = useActionState(verifyTwoStep, null);
  return (
    <form action={vAction} className="a-stack">
      <input type="hidden" name="next" value={next} />
      <div className="a-field"><label htmlFor="code">6-digit code from your authenticator app</label><input id="code" name="code" className="a-in" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus /></div>
      <Err s={v} />
      <button className="a-btn pri" type="submit" disabled={vPending} aria-busy={vPending}>{vPending ? "Checking…" : "Continue"}</button>
    </form>
  );
}

export function AcceptInvite({ token }: { token: string }) {
  const [s, action, pending] = useActionState(acceptInvite, null);
  return (
    <form action={action} className="a-stack">
      <input type="hidden" name="token" value={token} />
      <Err s={s} />
      <button className="a-btn pri" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Joining…" : "Accept and join the team"}</button>
    </form>
  );
}
