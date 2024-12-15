import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  '/',
  // '/api(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // Check if the current route is protected
  if (isProtectedRoute(req)) {
    // Protect the route; unauthenticated users will be redirected to the sign-in page
    await auth.protect();
  }
  // Proceed to the next middleware or request handler
  return NextResponse.next();
});



export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

