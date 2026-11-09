// Admin panel permissions and built-in roles (requirements: "Roles and permissions"). Pure, so the menu, the guard and the
// role tests all read the same table. The database holds the same list (supabase/migrations/0044_admin_access.sql, seeded
// from here by scripts/admin-sql.mjs) and checks it again in every function that changes something.

export type Area = "overview" | "learners" | "support" | "billing" | "certificates" | "team" | "audit" | "testing" | "phase2";

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

  // Phase 2 areas: the menu shows them (with a placeholder) to the roles that will have them.
  "help.view": ["phase2", "Help centre"],
  "content.view": ["phase2", "See content"],
  "content.edit": ["phase2", "Edit content drafts"],
  "content.publish": ["phase2", "Publish content"],
  "media.view": ["phase2", "Media library"],
  "instructors.view": ["phase2", "Instructors"],
  "quality.view": ["phase2", "Content quality"],
  "releases.view": ["phase2", "Releases"],
  "reports.view": ["phase2", "Reports"],
  "comms.view": ["phase2", "Communications"],
  "settings.view": ["phase2", "Platform settings"],
  "health.view": ["phase2", "System health"],
} as const satisfies Record<string, readonly [Area, string]>;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

type RoleDef = { id: string; name: string; description: string; permissions: Permission[] };

const ALL = PERMISSION_KEYS;
const without = (...drop: Permission[]) => ALL.filter((p) => !drop.includes(p));

