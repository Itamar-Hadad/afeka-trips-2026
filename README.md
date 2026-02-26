# Afeka Trips Routes 2026

Plan hiking and cycling routes with maps, weather, and LLM-generated insights.

---

## Detailed installation

### Prerequisites

- **Node.js** (v18 or later; LTS recommended)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas) for cloud)
- **API keys** (see below): OpenRouteService, Groq (LLM). Optional: Unsplash (destination images).

### 1. Clone the repository

```bash
git clone https://github.com/Itamar-Hadad/afeka-trips-2026
cd afeka-trips-2026
```

### 2. Backend (Express)

```bash
cd backend
npm install
```

Copy the environment file and set your values:

```bash
cp .env.example .env
```

Edit `.env` and set:

- `MONGODB_URI`: MongoDB connection string (e.g. Atlas URI or `mongodb://localhost:27017/afeka-trips`)
- `JWT_SECRET`: A long secret string (same value must be used in the frontend)
- `ORS_API_KEY`: [OpenRouteService](https://openrouteservice.org/) API key
- `GROQ_API_KEY`: [Groq](https://console.groq.com/) API key for LLM enrichment
- `PORT`: Optional; default is `5001`

Start the backend:

```bash
npm start
```

The API runs at `http://localhost:5001` (or the port you set).

### 3. Frontend (Next.js)

Open a **new terminal** and run:

```bash
cd frontend
npm install
```

Copy the environment file and set your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set:

- `NEXT_PUBLIC_API_URL`: Backend URL (e.g. `http://localhost:5001`)
- `JWT_SECRET`: **Same value as in the backend** (required for middleware to verify/refresh JWT)
- `UNSPLASH_ACCESS_KEY`: Optional; for destination images. If omitted, a placeholder image is used.

Start the frontend in development mode:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### 4. Run in production (optional)

- **Backend:** Use the same `node server.js` (or `npm start`) behind a process manager (e.g. PM2) or a hosting platform (Railway, Render, Fly.io). Set env vars on the host.
- **Frontend:** Build and serve:

  ```bash
  cd frontend
  npm run build
  npm start
  ```

  Set `NEXT_PUBLIC_API_URL` to your deployed backend URL. Deploy to Vercel, or run `npm start` on your own server.

---

## Full explanation of the project

### Architecture: two servers

The project uses **two servers** as required:

| Server   | Role |
|----------|------|
| **Express (backend)** | User authentication (register/login with encrypted passwords), JWT issue and refresh, route generation (OpenRouteService), LLM enrichment (Groq), routes CRUD (save, list, get, delete), geocoding. Persists users and saved routes in MongoDB. |
| **Next.js (frontend)** | Serves the website. **Middleware** runs on every request: it validates the JWT (from cookie) and refreshes it when needed. All API calls from the browser go through Next.js API routes, which proxy to the Express backend with the JWT. |

The user only visits the Next.js app; there is no separate React app (e.g. no Create React App).

### Auth flow

- **Register / Login:** User submits credentials to Next.js; Next.js proxies to Express. Express returns a JWT. The frontend stores the JWT in an HTTP-only cookie.
- **Protected requests:** When the user opens any page, the Next.js middleware reads the cookie, verifies the JWT, and optionally refreshes it. When the frontend calls backend APIs (e.g. generate route, save route), it uses `credentials: "include"` so the cookie is sent; Next.js API routes forward the request to Express with `Authorization: Bearer <token>`.
- **Logout:** User hits the logout endpoint; the cookie is cleared.

### Features

- **Route Planning:** User enters a destination and chooses Trek or Bicycle (and, for bicycle, 2 or 3 days). The backend uses OpenRouteService to generate the route(s): for Trek, 1–3 loop options (5–10 km each); for Bicycle, one multi-day route (30–70 km per day). The plan page shows a map (Leaflet), a 3-day weather forecast (Open-Meteo; “trip starts tomorrow”), one destination image (Unsplash if key is set), and LLM generated insights (Groq): overview, segments, POIs, safety tips, gear, etc. User can **save** the route (name + description) to the database.
- **Route History:** List of saved routes (from DB). User can **view** a route (map, distances, weather), **delete** it, or go back to the list. Weather is fetched again when viewing so it stays up to date (“trip starts tomorrow”).

### Tech stack

- **Backend:** Express, MongoDB (Mongoose), JWT (jsonwebtoken), bcrypt (passwords), OpenRouteService API, Groq API.
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Leaflet (map). Middleware uses `jose` for JWT verification/refresh.

---

## Repository structure

- `backend/` – Express server (`server.js`), auth, route generation, LLM enrich, routes CRUD, models (User, Route).
- `frontend/` – Next.js app: pages (home, login, register, plan, history), API routes (proxies to backend), components (map, weather, save route, etc.), middleware (auth).

---

## 📸 Screenshots

### 🏠 Home Page
<img width="1377" height="705" alt="Screenshot 2026-02-26 at 11 00 54" src="https://github.com/user-attachments/assets/5d266873-851d-4c84-ac4a-a4c47c04772d" />


### 🗺️ Route Planning
<img width="1390" height="764" alt="Screenshot 2026-02-26 at 11 01 32" src="https://github.com/user-attachments/assets/32958af4-2991-4bd1-a203-edf359bb75e5" />
<img width="1498" height="768" alt="Screenshot 2026-02-26 at 11 01 44" src="https://github.com/user-attachments/assets/719d6982-55cc-4b16-8c45-6918d75af7ed" />
<img width="1510" height="760" alt="Screenshot 2026-02-26 at 11 01 55" src="https://github.com/user-attachments/assets/08f1acf3-4a4c-4a13-930b-4b701d93e2b5" />


### 📜 Route History
<img width="1505" height="761" alt="Screenshot 2026-02-26 at 11 02 05" src="https://github.com/user-attachments/assets/614665b3-e086-4024-86e0-9856692569ca" />
<img width="1187" height="772" alt="Screenshot 2026-02-26 at 11 12 03" src="https://github.com/user-attachments/assets/c0193f98-b42b-4431-81f0-c1441d11fc0c" />


### 🔐 Authentication
<img width="1512" height="697" alt="Screenshot 2026-02-26 at 11 06 54" src="https://github.com/user-attachments/assets/b66c2841-196a-497f-934d-b21f1b5ef04d" />


