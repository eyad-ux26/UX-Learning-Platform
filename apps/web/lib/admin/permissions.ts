// Admin panel permissions and built-in roles (requirements: "Roles and permissions"). Pure, so the menu, the guard and the
// role tests all read the same table. The database holds the same list (supabase/migrations/0044_admin_access.sql, seeded
// from here by scripts/admin-sql.mjs) and checks it again in every function that changes something.

export type Area = "overview" | "learners" | "support" | "billing" | "certificates" | "team" | "audit" | "testing" | "content" | "grow" | "settings" | "phase2";

/** Every permission. A role is a set of these; a member's permissions are the union of their roles. */
export const PERMISSIONS = {
  "dashboard.view": ["overview", "See the dashboard"],

  "learners.view": ["learners", "See learners and Learner 360"],
  "learners.reveal": ["learners", "Reveal masked personal data (asks a reason, logged)"],
  "learners.act": ["learners", "Support actions: resend emails, reset one lesson, add a freeze, Pro for up to 30 days"],
  "learners.manage": ["learners", "Change email, suspend, export data, delete an account"],
  "learners.view_as": ["learners", "View as learner (read only, logged)"],
  "learners.notes": ["learners", "Write team notes on a learner"],

  "support.view": ["support", "See the support inbox"],
  "support.reply": ["support", "Reply to tickets and change their status"],
  "support.assign": ["support", "Assign tickets to others"],
  "support.macros": ["support", "Create and edit macros"],
  "support.settings": ["support", "Change SLA targets, business hours and assignment"],
  "appeals.view": ["support", "See appeals and review requests"],
  "appeals.decide": ["support", "Accept or reject appeals"],

  "subs.view": ["billing", "See subscriptions"],
  "payments.view": ["billing", "See payments"],
  "refunds.view": ["billing", "See refund requests"],
  "refunds.approve": ["billing", "Refund up to the agent limit; larger refunds go to approval"],
  "refunds.approve_any": ["billing", "Refund any amount and approve large refunds"],
  "comp.grant": ["billing", "Give free Pro (comp) for any length"],
  "problems.view": ["billing", "See billing problems"],
  "problems.retry": ["billing", "Retry a webhook that failed"],
  "revenue.view": ["billing", "See revenue"],
  "billing.export": ["billing", "Export billing data for the accountant"],
  "discounts.view": ["billing", "See discount codes"],
  "discounts.create": ["billing", "Create discount codes"],
  "discounts.edit": ["billing", "Pause, resume and change discount codes"],
  "students.review": ["billing", "Review student checks"],
  "prices.view": ["billing", "See prices and plans"],

  "certs.view": ["certificates", "Find certificates"],
  "certs.manage": ["certificates", "Revoke and re-issue certificates"],

  "team.view": ["team", "See the team and roles"],
  "team.invite": ["team", "Invite, suspend and change the roles of team members (not super admins)"],
  "team.roles": ["team", "Create and edit custom roles"],
  "team.super": ["team", "Grant and remove super admin"],

  "audit.view": ["audit", "Read the whole audit log"],
  "audit.area_support": ["audit", "Read the audit log for learners and support"],
  "audit.area_billing": ["audit", "Read the audit log for billing"],
  "audit.area_content": ["audit", "Read the audit log for content"],
  "audit.export": ["audit", "Export the audit log"],

  "testing.tools": ["testing", "Team testing tools on their own learner account"],

  // Phase 2 ("Grow and improve"). The keys marked P2_NEW below are added by 0060; the others were seeded by 0044 as
  // placeholders (area "phase2") so the menu could show them before Phase 2 was built.
  "help.view": ["support", "See the help centre"],
  "help.edit": ["support", "Write and publish help articles"],
  "learners.merge": ["learners", "Merge two accounts of one learner (typed confirm, logged)"],
  "trials.extend": ["billing", "Extend a learner's free trial"],
  "prices.change": ["billing", "Ask for a price change; a second person with this permission approves"],

  "content.view": ["content", "See paths, lessons, skills and releases"],
  "content.edit": ["content", "Edit lesson drafts in English and Arabic and send them for review"],
  "content.publish": ["content", "Publish and roll back releases (never a change they wrote)"],
  "releases.view": ["content", "See releases and version history"],
  "media.view": ["content", "See the media library"],
  "media.manage": ["content", "Upload videos, edit captions, images and alt text"],
  "media.own": ["content", "Upload and caption their own videos only (instructors)"],
  "instructors.view": ["content", "See instructors"],
  "instructors.manage": ["content", "Edit instructor profiles"],
  "quality.view": ["content", "See content quality flags and lesson reports"],
  "quality.manage": ["content", "Change the status of quality flags"],

  "reports.view": ["grow", "See learning, growth and certificate reports (money needs revenue)"],
  "reports.schedule": ["grow", "Save and schedule reports"],
  "comms.view": ["grow", "See campaigns, announcements, templates, the waitlist and the email log"],
  "comms.send": ["grow", "Write and schedule campaigns and announcements, invite from the waitlist"],
  "comms.templates": ["grow", "Edit email templates"],
  "comms.approve": ["grow", "Approve messages to more than 500 learners"],

  "settings.view": ["settings", "See platform settings"],
  "settings.flags": ["settings", "Turn feature flags on and off"],
  "settings.rules": ["settings", "Change learning rules"],
  "settings.access": ["settings", "Change the Coming Soon gate, maintenance mode and the team password"],
  "settings.legal": ["settings", "Publish terms, privacy and refund pages"],
  "health.view": ["settings", "See system health and scheduled jobs"],
  "health.jobs": ["settings", "Run a scheduled job now (jobs that email learners never)"],
} as const satisfies Record<string, readonly [Area, string]>;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

