import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/config";

import type { Database } from "./types";

/**
 * Session-bound server Supabase client — Server Components and Server Actions.
 *
 * Carries the user's session, so RLS evaluates every statement. No service-role
 * key exists in this application (docs/ARCHITECTURE.md §1); there is deliberately
 * no elevated variant of this function to reach for.
 *
 * Must be called per request — never hoisted to a module-level singleton, which
 * would share one user's session across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components get a read-only cookie store, so a token refresh
          // cannot be written back here. Safe to ignore: src/proxy.ts refreshes
          // the session on every matched request and writes the cookies there.
        }
      },
    },
  });
}
