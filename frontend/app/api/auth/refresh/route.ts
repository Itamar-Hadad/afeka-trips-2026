import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";


//function to set the token cookie
function setTokenCookie(token: string) {
  const isProd = process.env.NODE_ENV === "production";
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AUTH_COOKIE_MAX_AGE}${isProd ? "; Secure" : ""}`;
}



export async function POST(request: NextRequest) {
  try {
    //get the old token from the cookie from the request of the client
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ message: "No token" }, { status: 401 });
    }
    //call the refresh endpoint of the backend with the old token, we send the old token in the Authorization header
    const res = await fetch(`${API_URL}/api/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, //old token
      },
    });
    //get the data from the response
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    //create a response object from the data, the data includes the new token
    const response = NextResponse.json(data);
    
    //set the new token to the cookie, the new token is in the data.token
    response.headers.set("Set-Cookie", setTokenCookie(data.token as string));
    return response;
  } catch (error) {
    console.error("Refresh proxy error:", error);
    return NextResponse.json(
      { message: "Refresh failed" },
      { status: 500 }
    );
  }
}
