import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/config";

import type { Database } from "./types";

/**
 * Browser Supabase client — for client components only.
 *
 * Server Components, Server Actions and the proxy use `./server` and
 * `./update-session` instead. This client is session-bound like every other
 * access path: RLS applies (docs/ARCHITECTURE.md §1).
 */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
