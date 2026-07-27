import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/config';

import type { Database } from './types';

/**
 * Refreshes the Supabase session for an incoming request and returns the
 * response carrying any rotated auth cookies, plus the authenticated user
 * (or null).
 *
 * Called from src/proxy.ts. Server Components cannot write cookies, so this is
 * the only place a rotated refresh token gets persisted — without it, sessions
 * expire mid-use and users are logged out at random.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // @supabase/ssr supplies no-store cache headers alongside the cookies.
        // A response carrying Set-Cookie must never be cached by a CDN or
        // reverse proxy, or one user's session token can be served to another.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // getUser() revalidates the token against the Auth server and triggers the
  // refresh. getSession() only decodes the cookie and would not be trustworthy
  // here, since cookie contents are attacker-controllable.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
