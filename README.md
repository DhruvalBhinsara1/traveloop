# Traveloop

Traveloop is a mobile-first travel planning MVP built from the hackathon problem statement. It helps users create multi-city trips, plan stops and activities, manage budgets, keep checklists and notes, upload trip/profile photos, and share public itinerary links.

The project is split into an Expo React Native mobile app and an Express + Prisma API backed by Postgres.

## Live API

Production API:

```txt
https://traveloop-server-seven.vercel.app
```

Health check:

```txt
https://traveloop-server-seven.vercel.app/health
```

Use the base URL, not `/health`, in the mobile app environment.

## Repository Structure

```txt
Traveloop/
  mobile/          Expo React Native app
  server/          Express API, Prisma schema, API routes
  package.json     Root convenience scripts
```

Important areas:

```txt
mobile/src/api/          Mobile API clients and shared response types
mobile/src/components/   Reusable UI components
mobile/src/context/      Auth state and user session handling
mobile/src/navigation/   App, auth, tab, and detail navigation
mobile/src/screens/      Mobile screens
mobile/src/theme/        Design tokens. Use these instead of local colors/radii.

server/src/routes/       Express route modules
server/src/middleware/   Auth middleware
server/src/utils/        Validation, uploads, errors
server/prisma/           Database schema and migrations
```

## Tech Stack

- Mobile: Expo SDK 54, React Native 0.81, React 19, TypeScript, React Navigation.
- API: Node 20+ with Node 22 LTS recommended, Express, Prisma, JWT auth, bcrypt.
- Database: Postgres.
- Images: Cloudinary through the server only.
- Deployment: Vercel for the API, Neon/Postgres-compatible database.

## What The App Supports

- Email/password signup and login.
- Optional profile photo upload during signup from camera or photo library.
- Editable profile photo from camera or photo library.
- Trip creation with title, dates, budget, description, cover photo, and privacy.
- Private/public trip controls.
- Public itinerary sharing through generated share tokens.
- Trip stops, activities, itinerary timeline, budget, checklist, and notes.
- Simple bill splitting with travelers, shared expenses, and settle-up suggestions.
- Usernames, friend requests, friends, and private friend groups.
- Shared trips with direct friend collaborators or group-based access.
- Crew management on Trip Detail, with owners controlling membership and sharing.
- Dashboard with next trip, timeline preview, planning tools, recent trips, and trip-derived places.

## First-Time Setup

Use Node 22 LTS for local development:

```bash
nvm use
```

Install dependencies from the repo root:

```bash
npm install
npm --prefix server install
npm --prefix mobile install
```

Copy example environment files:

```bash
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env
```

Never commit real `.env` values. They are ignored by Git.

## Environment Variables

### Server

`server/.env` is required for local API development.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/traveloop"
JWT_SECRET="replace-with-a-long-local-secret"
PORT=3000
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CLOUDINARY_FOLDER="traveloop/trip-covers"
CLOUDINARY_AVATAR_FOLDER="traveloop/avatars"
MAX_COVER_UPLOAD_BYTES=6000000
MAX_AVATAR_UPLOAD_BYTES=3000000
```

Generate a local JWT secret with:

```bash
openssl rand -base64 48
```

Cloudinary values are only needed for photo uploads. Keep them on the server side. The mobile app should never contain Cloudinary secrets.

### Mobile

`mobile/.env` controls which API the app talks to.

For deployed API testing:

```env
EXPO_PUBLIC_API_URL=https://traveloop-server-seven.vercel.app
```

For local API testing:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

When testing on a physical phone against a local server, use your computer LAN IP instead of `localhost`, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

Expo only exposes variables that start with `EXPO_PUBLIC_`.

## Local Database

Use any local Postgres instance. One simple Docker option:

```bash
docker run --name traveloop-postgres \
  -e POSTGRES_USER=traveloop \
  -e POSTGRES_PASSWORD=traveloop \
  -e POSTGRES_DB=traveloop \
  -p 5432:5432 \
  -d postgres:16
