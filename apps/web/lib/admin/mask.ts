// Personal data is masked by default (requirements: "Data protection"). Pure.

/** "nadia.samir@gmail.com" -> "na•••@g•••.com". Keeps enough to tell two learners apart, not enough to write to them. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [user, domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${user.slice(0, Math.min(2, Math.max(1, user.length - 1)))}•••@${host.slice(0, 1)}•••${tld}`;
}

/** "41.234.12.9" -> "41.234.•.•"; IPv6 keeps the first two groups. */
export function maskIp(ip: string | null | undefined): string {
  if (!ip) return "";
  if (ip.includes(":")) return ip.split(":").slice(0, 2).join(":") + ":•••";
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.•.•` : "•••";
}

/** A name shows its first word and the initial of the rest: "Nadia Samir" -> "Nadia S." */
export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  const w = name.trim().split(/\s+/);
  return w.length > 1 ? `${w[0]} ${w.slice(1).map((x) => x.charAt(0) + ".").join(" ")}` : w[0];
}
