import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

export const createClient = () => createBrowserClient(supabaseUrl(), supabaseAnonKey(), { cookieOptions: { secure: typeof location !== "undefined" && location.protocol === "https:" } });
