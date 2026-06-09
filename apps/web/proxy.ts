import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { getClerkSigningKid, handshakeTokenKid } from "@/lib/clerk-signing-kid";

const clerkHandler = clerkMiddleware();

async function maybeRedirectStaleHandshake(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "development") {
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

export default async function proxy(request: NextRequest, event: NextFetchEvent): Promise<Response> {
  const staleHandshakeRedirect = await maybeRedirectStaleHandshake(request);
  if (staleHandshakeRedirect) {
    return staleHandshakeRedirect;
  }

  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|dev|api/dev/clear-clerk|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|pdf|webmanifest)).*)",
    "/(api|trpc)/((?!dev/clear-clerk).*)",
  ],
};
