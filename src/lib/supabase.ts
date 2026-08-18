import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

const normalizedUrl = supabaseUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");

const url: string = normalizedUrl;
const key: string = supabaseAnonKey;

let supabaseClient: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}

export function getSupabaseClient(): SupabaseClient {
  return createSupabaseClient();
}