/** The built-in roles, in menu order. Super admin is given only through the 24-hour grant. */
export const BUILTIN_ROLES: RoleDef[] = [
  { id: "super_admin", name: "Super admin", description: "Founders. Everything, including super admins and the audit log export.", permissions: [...ALL] },
  { id: "admin", name: "Admin", description: "Operations lead. Everything except super admins and the audit log export.", permissions: without("team.super", "audit.export") },
  {
    id: "support_lead", name: "Support lead", description: "Head of support. Support agent rights plus any refund, macros, SLA settings, assignment and support reports.",
    permissions: ["dashboard.view", "learners.view", "learners.reveal", "learners.act", "learners.manage", "learners.view_as", "learners.notes",
      "support.view", "support.reply", "support.assign", "support.macros", "support.settings", "appeals.view", "appeals.decide",
      "subs.view", "payments.view", "refunds.view", "refunds.approve", "refunds.approve_any", "comp.grant", "discounts.view",
      "certs.view", "certs.manage", "audit.area_support", "help.view", "content.view", "quality.view", "reports.view"],
  },
  {
    id: "support_agent", name: "Support agent", description: "Customer support. Learner 360, tickets, appeals, small refunds and Pro for up to 30 days.",
    permissions: ["dashboard.view", "learners.view", "learners.reveal", "learners.act", "learners.view_as", "learners.notes",
      "support.view", "support.reply", "appeals.view", "appeals.decide", "payments.view", "refunds.view", "refunds.approve",
      "certs.view", "content.view", "quality.view"],
  },
  {
    id: "billing_manager", name: "Billing manager", description: "Finance. Payments, subscriptions, refunds, discount codes, prices and revenue. No content.",
    permissions: ["dashboard.view", "learners.view", "learners.reveal", "learners.notes", "support.view",
      "subs.view", "payments.view", "refunds.view", "refunds.approve", "refunds.approve_any", "comp.grant", "problems.view", "problems.retry",
      "revenue.view", "billing.export", "discounts.view", "discounts.create", "discounts.edit", "students.review", "prices.view",
      "audit.area_billing", "reports.view"],
  },
  {
    id: "content_publisher", name: "Content publisher", description: "Content lead. Content editor rights plus review, publish and roll back (Phase 2).",
    permissions: ["dashboard.view", "content.view", "content.edit", "content.publish", "media.view", "instructors.view", "quality.view", "releases.view", "reports.view", "audit.area_content"],
  },
  {
    id: "content_editor", name: "Content editor", description: "Content team. Edit drafts of paths, lessons, skills, media and translations (Phase 2).",
    permissions: ["dashboard.view", "content.view", "content.edit", "media.view", "instructors.view", "quality.view", "releases.view", "reports.view"],
  },
  {
    id: "instructor", name: "Instructor", description: "Video instructors on hybrid paths. Their own profile and videos, stats for their paths (Phase 2).",
    permissions: ["dashboard.view", "media.view", "instructors.view", "reports.view"],
  },
  {
    id: "marketing", name: "Marketing", description: "Growth. Waitlist, announcements, campaigns (Phase 2) and creating discount codes. No personal data export.",
    permissions: ["dashboard.view", "discounts.view", "discounts.create", "reports.view", "comms.view"],
  },
  {
    id: "analyst", name: "Analyst", description: "Reporting. Read only, with personal data always masked.",
    permissions: ["dashboard.view", "learners.view", "support.view", "appeals.view", "subs.view", "payments.view", "refunds.view", "revenue.view",
      "discounts.view", "prices.view", "certs.view", "content.view", "quality.view", "reports.view", "audit.view", "health.view"],
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
  if (perms.has("audit.area_support")) a.push("learners", "support", "appeals", "certificates");
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
      item("help", "Help centre", "books", "/admin/phase-2/help", ["help.view"], true),
    ],
  },
  {
    label: "Money", items: [
      item("subs", "Subscriptions", "arrows-split", "/admin/billing/subscriptions", ["subs.view"]),
      item("payments", "Payments", "credit-card", "/admin/billing/payments", ["payments.view"]),
      item("refunds", "Refunds", "arrow-u-up-left", "/admin/billing/refunds", ["refunds.view"]),
      item("problems", "Billing problems", "warning", "/admin/billing/problems", ["problems.view"]),
      item("discounts", "Discounts", "tag", "/admin/billing/discounts", ["discounts.view"]),
      item("prices", "Prices and plans", "receipt", "/admin/billing/prices", ["prices.view"]),
      item("revenue", "Revenue", "chart-line-up", "/admin/billing/revenue", ["revenue.view"]),
    ],
  },
  {
    label: "Content", items: [
      item("paths", "Paths", "book-open", "/admin/phase-2/paths", ["content.view"], true),
      item("lessons", "Units and lessons", "list", "/admin/phase-2/lessons", ["content.view"], true),
      item("skills", "Skills and misconceptions", "star", "/admin/phase-2/skills", ["content.view"], true),
      item("media", "Media library", "film-strip", "/admin/phase-2/media", ["media.view"], true),
      item("instructors", "Instructors", "chalkboard-teacher", "/admin/phase-2/instructors", ["instructors.view"], true),
      item("quality", "Content quality", "flag", "/admin/phase-2/quality", ["quality.view"], true),
      item("releases", "Releases", "rocket-launch", "/admin/phase-2/releases", ["releases.view"], true),
    ],
  },
  {
    label: "Grow", items: [
      item("reports", "Reports", "chart-bar", "/admin/phase-2/reports", ["reports.view"], true),
      item("comms", "Communications", "envelope-simple", "/admin/phase-2/communications", ["comms.view"], true),
      item("certs", "Certificates", "certificate", "/admin/certificates", ["certs.view"]),
    ],
  },
  {
    label: "Admin", items: [
      item("team", "Team and roles", "user-gear", "/admin/team", ["team.view"]),
      item("audit", "Audit log", "clock-counter-clockwise", "/admin/audit", ["audit.view", "audit.area_support", "audit.area_billing", "audit.area_content"]),
      item("settings", "Platform settings", "gear-six", "/admin/phase-2/settings", ["settings.view"], true),
      item("health", "System health", "heartbeat", "/admin/phase-2/health", ["health.view"], true),
    ],
  },
];

/** The menu for these permissions: an item shows when the member has any of its permissions; empty groups are dropped. */
export function navFor(perms: Perms): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.needs.length === 0 || i.needs.some((p) => perms.has(p))) })).filter((g) => g.items.length > 0);
}

/** SQL that seeds permission keys and built-in roles (pasted into 0044 by scripts/admin-sql.mjs). */
export function seedSql(): string {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  const keys = PERMISSION_KEYS.map((k) => `  (${q(k)}, ${q(PERMISSIONS[k][0])}, ${q(PERMISSIONS[k][1])})`).join(",\n");
  const roles = BUILTIN_ROLES.map((r) => `  (${q(r.id)}, ${q(r.name)}, ${q(r.description)}, true, array[${r.permissions.map(q).join(", ")}]::text[])`).join(",\n");
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
