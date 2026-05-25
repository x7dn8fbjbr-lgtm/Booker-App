import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In local development, bypass auth so the app can be tested without email setup.
// Remove this check before deploying to staging/production.
function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }
  return withAuth({ pages: { signIn: "/login" } })(req as never, {} as never);
}

export default middleware;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