/** Keys that 0060 adds. 0044 (seedSql(1)) leaves them out of the keys and of the built-in roles. */
export const P2_NEW: readonly Permission[] = [
  "help.edit", "learners.merge", "trials.extend", "prices.change", "media.manage", "media.own", "instructors.manage", "quality.manage",
  "reports.schedule", "comms.send", "comms.templates", "comms.approve", "settings.flags", "settings.rules", "settings.access", "settings.legal", "health.jobs",
];
/** Keys 0044 seeded as Phase 2 placeholders, in the "phase2" area. */
const P2_PLACEHOLDER: readonly Permission[] = [
  "help.view", "content.view", "content.edit", "content.publish", "media.view", "instructors.view", "quality.view", "releases.view", "reports.view", "comms.view", "settings.view", "health.view",
];

type RoleDef = { id: string; name: string; description: string; permissions: Permission[] };

const ALL = PERMISSION_KEYS;
const without = (...drop: Permission[]) => ALL.filter((p) => !drop.includes(p));

/** The built-in roles, in menu order. Super admin is given only through the 24-hour grant. */
export const BUILTIN_ROLES: RoleDef[] = [
  { id: "super_admin", name: "Super admin", description: "Founders. Everything, including super admins and the audit log export.", permissions: [...ALL] },
  { id: "admin", name: "Admin", description: "Operations lead. Everything except super admins, the audit log export and running jobs by hand.", permissions: without("team.super", "audit.export", "health.jobs") },
  {
    id: "support_lead", name: "Support lead", description: "Head of support. Support agent rights plus any refund, macros, SLA settings, assignment and support reports.",
    permissions: ["dashboard.view", "learners.view", "learners.reveal", "learners.act", "learners.manage", "learners.view_as", "learners.notes",
      "support.view", "support.reply", "support.assign", "support.macros", "support.settings", "appeals.view", "appeals.decide",
      "subs.view", "payments.view", "refunds.view", "refunds.approve", "refunds.approve_any", "comp.grant", "discounts.view",
      "certs.view", "certs.manage", "audit.area_support", "help.view", "help.edit", "content.view", "quality.view", "reports.view",
      "learners.merge", "trials.extend"],
  },
  {
    id: "support_agent", name: "Support agent", description: "Customer support. Learner 360, tickets, appeals, small refunds and Pro for up to 30 days.",
    permissions: ["dashboard.view", "learners.view", "learners.reveal", "learners.act", "learners.view_as", "learners.notes",
      "support.view", "support.reply", "appeals.view", "appeals.decide", "payments.view", "refunds.view", "refunds.approve",
      "certs.view", "content.view", "quality.view", "help.view", "trials.extend"],
  },
  {
    id: "billing_manager", name: "Billing manager", description: "Finance. Payments, subscriptions, refunds, discount codes, prices and revenue. No content.",
    permissions: ["dashboard.view", "learners.view", "learners.reveal", "learners.notes", "support.view",
      "subs.view", "payments.view", "refunds.view", "refunds.approve", "refunds.approve_any", "comp.grant", "problems.view", "problems.retry",
      "revenue.view", "billing.export", "discounts.view", "discounts.create", "discounts.edit", "students.review", "prices.view",
      "audit.area_billing", "reports.view", "prices.change", "trials.extend"],
  },
  {
    id: "content_publisher", name: "Content publisher", description: "Content lead. Content editor rights plus review, publish and roll back (Phase 2).",
    permissions: ["dashboard.view", "content.view", "content.edit", "content.publish", "media.view", "media.manage", "instructors.view", "instructors.manage", "quality.view", "quality.manage", "releases.view", "reports.view", "audit.area_content", "help.view", "help.edit"],
  },
  {
    id: "content_editor", name: "Content editor", description: "Content team. Edit drafts of paths, lessons, skills, media and translations (Phase 2).",
    permissions: ["dashboard.view", "content.view", "content.edit", "media.view", "media.manage", "instructors.view", "quality.view", "releases.view", "reports.view", "help.view"],
  },
  {
    id: "instructor", name: "Instructor", description: "Video instructors on hybrid paths. Their own profile and videos, stats for their paths (Phase 2).",
    permissions: ["dashboard.view", "media.view", "media.own", "instructors.view", "reports.view"],
  },
  {
    id: "marketing", name: "Marketing", description: "Growth. Waitlist, announcements, campaigns (Phase 2) and creating discount codes. No personal data export.",
    permissions: ["dashboard.view", "discounts.view", "discounts.create", "reports.view", "reports.schedule", "comms.view", "comms.send", "comms.templates"],
  },
  {
    id: "analyst", name: "Analyst", description: "Reporting. Read only, with personal data always masked.",
    permissions: ["dashboard.view", "learners.view", "support.view", "appeals.view", "subs.view", "payments.view", "refunds.view", "revenue.view",
      "discounts.view", "prices.view", "certs.view", "content.view", "quality.view", "reports.view", "reports.schedule", "audit.view", "health.view", "settings.view", "releases.view", "comms.view", "media.view"],
  },
  {
    id: "viewer", name: "Viewer / QA tester", description: "Team testing. Read-only views and the team testing tools on their own account only.",
    permissions: ["dashboard.view", "content.view", "testing.tools"],
  },
];

