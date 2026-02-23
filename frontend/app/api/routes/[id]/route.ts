import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Route ID required" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/routes/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get route by id proxy error:", error);
    return NextResponse.json(
      { message: "Failed to fetch route" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Route ID required" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/routes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Delete route proxy error:", error);
    return NextResponse.json(
      { message: "Failed to delete route" },
      { status: 500 }
    );
  }
}
