# Traveloop

Traveloop is a mobile-first travel planner built for the hackathon PRD: Expo React Native on the client, Express + Prisma on the API, JWT auth, trip itinerary building, budget tracking, checklist, notes, and public trip sharing.

## Structure

- `mobile/` - Expo React Native app.
- `server/` - Express API with Prisma models and JWT auth.

## Local Setup

Copy the example env files before running locally:

```bash
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env
```

Use your own local values. Do not commit real secrets.

```bash
npm install
npm --prefix server install
npm --prefix mobile install
npm --prefix server run prisma:generate
npm --prefix server run dev
npm --prefix mobile run start
```

Trip thumbnail uploads use Cloudinary. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to `server/.env` for cover editing; keep the real values local.

For a phone demo, run Expo with tunnel mode from `mobile/`:

```bash
npm --prefix mobile run start:tunnel
```

## Security Notes

- Real `DATABASE_URL`, `JWT_SECRET`, Expo tokens, and GitHub tokens are ignored by Git.
- Cloud image API keys stay in `server/.env`; the mobile app uploads through the API.
- Passwords are bcrypt-hashed on the server.
- The mobile app reads its API endpoint from `EXPO_PUBLIC_API_URL`.
- Public trip links require a generated share token and only return trips marked public.
