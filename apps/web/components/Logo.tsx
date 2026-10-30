/* eslint-disable @next/next/no-img-element */
// Full-colour logo on light, white logo on night. The swap is CSS so there is no flash.
export function Logo({ height = 26 }: { height?: number }) {
  const style = { height, width: "auto" };
  return (
    <>
      <img className="logo-on-light" src="/brand/logo.svg" alt="UXGate" style={style} />
      <img className="logo-on-dark" src="/brand/logo-white.svg" alt="UXGate" style={style} />
    </>
  );
}
