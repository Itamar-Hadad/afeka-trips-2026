import { NextRequest, NextResponse } from "next/server";

/**
 * POST /login – if the form is submitted natively (e.g. before JS runs), redirect back to the login page.
 * Normal login is handled by the form's onSubmit which fetches POST /api/auth/login.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  return NextResponse.redirect(url.origin + "/login", 303);
}
