import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!supabaseAnonKeyEnv) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// After the checks above, these values are guaranteed to be strings.
const supabaseUrl: string = supabaseUrlEnv;
const supabaseAnonKey: string = supabaseAnonKeyEnv;

const normalizedUrl = supabaseUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");

let supabaseClient: SupabaseClient | null = null;

/**
 * Singleton Supabase client.
 *
 * Supabase Auth automatically persists the session in the browser.
 */
export function createSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(normalizedUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}

export function getSupabaseClient(): SupabaseClient {
  return createSupabaseClient();
}