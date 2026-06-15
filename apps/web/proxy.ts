import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { getClerkSigningKid, handshakeTokenKid } from "@/lib/clerk-signing-kid";

const clerkHandler = clerkMiddleware();
const LOCAL_DEV_BROWSER_COOKIE = "__clerk_db_jwt";
const LOCAL_DEV_BROWSER_TOKEN = "local-dev-browser-check-disabled";

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

function hasLocalDevBrowserToken(request: NextRequest): boolean {
  return (
    request.cookies.has(LOCAL_DEV_BROWSER_COOKIE) ||
    request.nextUrl.searchParams.has(LOCAL_DEV_BROWSER_COOKIE)
  );
}

function bootstrapLocalDevBrowserToken(request: NextRequest): NextResponse | null {
  if (!isDevelopment()) {
    return null;
  }

  if (hasLocalDevBrowserToken(request)) {
    return null;
  }

  const response = NextResponse.redirect(request.nextUrl);

  response.cookies.set(LOCAL_DEV_BROWSER_COOKIE, LOCAL_DEV_BROWSER_TOKEN, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

function maybeBlockProductionDevRoute(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/dev")) {
    return null;
  }
  if (isDevelopment()) {
    return NextResponse.next();
  }
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "cache-control": "no-store",
    },
  });
}

async function maybeRedirectStaleHandshake(request: NextRequest): Promise<NextResponse | null> {
  if (!isDevelopment()) {
    return null;
  }

  const handshakeToken = request.nextUrl.searchParams.get("__clerk_handshake");
  const sessionCookie = request.cookies.get("__session")?.value;

  console.log("[PROXY] maybeRedirectStaleHandshake -> handshakeToken:", !!handshakeToken, "sessionCookie:", !!sessionCookie);

  if (!handshakeToken && !sessionCookie) {
    return null;
  }

  const expectedKid = await getClerkSigningKid();
  console.log("[PROXY] expectedKid:", expectedKid);
  
  if (!expectedKid) {
    return null;
  }

  if (handshakeToken) {
    const kid = handshakeTokenKid(handshakeToken);
    console.log("[PROXY] handshakeToken kid:", kid);
    if (kid && kid !== expectedKid) {
      console.log("[PROXY] redirecting due to stale handshake token");
      return NextResponse.redirect(new URL("/api/dev/clear-clerk", request.url));
    }
  }

  if (sessionCookie) {
    const kid = handshakeTokenKid(sessionCookie);
    console.log("[PROXY] sessionCookie kid:", kid);
    if (kid && kid !== expectedKid) {
      console.log("[PROXY] redirecting due to stale session cookie");
      return NextResponse.redirect(new URL("/api/dev/clear-clerk", request.url));
    }
  }

  return null;
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const localDevBrowserBootstrap = bootstrapLocalDevBrowserToken(request);
  if (localDevBrowserBootstrap) {
    return localDevBrowserBootstrap;
  }

  const devRouteResponse = maybeBlockProductionDevRoute(request);
  if (devRouteResponse) {
    return devRouteResponse;
  }

  const staleHandshakeRedirect = await maybeRedirectStaleHandshake(request);
  if (staleHandshakeRedirect) {
    return staleHandshakeRedirect;
  }

  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/dev/:path*",
    "/((?!_next|dev|api/dev/clear-clerk|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|pdf|webmanifest)).*)",
    "/(api|trpc)/((?!dev/clear-clerk).*)",
  ],
};
