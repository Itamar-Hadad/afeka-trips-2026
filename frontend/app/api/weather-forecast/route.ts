import { NextRequest, NextResponse } from "next/server";

/** Open-Meteo daily forecast; we take tomorrow + 2 days (trip starts tomorrow). */
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function GET(request: NextRequest) {
  //get the lat and lon from the request
  const { searchParams } = new URL(request.url);
  //get the lat and lon from the request
  const lat = searchParams.get("lat");
  //get the lon from the request
  const lon = searchParams.get("lon");

  //if the lat or lon is not found, return a 400 error
  if (lat == null || lon == null) {
    return NextResponse.json(
      { message: "Missing lat or lon query parameters." },
      { status: 400 }
    );
  }
  //convert the lat and lon to numbers
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  //if the lat or lon is not a number, return a 400 error
  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    return NextResponse.json(
      { message: "Invalid lat or lon." },
      { status: 400 }
    );
  }

  try {
    //i send all the paramters that i need in the url
    const url = new URL(OPEN_METEO_URL);
    url.searchParams.set("latitude", String(latNum));
    url.searchParams.set("longitude", String(lonNum));
    //daily is the daily forecast, temperature max, temperature min and precipitation sum
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
    url.searchParams.set("timezone", "auto");

    //next.js saves the response (the weather forecast) in the cache for 1 hour
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      const text = await res.text();
      console.error("Open-Meteo error:", res.status, text);
      return NextResponse.json(
        { message: "Weather service unavailable." },
        { status: 502 }
      );
    }

    //what i expect to get from the response
    const data = (await res.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: (number | null)[];
        temperature_2m_min?: (number | null)[];
        precipitation_sum?: (number | null)[];
      };
    };

    const daily = data.daily;
    if (!daily?.time?.length) {
      return NextResponse.json([]);
    }

    //i map the time, temperature max, temperature min and precipitation sum to an array of objects
    const forecast = daily.time
      .map((date, index) => ({
        date,
        tempMax: daily.temperature_2m_max?.[index] ?? null,
        tempMin: daily.temperature_2m_min?.[index] ?? null,
        precipitation: daily.precipitation_sum?.[index] ?? null,
      }))
      .slice(1, 4); // tomorrow + 2 more days (trip starts tomorrow)

    return NextResponse.json(forecast); //i return the forecast to the frontend
  } catch (err) {
    console.error("Weather forecast fetch failed:", err);
    return NextResponse.json(
      { message: "Failed to fetch weather forecast." },
      { status: 500 }
    );
  }
}
