  import { NextRequest, NextResponse } from "next/server";
  import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth-cookie";

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(data, { status: res.status });
      }
      const token = data.token;
      if (!token || typeof token !== "string") {
        return NextResponse.json(
          { message: "Login succeeded but no token returned" },
          { status: 502 }
        );
      }
      const isProd = process.env.NODE_ENV === "production";
      const response = NextResponse.json(data);
      response.cookies.set(AUTH_COOKIE_NAME, token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: AUTH_COOKIE_MAX_AGE,
        secure: isProd,
      });
      return response;
    } catch (error) {
      console.error("Login proxy error:", error);
      return NextResponse.json(
        { message: "Login failed" },
        { status: 500 }
      );
    }
  }