```

Then set:

```env
DATABASE_URL="postgresql://traveloop:traveloop@localhost:5432/traveloop"
```

Apply local migrations:

```bash
npm --prefix server run prisma:migrate
```

Regenerate Prisma Client after schema changes:

```bash
npm --prefix server run prisma:generate
```

## Running The App

Run server:

```bash
npm --prefix server run dev
```

Run mobile:

```bash
npm --prefix mobile run start
```

Run mobile with tunnel mode:

```bash
npm --prefix mobile run start:tunnel
```

Or from inside `mobile/`:

```bash
npm run start -- --clear --tunnel
```

Run both from the repo root:

```bash
npm run dev
```

If port `3000` is already in use, either stop the existing process or run the server with another port and update `mobile/.env`.

## Useful Scripts

Root:

```bash
npm run dev
npm run dev:server
npm run dev:mobile
npm run check
```

Server:

```bash
npm --prefix server run dev
npm --prefix server run start
npm --prefix server run check
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
npm --prefix server run prisma:deploy
```

Mobile:

```bash
npm --prefix mobile run start
npm --prefix mobile run start:tunnel
npm --prefix mobile run check
cd mobile && npx expo-doctor
cd mobile && npx expo install --check
```

## API Overview

Public:

```txt
GET  /
GET  /health
POST /api/auth/register
POST /api/auth/login
GET  /api/public/trips/:shareToken
```

Registration requires `name`, `username`, `email`, and `password`. Usernames are normalized lowercase and can contain letters, numbers, and underscores.

Authenticated routes require a JWT:

```txt
GET/PATCH          /api/auth/me
PATCH              /api/auth/me/avatar
GET/POST           /api/trips
GET/PATCH/DELETE   /api/trips/:id
PATCH              /api/trips/:id/cover
PATCH              /api/trips/:id/share
POST               /api/trips/:id/members
DELETE             /api/trips/:id/members/:userId
GET                /api/users/search?username=...
GET                /api/friends
GET                /api/friends/requests
POST               /api/friends/requests
PATCH              /api/friends/requests/:id
DELETE             /api/friends/:userId
GET/POST           /api/groups
GET/PATCH/DELETE   /api/groups/:id
POST               /api/groups/:id/members
DELETE             /api/groups/:id/members/:userId
POST/PATCH/DELETE  /api/trips/:tripId/stops...
POST/PATCH/DELETE  /api/stops/:stopId/activities...
POST/PATCH/DELETE  /api/trips/:tripId/checklist...
POST/PATCH/DELETE  /api/trips/:tripId/notes...
GET                /api/trips/:tripId/splits
POST               /api/trips/:tripId/splits/participants
DELETE             /api/splits/participants/:id
POST               /api/trips/:tripId/splits/expenses
DELETE             /api/splits/expenses/:id
```

Check route files in `server/src/routes/` for exact payloads.

## Design And UI Rules

Use `mobile/src/theme/*` as the source of truth for:

- Colors.
- Spacing.
- Radius.
- Shadows.
- Typography.

Do not add one-off colors, gradients, border radii, or shadows inside screens unless they are first added as reusable tokens. The app direction is premium, restrained, readable, and product-ready.

When improving screens:

- Prefer hierarchy, spacing, and typography over decorative effects.
- Keep touch targets comfortable.
- Avoid fake buttons or no-op affordances.
- Do not add filler dashboard content.
- Make changes consistent across related screens.

## Development Workflow

1. Pull the latest `main`.
2. Create a short feature branch.
3. Keep changes focused.
4. Update API types and mobile API clients together when server payloads change.
5. Run checks before pushing:

```bash
npm run check
cd mobile && npx expo-doctor
cd mobile && npx expo install --check
git diff --check
```

6. Do not commit `.env`, local database files, build output, Expo cache, or secrets.

## Deployment Notes

The API is deployed on Vercel from the `server/` root directory.

Current deployment settings:

```txt
Root Directory: server
Framework Preset: Other
Build Command: npm run vercel-build
Output Directory: empty / override off
Install Command: default
```

`server/vercel.json` rewrites requests to the Express API entrypoint:

```txt
server/api/index.js
```

Production environment variables live in Vercel, not in Git:

```env
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=traveloop/trip-covers
CLOUDINARY_AVATAR_FOLDER=traveloop/avatars
MAX_COVER_UPLOAD_BYTES=4000000
MAX_AVATAR_UPLOAD_BYTES=3000000
```

`npm run vercel-build` runs:

```bash
prisma generate
prisma migrate deploy
```

This generates Prisma Client and applies committed migrations to production.

## Common Troubleshooting

`Route not found` on the Vercel base URL:

- Use `/health` to test the API.
- The root URL should now also return a small JSON health response.

Vercel says `No Output Directory named "public"`:

- Confirm the project root is `server`.
- Confirm the latest commit includes `server/api/index.js` and `server/vercel.json`.
- Confirm Build Command is `npm run vercel-build`.
- Keep Output Directory empty or override off.

Prisma says `DATABASE_URL must start with postgresql:// or postgres://`:

- The Vercel `DATABASE_URL` is wrong or empty.
- Use the full Postgres connection string.
- Do not wrap it in quotes in Vercel.

Photo uploads fail:

- Confirm Cloudinary env vars exist on the server/Vercel project.
- Confirm upload size is within the configured limits.
- Confirm camera or photo library permissions were granted on the device.
- Do not put Cloudinary secrets in `mobile/.env`.

Expo tunnel asks for `@expo/ngrok`:

- Run `npm --prefix mobile install`.
- Then run `npm --prefix mobile run start:tunnel`.

Mobile still calls the old API:

- Update `mobile/.env`.
- Restart Expo with `--clear`.

```bash
npm --prefix mobile run start -- --clear --tunnel
```

## Secret Safety

- Never commit `server/.env`, `mobile/.env`, database URLs, JWT secrets, Cloudinary secrets, Expo tokens, or GitHub tokens.
- Only `*.env.example` files should be committed.
- If a secret is accidentally committed, rotate it immediately before cleaning history.
