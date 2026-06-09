import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { getClerkSigningKid, handshakeTokenKid } from "@/lib/clerk-signing-kid";

const clerkHandler = clerkMiddleware();

async function maybeRedirectStaleHandshake(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handshakeToken = request.nextUrl.searchParams.get("__clerk_handshake");
  if (!handshakeToken) {
    return null;
  }

  const [tokenKid, expectedKid] = await Promise.all([
    Promise.resolve(handshakeTokenKid(handshakeToken)),
    getClerkSigningKid(),
  ]);

  if (!tokenKid || !expectedKid || tokenKid === expectedKid) {
    return null;
  }

  return NextResponse.redirect(new URL("/api/dev/clear-clerk", request.url));
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
