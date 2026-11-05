// Supabase settings come from environment variables only; nothing secret is ever committed.
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = () => !!supabaseUrl() && !!supabaseAnonKey();
// Session cookies are Secure wherever the site is served over https (the Worker sets UG_HTTPS=1); plain http on localhost still works.
export const cookieSecure = () =>
  process.env.NODE_ENV === "production" && process.env.UG_HTTPS === "1";
