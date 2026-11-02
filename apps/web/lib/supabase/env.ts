// Supabase settings come from environment variables only; nothing secret is ever committed.
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = () => !!supabaseUrl() && !!supabaseAnonKey();
// Session cookies are Secure wherever the site is served over https (Vercel, or Cloudflare via UG_HTTPS=1); plain http on localhost still works.
export const cookieSecure = () =>
  process.env.NODE_ENV === "production" && (!!process.env.VERCEL || process.env.UG_HTTPS === "1");
