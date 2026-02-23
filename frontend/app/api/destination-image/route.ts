import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing query parameter q.", fallback: true },
      { status: 400 }
    );
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "Image service not configured.", fallback: true }
    );
  }

  try {
    const url = new URL(UNSPLASH_SEARCH_URL);
    url.searchParams.set("query", q);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json(
          { error: "Invalid image API key.", fallback: true }
        );
      }
      return NextResponse.json(
        { error: "Image service error.", fallback: true },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      results?: Array<{
        urls?: { regular?: string };
        user?: { name?: string; links?: { html?: string } };
      }>;
    };
    const first = data?.results?.[0];
    const imageUrl = first?.urls?.regular;

    if (!imageUrl) {
      return NextResponse.json({ fallback: true });
    }

    return NextResponse.json({
      url: imageUrl,
      credit: first?.user?.name,
      creditUrl: first?.user?.links?.html,
    });
  } catch (err) {
    console.error("Destination image fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch image.", fallback: true },
      { status: 500 }
    );
  }
}