export const BUILTIN_ROLE_IDS = BUILTIN_ROLES.map((r) => r.id);
export const roleName = (id: string, custom: { id: string; name: string }[] = []) =>
  BUILTIN_ROLES.find((r) => r.id === id)?.name ?? custom.find((r) => r.id === id)?.name ?? id;

/** Union of the permissions of these roles (built-in ones from the table above, custom ones as given). */
export function permsOf(roleIds: string[], custom: { id: string; permissions: string[] }[] = []): Set<Permission> {
  const out = new Set<Permission>();
  for (const id of roleIds) {
    const r = BUILTIN_ROLES.find((b) => b.id === id) ?? custom.find((c) => c.id === id);
    for (const p of r?.permissions ?? []) if (p in PERMISSIONS) out.add(p as Permission);
  }
  return out;
}

export type Perms = ReadonlySet<string>;
export const can = (perms: Perms, p: Permission) => perms.has(p);
export const canAny = (perms: Perms, ...ps: Permission[]) => ps.some((p) => perms.has(p));

/** Audit areas a member may read: all, or the areas their roles cover. */
export function auditAreas(perms: Perms): "all" | string[] {
  if (perms.has("audit.view")) return "all";
  const a: string[] = [];
  if (perms.has("audit.area_support")) a.push("learners", "support", "appeals");
  if (perms.has("audit.area_billing")) a.push("billing", "refunds", "discounts");
  if (perms.has("audit.area_content")) a.push("content");
  return a;
}

/** Personal data stays masked unless the role may reveal it. Analysts never can. */
export const mayReveal = (perms: Perms) => perms.has("learners.reveal");

// ───────── the menu ─────────

export type NavItem = { id: string; label: string; icon: string; href: string; phase2?: boolean; needs: Permission[] };
export type NavGroup = { label: string; items: NavItem[] };

const item = (id: string, label: string, icon: string, href: string, needs: Permission[], phase2 = false): NavItem => ({ id, label, icon, href, needs, phase2 });

