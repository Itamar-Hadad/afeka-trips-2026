import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";


//when we logout, we need to remove onlythe token from the cookie
function clearCookieResponse(response: NextResponse): NextResponse {
  //response for the logout request for the client //set the cookie to an empty string, so the client will remove the token from the cookie
  response.headers.set(
    "Set-Cookie",
    //set the cookie to an empty string, so the client will remove the token from the cookie
    `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` //Max-Age=0 means the cookie will be removed after 0 seconds
  );
  return response;
}

/** GET: clear cookie and redirect to login (for "Sign out" links). */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  return clearCookieResponse(response);
}

/** POST: clear cookie and return JSON (for client-side logout). */
export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });
  return clearCookieResponse(response);
}
