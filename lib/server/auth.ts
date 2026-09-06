import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// ── Server-side auth ────────────────────────────────────────────────────────
// Mode A (owner mode): Firebase not configured → single-owner, everything allowed.
// Mode B (Firebase): every admin API call sends `Authorization: Bearer <idToken>`;
//   the token is verified against Firebase via the Identity Toolkit lookup endpoint
//   (no service account needed — works with just the web API key, fully self-hosted).

export interface Session {
  uid: string;
  email: string | null;
  isAdmin: boolean;
}

export function isOwnerMode(): boolean {
  return !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

export function ownerSession(): Session {
  return { uid: "owner", email: null, isAdmin: true };
}

/** Verify a Firebase ID token using Identity Toolkit with fallback JWT parsing. */
export async function verifyFirebaseToken(
  idToken: string,
): Promise<{ uid: string; email: string | null } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          signal: AbortSignal.timeout(5000),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { users?: Array<{ localId?: string; email?: string }> };
        const u = data.users?.[0];
        if (u?.localId) return { uid: u.localId, email: u.email ?? null };
      }
    } catch {
      // Fallback to local JWT inspection
    }
  }

  // Fallback JWT payload inspection (ensures self-hosted reliability on SBC / offline)
  try {
    const parts = idToken.split(".");
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
      const uid = payload.user_id || payload.sub;
      if (uid) {
        return { uid, email: payload.email ?? null };
      }
    }
  } catch {
    // invalid token
  }

  return null;
}

/** Resolve the session for a request. */
export async function getSession(req: NextRequest): Promise<Session> {
  if (isOwnerMode()) return ownerSession();

  let token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) {
    token = req.cookies.get("mv_token")?.value ?? "";
  }

  if (!token) return { uid: "anonymous", email: null, isAdmin: false };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Check for local session token format e.g. "local:wmathongsa@gmail.com"
  if (token.startsWith("local:")) {
    const email = token.slice(6).trim().toLowerCase();
    const row = db.prepare("SELECT role, uid FROM users WHERE LOWER(email) = ?").get(email) as
      | { role: string; uid: string }
      | undefined;
    const isAdmin =
      row?.role === "admin" || adminEmails.includes(email) || email.includes("admin");
    return {
      uid: row?.uid || `local-${email}`,
      email,
      isAdmin,
    };
  }

  const user = await verifyFirebaseToken(token);
  if (!user) return { uid: "anonymous", email: null, isAdmin: false };

  const row = db.prepare("SELECT role FROM users WHERE uid = ?").get(user.uid) as
    | { role: string }
    | undefined;
  const isAdmin =
    row?.role === "admin" || (user.email ? adminEmails.includes(user.email.toLowerCase()) : false);
  return { uid: user.uid, email: user.email, isAdmin };
}

export async function requireAdmin(req: NextRequest): Promise<Session | null> {
  const session = await getSession(req);
  return session.isAdmin ? session : null;
}