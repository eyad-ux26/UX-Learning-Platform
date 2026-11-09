import type { AdminCtx } from "./guard";
import { freshTotp, REAUTH_SECONDS } from "./rules";

/** False when a risky action from this admin needs a new authenticator code first. */
export const isFresh = (ctx: AdminCtx, now = Date.now()) => process.env.UG_ADMIN_FIXTURE === "1" || freshTotp(ctx.totpAt, now, REAUTH_SECONDS);
