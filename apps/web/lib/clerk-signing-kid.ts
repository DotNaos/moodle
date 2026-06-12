let cachedSigningKid: string | null = null;

function clerkInstanceHost(): string | null {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return null;
  }

  const encoded = publishableKey.replace(/^pk_(?:test|live)_/, "");
  const domain = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  return domain.endsWith(".clerk.accounts.dev") ? domain : null;
}

export async function getClerkSigningKid(): Promise<string | null> {
  if (cachedSigningKid) {
    return cachedSigningKid;
  }

  const host = clerkInstanceHost();
  if (!host) {
    return null;
  }

  const response = await fetch(`https://${host}/.well-known/jwks.json`, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    return null;
  }

  const jwks = (await response.json()) as { keys?: Array<{ kid?: string }> };
  cachedSigningKid = jwks.keys?.[0]?.kid ?? null;
  return cachedSigningKid;
}

export function handshakeTokenKid(handshakeToken: string): string | null {
  const [headerPart] = handshakeToken.split(".");
  if (!headerPart) {
    return null;
  }

  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8")) as { kid?: string };
  return header.kid ?? null;
}
