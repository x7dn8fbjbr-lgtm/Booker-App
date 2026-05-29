import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Set BYPASS_AUTH=true in .env.local to skip auth during local development.
// Never set this on staging or production — it exposes all data without login.
function middleware(req: NextRequest) {
  if (process.env.BYPASS_AUTH === "true") {
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
