import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const saved = searchParams.get("saved");
    const url = new URL(`${API_URL}/api/routes`);
    if (saved === "true" || saved === "false") url.searchParams.set("saved", saved);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get routes proxy error:", error);
    return NextResponse.json(
      { message: "Failed to fetch routes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const body = await request.json();
    const { name, description, destination, type, pathEncoded, pathDaysEncoded } = body;
    if (!name || !destination || !type || !pathEncoded) {
      return NextResponse.json(
        { message: "name, destination, type, and pathEncoded are required" },
        { status: 400 }
      );
    }
    const res = await fetch(`${API_URL}/api/routes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: String(name).trim(),
        description: description != null ? String(description).trim() : "",
        destination: String(destination).trim(),
        type: String(type).trim(),
        pathEncoded: String(pathEncoded),
        pathDaysEncoded: Array.isArray(pathDaysEncoded) ? pathDaysEncoded : [],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Save route proxy error:", error);
    return NextResponse.json(
      { message: "Failed to save route" },
      { status: 500 }
    );
  }
}
