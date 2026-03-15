import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write new/refreshed tokens back onto the request so subsequent
          // server-component reads in this same request also see them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Replace supabaseResponse so it carries the refreshed cookies.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do NOT add any logic between createServerClient and getUser().
  // Supabase may call setAll() inside getUser() to persist a refreshed token.
  // If getUser fails (e.g. transient network error in Docker), treat the user
  // as unauthenticated only for protected routes — don't throw.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Network error reaching Supabase — let non-protected pages through.
  }

  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/workspaces") || pathname.startsWith("/profile");
  const isAuthPage =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup");

  // Helper: build a redirect that also forwards any refreshed session cookies
  // so the browser doesn't lose a token that was just silently rotated.
  const redirectTo = (path: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
      redirect.cookies.set(name, value, opts as Parameters<typeof redirect.cookies.set>[2]);
    });
    return redirect;
  };

  if (!user && isProtectedRoute) {
    return redirectTo("/auth/login");
  }

  if (user && isAuthPage) {
    return redirectTo("/workspaces");
  }

  // IMPORTANT: always return supabaseResponse (not a plain NextResponse.next())
  // so refreshed cookies are written back to the browser.
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
