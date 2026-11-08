/** The name looks like part of an email (or was never written by the learner): it has @, a digit, a dot or an underscore, or equals the email's local part. */
export function nameLooksLikeEmail(name: string, email: string | null): boolean {
  const n = name.trim();
  if (/[@\d._]/.test(n)) return true;
  const local = (email ?? "").split("@")[0].trim().toLowerCase();
  return !!local && n.toLowerCase() === local;
}
/** 2 to 60 characters after trimming. */
export const validCertName = (name: string): boolean => { const n = name.trim(); return n.length >= 2 && n.length <= 60; };
