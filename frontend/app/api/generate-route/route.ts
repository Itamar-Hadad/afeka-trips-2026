import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

//take from the frontend the destination and the type of the trip and the days of the trip
//and send it to the express server to generate the route
//the server will return the route to the frontend
//the route is an array of coordinates
//the coordinates are an array of [longitude, latitude]
//the coordinates are in the format of [longitude, latitude]
//the coordinates are in the format of [longitude, latitude]

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    const body = await request.json();
    const res = await fetch(`${API_URL}/api/generate-route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Generate route proxy error:", error);
    return NextResponse.json(
      { message: "Failed to generate route" },
      { status: 500 }
    );
  }
}
