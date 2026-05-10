# Traveloop Server

Express + Prisma API slice for Traveloop. It follows the PRD REST contract and data model.

## Setup

1. Install dependencies from this directory.
2. Copy `.env.example` to `.env` and fill in real local values.
3. Run `npm run prisma:generate`.
4. Run `npm run prisma:migrate -- --name init`.
5. Run `npm run dev`.

## Routes

Base health check:

- `GET /health`

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Trips:

- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/:id`
- `PUT /api/trips/:id`
- `DELETE /api/trips/:id`
- `PATCH /api/trips/:id/share`

Stops:

- `POST /api/trips/:tripId/stops`
- `PUT /api/stops/:id`
- `DELETE /api/stops/:id`
- `PATCH /api/trips/:tripId/stops/reorder`

Activities:

- `POST /api/stops/:stopId/activities`
- `PUT /api/activities/:id`
- `DELETE /api/activities/:id`

Checklist:

- `GET /api/trips/:tripId/checklist`
- `POST /api/trips/:tripId/checklist`
- `PATCH /api/checklist/:id`
- `DELETE /api/checklist/:id`

Notes:

- `GET /api/trips/:tripId/notes`
- `POST /api/trips/:tripId/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`

Public:

- `GET /api/public/:shareToken`
