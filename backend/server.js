/**
 * Afeka Trips Routes 2026 – Express server
 */

//connect to the environment variables (env file) to take the port, the mongodb uri, the jwt secret, the ors api key, the groq api key
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

//import the express library to create the server
const express = require('express');
//import the mongoose library to connect to the mongodb database
const mongoose = require('mongoose');
//import the cors library to allow the server to be accessed from other domains
const cors = require('cors');
const polyline = require('@mapbox/polyline');

const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

//create the server, app is the server object
const app = express();

// Middleware
//allow the server to be accessed from other domains
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment. Copy .env.example to .env and set it.');
  process.exit(1);
}

//connect to the mongodb database
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const User = require('./models/User');
const auth = require('./middleware/auth');

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Afeka Trips API' });
});

// ----- Auth routes (JWT valid for second server / Next.js) -----

// POST /api/register
app.post('/api/register', async (req, res) => {
  try {
    //validate the body of the request that the email, username and password are required
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Email, username, and password are required' });
    }
    //check if the user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    //create a new user
    const newUser = new User({ email, username, password });
    //save the user to the database, in the save he switch to the userSchema.pre('save', async function (next) to hash the password
    await newUser.save();
    //generate a token for the user
    const token = newUser.generateAuthToken();
    //return the token and the user
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    //validate the body of the request that the username and password are required
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    //find the user by the username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    //compare the password with the hashed password in the database
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    //generate a token for the user
    const token = user.generateAuthToken();
    //return the token and the user
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- Token verify & refresh (for silent refresh once a day) -----

// GET /api/verify – frontend can restore session
app.get('/api/verify', auth, async (req, res) => {
  try {
    res.json({
      message: 'Token is valid',
      user: { id: req.user._id, username: req.user.username, email: req.user.email },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/refresh – return new token (same payload, new expiry); no body required
app.post('/api/refresh', auth, async (req, res) => {
  try {
    const token = req.user.generateAuthToken();
    res.json({
      token,
      user: { id: req.user._id, username: req.user.username, email: req.user.email },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- Routes CRUD (saved routes per user) -----
const routesRouter = require('./routes/routes');
app.use('/api/routes', routesRouter);

// ===== Geocoding & route generation (ORS – realistic roads/trails) =====

// Haversine distance in km for [lon, lat]
// take two coordinates [lon, lat] and return the distance in km
function segmentDistanceKm(a, b) {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180; // convert to radians
  const dLon = ((lon2 - lon1) * Math.PI) / 180; // convert to radians
  const la1 = (lat1 * Math.PI) / 180; // convert to radians
  const la2 = (lat2 * Math.PI) / 180; // convert to radians
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2; // calculate the haversine distance
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function calculateRouteDistanceKm(coords) { //coords is an array of [lon, lat] coordinates
  if (!coords || coords.length < 2) return 0; //if the coords is not an array or the length is less than 2, return 0
  let total = 0; //initialize the total distance to 0
  for (let i = 1; i < coords.length; i++) { //loop through the coords array
    total += segmentDistanceKm(coords[i - 1], coords[i]); //add the distance between the current and previous coordinate to the total
  }
  return total; 
}

function splitRouteByDays(coordinates, days) {
  const total = calculateRouteDistanceKm(coordinates);
  if (days <= 1 || total === 0) return [coordinates]; //if the days is less than 1 or the total is 0, return the coordinates
  const targetPerDay = total / days; //target per day is the total distance divided by the number of days
  const result = [];
  let dayStartIdx = 0; //day start index is the index of the first coordinate of the day
  let acc = 0; //accumulator is the distance travele (sum the total distance of the day)
  for (let i = 1; i < coordinates.length && result.length < days - 1; i++) { //loop through the coordinates array
    //result.length is the number of days that have been split, the last day is not included in the result array
    acc += segmentDistanceKm(coordinates[i - 1], coordinates[i]);
    if (acc >= targetPerDay) { 
      result.push(coordinates.slice(dayStartIdx, i + 1)); // i + 1 because the slice function isn't inclusive of the last index
      dayStartIdx = i; // next day start with index i 
      acc = 0;
    }
  }
  if (dayStartIdx < coordinates.length - 1) { // if the day start index is less than the length of the coordinates array - 1, push the rest of the coordinates to the result array
    result.push(coordinates.slice(dayStartIdx));
  } else if (result.length < days) {
    /// Edge case: ensure we return the requested number of days
    // even if the route is too short or has too few points.
    result.push([coordinates[coordinates.length - 2], coordinates[coordinates.length - 1]]);
  }
  return result;
}

function toLonLatOffset(lon, lat, km, bearingDeg) { 
  //we get the lon, lat of the destionation and the function return the lon, lat of the start point by km and bearing (bearing כיוון צפון/דרום/מזרח/מערב)
  const R = 6371;
  const br = (bearingDeg * Math.PI) / 180; // convert the bearing to radians
  const dByR = km / R;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(br)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(dByR) * Math.cos(lat1),
      Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

async function getCoordinatesORS(cityName) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error('ORS_API_KEY is required');
  const url = `https://api.openrouteservice.org/geocode/search`; //url with geocode search that returns the coordinates of the city
  const response = await fetch(
    `${url}?api_key=${apiKey}&text=${encodeURIComponent(cityName)}` //http request to the ORS API to get the coordinates of the city
  );
  const data = await response.json(); //get the data from the response (json format) and convert it to a javascript object
  if (!data.features || data.features.length === 0) {
    throw new Error('Location not found');
  }
  const [lon, lat] = data.features[0].geometry.coordinates; //get the longitude and latitude from the data
  return [lon, lat];
}

async function getRoute(startCoords, endCoords, type = 'cycling-regular', options = {}) { //options we need if its round_trip for hiking 
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) throw new Error('ORS_API_KEY is required');
  const validTypes = ['cycling-regular', 'foot-hiking', 'driving-car', 'driving-hgv'];
  if (!validTypes.includes(type)) type = 'cycling-regular'; //if the type is not valid, set the type to cycling-regular
  const url = `https://api.openrouteservice.org/v2/directions/${type}`; //url with directions that returns the route, http request to the ORS API to get the route
  const coords = options.round_trip ? [startCoords] : [startCoords, endCoords]; //if the round_trip is true, only the start coordinate is needed, otherwise both start and end coordinates are needed
  const body = { coordinates: coords, options };

  const doFetch = async (attempt = 1) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), //convert the body to a json string from the body object
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})); //get the error from the response (json format) and convert it to a javascript object
      if ((res.status === 429 || res.status >= 500) && attempt < 3) { 
        // if is a temporary error, wait for a bit and try again (2 times max) 
        const delay = Math.min(1000 * 2 ** (attempt - 1), 5000); // calculate the delay time (1s, 2s, 4s max 5s)
        await new Promise((r) => setTimeout(r, delay));
        return doFetch(attempt + 1);
      }
      throw new Error(
        'OpenRouteService request failed: ' + (err.error?.message || err.message || 'Unknown error')
      );
    }
    return res.json();
  };

  const data = await doFetch();
  const encoded = data?.routes?.[0]?.geometry;
  if (typeof encoded === 'string') { //if the encoded is a string, decode it to a javascript object to lon and lat by the polyline library
    const decoded = polyline.decode(encoded);
    return decoded.map(([lat, lon]) => [lon, lat]);
  }
  const gj = data?.features?.[0]?.geometry?.coordinates; // get the geometry coordinates from the data
  if (!gj || !Array.isArray(gj)) throw new Error('No geometry found in ORS response');
  return gj;
}

// Trek: 5–10 km per day, one loop from same start. Optional preferredLengthKm to get different loops (for 1–3 routes).
async function getHikeLoop5to10Km(startLon, startLat, preferredLengthKm = null) {
  const baseCandidates = [8, 7, 9, 6, 10, 5];
  //candidates for the length of the hike loop because the ORS can return less than 5km or more than 10km so we need to try different lengths
  
  // Prioritize a valid user-preferred hiking distance (5–10 km); otherwise use defaults.
  const candidatesKm =
    preferredLengthKm != null && preferredLengthKm >= 5 && preferredLengthKm <= 10
      ? [preferredLengthKm, ...baseCandidates.filter((c) => c !== preferredLengthKm)]
      : baseCandidates;
      
  for (const lenKm of candidatesKm) {
    try {
      const coords = await getRoute(
        [startLon, startLat],
        null,
        'foot-hiking',
        { round_trip: { length: Math.round(lenKm * 1000), points: 3 } }
      );
      const d = calculateRouteDistanceKm(coords);
      //because the ORS can return not exactly the distance we asked for, we need to check if the distance is between 5 and 10 km
      if (d >= 5 && d <= 10) return { coords, km: d };
    } catch (e) {
      // try next
    }
  }
  throw new Error('Could not generate a loop hike between 5–10 km. Try another location.');
}

// Bike: 2 or 3 consecutive days, city-to-city, 30–70 km per day
async function getBikeRouteNearDestination(destLon, destLat, days = 2) {
  const numDays = Math.min(3, Math.max(2, days)); // if the days is less than 2, set the days to 2, if the days is greater than 3, set the days to 3
  const minKmPerDay = 30;
  const maxKmPerDay = 70;
  const totalMin = numDays * minKmPerDay;
  const totalMax = numDays * maxKmPerDay;
  //trying to find an end point near the destination by km and bearing
  // bearings are the directions of the start point of the route (north, south, east, west, north-east, north-west, south-east, south-west)
  const bearings = [0, 90, 180, 270, 45, 135, 225, 315]; 
  const offsetsKm = [50, 40, 60, 35, 70, 30];

  //now we try to find the start point near the destination by km and bearing
  for (const offset of offsetsKm) {
    for (const bearing of bearings) {
      const [startLon, startLat] = toLonLatOffset(destLon, destLat, offset, bearing);
      try {
        const coords = await getRoute([startLon, startLat], [destLon, destLat], 'cycling-regular');
        const totalKm = calculateRouteDistanceKm(coords);

        //if the total distance is less than the total minimum or greater than the total maximum + 15, continue to the next offset and bearing
        //+15 because the ORS can reutrn not exactly the distance we asked for
        if (totalKm < totalMin || totalKm > totalMax + 15) continue;
        const dayArrays = splitRouteByDays(coords, numDays);
        const allInRange = dayArrays.every((dayCoords) => { 
          //check if the distance of each day is in the range of the minimum and maximum distance per day (30-70 km)
          const d = calculateRouteDistanceKm(dayCoords);
          return d >= minKmPerDay - 5 && d <= maxKmPerDay + 5; //-5 and +5 because the ORS can reutrn not exactly the distance we asked for
        });
        if (allInRange) return { coords, days: dayArrays, totalKm };
        // Allow small per-day deviations (e.g. 28 or 73 km) to avoid failing route generation
        // when the overall route is still reasonable.
        if (totalKm <= totalMax + 15) return { coords, days: dayArrays, totalKm }; 
      } catch (e) {
        // try next
      }
    }
  }
  throw new Error(
    'Could not find a ' +
      numDays +
      '-day bike route near destination (30–70 km/day). Try another place.'
  );
}

async function runRouteGeneration(destination, type, days = null) {
  const [destLon, destLat] = await getCoordinatesORS(destination);

  if (type === 'hike') {
    // Trek: one day, 1–3 route options (loops) from same start, 5–10 km each. User does not choose days for trek.
    const pathDays = [];
    const preferredLengths = [6, 8, 10]; // different lengths so we get 3 different loop options
    for (let i = 0; i < 3; i++) {
      try {
        const { coords } = await getHikeLoop5to10Km(destLon, destLat, preferredLengths[i]);
        pathDays.push(coords);
      } catch (e) {
        // if one loop fails, we still return what we have (1 or 2 routes is valid: "1–3 routes")
        if (pathDays.length === 0) throw e;
        break;
      }
    }
    const path = pathDays[0]; // default display: first route option
    return { path, pathDays };
  }

  if (type === 'bike') {
    // Trip duration: 2 or 3 consecutive days, 30–70 km per day
    const numDays = days === 3 ? 3 : 2;
    const { coords, days: pathDays } = await getBikeRouteNearDestination(
      destLon,
      destLat,
      numDays
    );
    return { path: coords, pathDays };
  }

  throw new Error('Unsupported type. Use "hike" or "bike".');
}

// Geocoding endpoint
app.post('/api/geocode', auth, async (req, res) => {
  //this endpoint is used to get the coordinates of a city (destination) by the city name from the ORS API 
  try {
    const { cityName } = req.body;
    if (!cityName) {
      return res.status(400).json({ message: 'City name is required' });
    }
    const coords = await getCoordinatesORS(cityName);
    res.json({ coordinates: coords });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(error.message === 'Location not found' ? 404 : 500).json({
      message: error.message || 'Geocoding failed',
    });
  }
});

// Route generation endpoint (low-level: start/end coords + type + options)
app.post('/api/routes/generate', auth, async (req, res) => {
  //this endpoint is used to generate a route by the start and end coordinates and the type of the route
  //this endpoint is for the history page to generate a route by the start and end coordinates and the type of the route
  try {
    const { startCoords, endCoords, type = 'cycling-regular', options = {} } = req.body;
    if (!startCoords) {
      return res.status(400).json({ message: 'Start coordinates are required' });
    }
    if (!options.round_trip && !endCoords) {
      return res.status(400).json({ message: 'End coordinates are required when not round_trip' });
    }
    const validTypes = ['cycling-regular', 'foot-hiking', 'driving-car', 'driving-hgv'];
    const profile = validTypes.includes(type) ? type : 'cycling-regular';
    const coordinates = await getRoute(startCoords, endCoords, profile, options);
    res.json({ coordinates });
  } catch (error) {
    console.error('Route generation error:', error);
    res.status(500).json({
      message: error.message || 'Route generation failed',
    });
  }
});

// Generate route endpoint (main entry point). Body: destination, type, days (optional – only for bike: 2|3).
app.post('/api/generate-route', auth, async (req, res) => {
  try {
    const { destination, type, days } = req.body;
    if (!destination || !type) {
      return res.status(400).json({ message: 'Destination and type are required' });
    }
    // Trip duration (days) only for bicycle: 2 or 3. Trek has 1–3 route options for one day, no days choice.
    if (type === 'bike' && days != null) {
      const d = parseInt(days, 10);
      if (d < 2 || d > 3) {
        return res.status(400).json({ message: 'For bicycle trips, days must be 2 or 3' });
      }
    }

    let path = null;
    let pathDays = [];
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await runRouteGeneration(destination, type, days);
        path = result.path;
        pathDays = result.pathDays;
        if (path && path.length >= 2) break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    if (!path || path.length < 2) {
      return res.status(500).json({
        message:
          lastError?.message ||
          'Could not generate route after 3 attempts. Try a different destination or try again later.',
      });
    }

    res.json({ destination, type, path, pathDays });
  } catch (error) {
    console.error('Generate route error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate route.' });
  }
});

// LLM Enrichment endpoint
app.post('/api/llm/enrich', auth, async (req, res) => {
  try {
    console.log('POST /api/llm/enrich received');
    const { destination, type, path, pathDays, weatherDaily } = req.body;

    if (!destination || !type || !path || !pathDays) {
      return res.status(400).json({ message: 'Destination, type, path, and pathDays are required' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      console.warn('Missing GROQ_API_KEY in server env (add it to backend/.env, not frontend)');
      // Return fallback response instead of error
      //fallback response is a response that is returned if the GROQ_API_KEY is not found its a default response to the user
      return res.json({
        title: `${destination} ${type} route`,
        overview: `A ${type} route in ${destination}. Enjoy your adventure!`,
        bestWindows: [],
        segments: [],
        pois: [],
        safety_tips: [],
        gear_checklist: [],
        food_stops: [],
        photo_spots: [],
      });
    }

    // Trek = 1 day only (pathDays = 1–3 route options from same start). Bike = 2 or 3 actual days.
    const isTrek = type === 'hike' || type === 'trek';
    const totalDays = isTrek ? 1 : pathDays.length;

    // For trek with multiple options, compute distance for each so the overview describes all options, not just option 1.
    let routeInfoLine;
    let dayHint;
    if (isTrek && pathDays.length > 1) {
      const optionKm = pathDays.map((dayPath) =>
        dayPath && dayPath.length > 1 ? calculateRouteDistanceKm(dayPath) : 0
      ).filter((d) => d > 0);
      const kmList = optionKm.map((d) => `${d.toFixed(1)} km`).join(', ');
      const minMax = optionKm.length ? `${Math.min(...optionKm).toFixed(1)}–${Math.max(...optionKm).toFixed(1)} km` : '';
      routeInfoLine = `Route info: 1 day(s), ${pathDays.length} route options (${kmList}).`;
      dayHint = `This is a single-day trek with multiple route options. Write the overview and segment so they apply to ALL options—e.g. "Explore ${destination} with several loop options (${minMax})" or "choose from ${pathDays.length} routes"—do NOT describe only one specific distance (e.g. do not say "this 5.1 km hike" when there are also 6.7 and 7.8 km options). Return exactly ONE segment (general description for the area).`;
    } else {
      const totalDistance = path.length > 1 ? calculateRouteDistanceKm(path) : 0;
      const numDays = pathDays.length;
      routeInfoLine = `Route info: ${isTrek ? 1 : numDays} day(s), ${totalDistance.toFixed(1)} km`;
      dayHint = isTrek
        ? 'This is a single-day trek. Return exactly ONE segment for this day.'
        : `This is a ${numDays}-day bicycle trip. You MUST return exactly ${numDays} segments—one per day. Segment 1 = Day 1, Segment 2 = Day 2${numDays === 3 ? ', Segment 3 = Day 3' : ''}. Do not return 4 or more segments; only ${numDays}.`;
    }

    const routeInfo = {
      destination,
      type,
      totalDays: isTrek ? 1 : pathDays.length,
      totalDistance: path.length > 1 ? calculateRouteDistanceKm(path) : 0,
      weather: weatherDaily || [],
    };

    const prompt = `Create a travel guide for a ${type} route in ${destination}.

${routeInfoLine}. ${dayHint}
${weatherDaily ? `Weather: ${JSON.stringify(weatherDaily)}` : ''}

IMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. No explanations, no "Here is the response:", nothing except the JSON object.

{
  "title": "Route title",
  "overview": "Brief description",
  "bestWindows": ["tip1", "tip2"],
  "segments": [{"name": "name", "description": "desc", "difficulty": "easy", "highlights": ["h1", "h2"]}],
  "pois": [{"name": "name", "type": "type", "description": "desc", "coordinates": [0, 0]}],
  "safety_tips": ["tip1", "tip2"],
  "gear_checklist": ["item1", "item2"],
  "food_stops": [{"name": "name", "type": "type", "description": "desc"}],
  "photo_spots": [{"name": "name", "description": "desc", "best_time": "time"}]
}`;

    console.log('GROQ_API_KEY is set, calling Groq API. Prompt length:', prompt.length);

    const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    console.log('LLM Response status:', llmResponse.status);

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('LLM API error:', llmResponse.status, llmResponse.statusText);
      console.error('Error response:', errorText);
      throw new Error('LLM service unavailable');
    }

    const llmData = await llmResponse.json();
    console.log('LLM Response data:', JSON.stringify(llmData, null, 2));
    //print the llm data to the console
    //content is the textof the response from the LLM
    const content = llmData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in LLM response');
      throw new Error('No content received from LLM');
    }
    

    // The LLM does not always return clean JSON.
    // Sometimes it adds extra text before/after the JSON,
    // wraps the response inside ```json code blocks,
    // or slightly breaks the expected format.
    //
    // To make the system robust, we try multiple JSON extraction strategies:
    // 1) Direct JSON.parse on the full response.
    // 2) Extract the first {...} block using regex.
    // 3) Extract JSON from a ```json code block.
    // 4) As a last resort, parse the substring between the first '{' and the last '}'.
    //
    // If all extraction attempts fail, we throw an "Invalid JSON response from LLM" error
    // and fall back to a safe default response.
 
    //try to parse the JSON from the response
    let enrichment;
    try {
      enrichment = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse LLM JSON response:', parseError);
      console.error('Raw LLM response:', content);
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enrichment = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted JSON from response with extra text');
        } else {
          const altMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
          if (altMatch) {
            enrichment = JSON.parse(altMatch[1]);
            console.log('✅ Successfully extracted JSON from code block');
          } else {
            const lastBraceIndex = content.lastIndexOf('}');
            const firstBraceIndex = content.indexOf('{');
            if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
              const jsonString = content.substring(firstBraceIndex, lastBraceIndex + 1);
              enrichment = JSON.parse(jsonString);
              console.log('✅ Successfully extracted JSON using brace matching');
            } else {
              throw new Error('No JSON object found in response');
            }
          }
        }
      } catch (extractError) {
        console.error('Failed to extract JSON from response:', extractError);
        throw new Error('Invalid JSON response from LLM');
      }
    }

    // Enforce one segment per day: bike = pathDays.length, trek = 1
    const maxSegments = (type === 'hike' || type === 'trek') ? 1 : (pathDays?.length || 1);
    const rawSegments = Array.isArray(enrichment.segments) ? enrichment.segments : [];
    const segments = rawSegments.slice(0, maxSegments);

    const sanitizedEnrichment = {
      title: enrichment.title || `${destination} ${type} route`,
      overview: enrichment.overview || `A ${type} route in ${destination}. Enjoy your adventure!`,
      bestWindows: Array.isArray(enrichment.bestWindows) ? enrichment.bestWindows : [],
      segments,
      pois: Array.isArray(enrichment.pois) ? enrichment.pois : [],
      safety_tips: Array.isArray(enrichment.safety_tips) ? enrichment.safety_tips : [],
      gear_checklist: Array.isArray(enrichment.gear_checklist) ? enrichment.gear_checklist : [],
      food_stops: Array.isArray(enrichment.food_stops) ? enrichment.food_stops : [],
      photo_spots: Array.isArray(enrichment.photo_spots) ? enrichment.photo_spots : [],
    };

    res.json(sanitizedEnrichment);
  } catch (error) {
    console.error('LLM enrichment error:', error);
    res.json({
      title: `${req.body.destination || 'Route'} ${req.body.type || 'adventure'}`,
      overview: `A ${req.body.type || 'great'} route in ${req.body.destination || 'this area'}. Enjoy your adventure!`,
      bestWindows: [],
      segments: [],
      pois: [],
      safety_tips: [],
      gear_checklist: [],
      food_stops: [],
      photo_spots: [],
    });
  }
});

//start the server
const PORT = process.env.PORT || 5001;
//listen to the port and start the server
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
