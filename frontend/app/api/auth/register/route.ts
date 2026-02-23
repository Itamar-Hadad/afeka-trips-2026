import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function setTokenCookie(token: string) {
  const isProd = process.env.NODE_ENV === "production";
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AUTH_COOKIE_MAX_AGE}${isProd ? "; Secure" : ""}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    const response = NextResponse.json(data);
    response.headers.set("Set-Cookie", setTokenCookie(data.token as string));
    return response;
  } catch (error) {
    console.error("Register proxy error:", error);
    return NextResponse.json(
      { message: "Registration failed" },
      { status: 500 }
    );
  }
}
