import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/** Silent refresh: refresh when token expires within this many seconds (24h). */
const REFRESH_THRESHOLD_SEC = 24 * 60 * 60;

const PUBLIC_PATHS = ["/login", "/register"];
const PUBLIC_PREFIX = "/api/auth";

function isPublic(pathname: string): boolean {
  if (pathname.startsWith(PUBLIC_PREFIX)) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function setTokenCookie(response: NextResponse, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    secure: isProd,
  });
}

/** Returns true if token is expired or expires within 24h (without verifying signature). */
function tokenExpiresWithin24h(token: string): boolean {
  try {
    //decode the token to get the payload 
    const payload = decodeJwt(token);
    //get the expiration date from the payload
    const exp = payload.exp;
    //if the expiration date is not found, we return true
    if (exp == null) return true; // no exp → treat as should refresh
    //get the current date in seconds
    const nowSec = Math.floor(Date.now() / 1000);
    //check if the expiration date is within 24 hours and if it is, we return true
    return exp < nowSec + REFRESH_THRESHOLD_SEC;
  } catch {
    return true; // malformed → treat as should refresh
  }
}

const REFRESH_TIMEOUT_MS = 8000;

/** Try to refresh token; optional single retry on failure (do not log out on first failure). */
async function tryRefresh(token: string, retry = true): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/api/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return retry ? tryRefresh(token, false) : null;
    const data = await res.json();
    const newToken = data.token ?? null;
    if (newToken) return newToken;
    return retry ? tryRefresh(token, false) : null;
  } catch {
    clearTimeout(timeoutId);
    return retry ? tryRefresh(token, false) : null;
  }
}

//middleware function to check if the user is authenticated 
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) { //if the path is public, we don't need to authenticate
    return NextResponse.next();
  }

  //if the path is not public, we need to authenticate checking the token from the cookie
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) { //if the token is not found, we redirect to the login page
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");

  // Silent refresh once a day: if token expires within 24h (or is already expired), refresh proactively
  if (tokenExpiresWithin24h(token)) {
    const newToken = await tryRefresh(token);
    if (newToken) {
      const response = NextResponse.next();
      setTokenCookie(response, newToken);
      return response;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token still valid and not near expiry – verify and continue
  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Verify failed (e.g. bad signature) – try refresh with retry before redirecting
    const newToken = await tryRefresh(token);
    if (newToken) {
      const response = NextResponse.next();
      setTokenCookie(response, newToken);
      return response;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
//config for the middleware to match all request paths except the public paths, photos, and static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
