// A made-up super admin for screenshots and accessibility checks without a database (UG_ADMIN_FIXTURE=1, never on a
// deployed host: the guard ignores it when NODE_ENV is production).
import { PERMISSION_KEYS, permsOf } from "./permissions";
import type { AdminCtx } from "./guard";

export function fixtureCtx(): AdminCtx {
  const role = process.env.UG_ADMIN_FIXTURE_ROLE;
  return {
    userId: "00000000-0000-0000-0000-00000000f001", email: "uxgate8@gmail.com", name: "Founding admin",
    roles: [role ?? "super_admin"], perms: role ? permsOf([role]) : new Set(PERMISSION_KEYS), founding: !role,
    sessionId: "00000000-0000-0000-0000-00000000f002", ip: "127.0.0.1", ua: "fixture", totpAt: Math.floor(Date.now() / 1000), env: "staging",
  };
}
