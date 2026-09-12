import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// React's cache() memoizes this per request/render pass. Every layout, page,
// and server action calls `createClient()` independently — before this, each
// call built a brand-new Supabase client, and (worse) each called
// `supabase.auth.getUser()` again, which is a real network round-trip to
// Supabase's Auth server (not a local JWT decode). A single navigation could
// end up paying that latency 2-3x sequentially (layout, then the page, then
// sometimes a nested component) before anything could render. Caching the
// client means everyone in one request pass shares the same instance, and
// wrapping its `auth.getUser` below means they share a single in-flight
// request for it too — no call sites need to change.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; middleware handles refresh
          }
        },
      },
    }
  );

  // Memoize the no-arg auth.getUser() call for the lifetime of this request.
  // Every call site keeps calling `supabase.auth.getUser()` exactly as
  // before; the first call kicks off the request and every subsequent call
  // in the same render pass reuses that same in-flight promise instead of
  // hitting the network again.
  const originalGetUser = client.auth.getUser.bind(client.auth);
  let cachedGetUser: ReturnType<typeof originalGetUser> | null = null;
  client.auth.getUser = ((...args: Parameters<typeof originalGetUser>) => {
    if (args.length > 0) return originalGetUser(...args);
    if (!cachedGetUser) cachedGetUser = originalGetUser();
    return cachedGetUser;
  }) as typeof client.auth.getUser;

  return client;
});