export const NAV: NavGroup[] = [
  { label: "Overview", items: [item("dashboard", "Dashboard", "squares-four", "/admin", ["dashboard.view"]), item("mywork", "My work", "list-checks", "/admin/my-work", [])] },
  {
    label: "People", items: [
      item("learners", "Learners", "users-three", "/admin/learners", ["learners.view"]),
      item("inbox", "Support inbox", "tray", "/admin/support", ["support.view"]),
      item("appeals", "Appeals and reviews", "scales", "/admin/appeals", ["appeals.view"]),
      item("help", "Help centre", "books", "/admin/help-centre", ["help.view"]),
    ],
  },
  {
    label: "Money", items: [
      item("subs", "Subscriptions", "arrows-split", "/admin/billing/subscriptions", ["subs.view"]),
      item("payments", "Payments", "credit-card", "/admin/billing/payments", ["payments.view"]),
      item("refunds", "Refunds", "arrow-u-up-left", "/admin/billing/refunds", ["refunds.view"]),
      item("problems", "Billing problems", "warning", "/admin/billing/problems", ["problems.view"]),
      item("trials", "Free trials", "clock-counter-clockwise", "/admin/billing/trials", ["subs.view", "trials.extend"]),
      item("discounts", "Discounts", "tag", "/admin/billing/discounts", ["discounts.view"]),
      item("prices", "Prices and plans", "receipt", "/admin/billing/prices", ["prices.view"]),
      item("revenue", "Revenue", "chart-line-up", "/admin/billing/revenue", ["revenue.view"]),
    ],
  },
  {
    label: "Content", items: [
      item("paths", "Paths and lessons", "book-open", "/admin/content", ["content.view"]),
      item("skills", "Skills and misconceptions", "star", "/admin/content/skills", ["content.view"]),
      item("media", "Media library", "film-strip", "/admin/media", ["media.view", "media.own"]),
      item("quality", "Content quality", "flag", "/admin/content/quality", ["quality.view"]),
      item("releases", "Releases", "rocket-launch", "/admin/content/releases", ["releases.view", "content.view"]),
    ],
  },
  {
    label: "Grow", items: [
      item("reports", "Reports", "chart-bar", "/admin/reports", ["reports.view"]),
      item("comms", "Communications", "envelope-simple", "/admin/communications", ["comms.view"]),
      item("certs", "Certificates", "certificate", "/admin/certificates", ["certs.view"]),
    ],
  },
  {
    label: "Admin", items: [
      item("team", "Team and roles", "user-gear", "/admin/team", ["team.view"]),
      item("audit", "Audit log", "clock-counter-clockwise", "/admin/audit", ["audit.view", "audit.area_support", "audit.area_billing", "audit.area_content"]),
      item("settings", "Platform settings", "gear-six", "/admin/settings", ["settings.view"]),
      item("health", "System health", "heartbeat", "/admin/health", ["health.view"]),
    ],
  },
];

/** The menu for these permissions: an item shows when the member has any of its permissions; empty groups are dropped. */
export function navFor(perms: Perms): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.needs.length === 0 || i.needs.some((p) => perms.has(p))) })).filter((g) => g.items.length > 0);
}

/**
 * SQL that seeds permission keys and built-in roles (pasted by scripts/admin-sql.mjs). Phase 1 writes 0044's block:
 * the keys and role permissions without the ones 0060 adds, the Phase 2 placeholders in the "phase2" area. Phase 2
 * writes 0060's block: every key and role as the code has them now.
 */
export function seedSql(phase: 1 | 2 = 2): string {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const p1 = phase === 1;
  const keep = (k: Permission) => !p1 || !P2_NEW.includes(k);
  const keyRow = (k: Permission) => `  (${q(k)}, ${q(p1 && P2_PLACEHOLDER.includes(k) ? "phase2" : PERMISSIONS[k][0])}, ${q(PERMISSIONS[k][1])})`;
  const keys = PERMISSION_KEYS.filter(keep).map(keyRow).join(",\n");
  const roles = BUILTIN_ROLES.map((r) => `  (${q(r.id)}, ${q(r.name)}, ${q(r.description)}, true, array[${r.permissions.filter(keep).map(q).join(", ")}]::text[])`).join(",\n");
  return [
    "insert into public.admin_permission_keys (key, area, label) values",
    keys,
    "on conflict (key) do update set area = excluded.area, label = excluded.label;",
    "select set_config('ug.builtin_roles', 'on', false);",
    "insert into public.admin_roles (id, name, description, builtin, permissions) values",
    roles,
    "on conflict (id) do update set name = excluded.name, description = excluded.description, permissions = excluded.permissions;",
    "select set_config('ug.builtin_roles', 'off', false);",
  ].join("\n");
}
