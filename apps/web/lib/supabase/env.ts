// Supabase settings come from environment variables only; nothing secret is ever committed.
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = () => !!supabaseUrl() && !!supabaseAnonKey();
