// Student price at launch: a university email gets a link. The accepted endings are a config list now and an admin
// setting with the admin panel. Student ID upload waits for the admin panel too (nobody can approve uploads yet).

/** Academic endings. `.edu` and `.ac` count under any country code (.edu.eg, .ac.ae, ...). */
export const STUDENT_SUFFIXES = [".edu", ".edu.??", ".ac.??", ".ac.uk"];

const EMAIL = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;

export function isStudentEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e)) return false;
  const host = e.split("@")[1];
  return STUDENT_SUFFIXES.some((suffix) => {
    const re = new RegExp(`\\.${suffix.slice(1).replace(/\./g, "\\.").replace(/\?/g, "[a-z]")}$`);
    return re.test(`.${host}`) && host.split(".").length >= (suffix.split(".").length);
  });
}

/** A student check lasts a year, then the learner checks again. */
export const STUDENT_VALID_DAYS = 365;
/** The emailed link works for 24 hours. */
export const STUDENT_LINK_HOURS = 24;
