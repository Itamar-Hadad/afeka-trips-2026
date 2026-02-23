import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const body = await request.json();
    const { destination, type, path, pathDays, weatherDaily } = body;
    if (!destination || !type || !path || !pathDays) {
      return NextResponse.json(
        { message: "destination, type, path, and pathDays are required" },
        { status: 400 }
      );
    }
    console.log("[enrich] Proxying to backend", API_URL);
    const res = await fetch(`${API_URL}/api/llm/enrich`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        destination,
        type,
        path,
        pathDays,
        weatherDaily: weatherDaily ?? [],
      }),
    });
    const data = await res.json().catch(() => ({ message: "Enrichment request failed" }));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("LLM enrich proxy error:", error);
    return NextResponse.json(
      { message: "Enrichment request failed" },
      { status: 500 }
    );
  }
}
