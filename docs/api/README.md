# REST API

Base URL: `/api`

## Auth

`GET /auth/csrf`
Response: `{ "csrfToken": "token" }`

`POST /auth/register`
Body: `{ "email": "user@example.com", "username": "viewer", "password": "StrongPass123!" }`
Response: `{ "user": { "id": "...", "email": "...", "role": "USER" } }`
Error: `{ "error": { "code": "ACCOUNT_EXISTS", "message": "Email or username is already registered" } }`

`POST /auth/login`
Body: `{ "email": "user@example.com", "password": "StrongPass123!" }`
Response sets `accessToken` and `refreshToken` HttpOnly cookies.

`POST /auth/refresh`
Rotates a valid refresh-token session and sets a new pair of HttpOnly cookies. The request requires the CSRF header.

`POST /auth/logout`
Response: `204 No Content`

## Movies

`GET /movies/rows`
Response: `{ "rows": [{ "title": "Trending Now", "items": [MovieCard] }] }`

`GET /movies/search?q=matrix&year=1999`
Searches title, actor, genre, director and optional year.

`GET /movies/:slug`
Returns detail payload with genres, cast, directors, writers, seasons, episodes, reviews and similar-title metadata.

`GET /movies/:id/playback`
Requires auth. Returns HLS/DASH URLs, subtitles, audio tracks and skip-intro markers.

## Users

`GET /users/me`
Requires auth. Returns user profile, profiles and active subscription.

`POST /users/profiles/:profileId/watch-progress`
Body: `{ "movieId": "...", "episodeId": "...", "progressSeconds": 600, "durationSeconds": 5400 }`
Stores continue-watching progress and completion.

`GET /users/profiles/:profileId/recommendations`
Returns personalized recommendations with scores and reasons.

## Subscriptions

`GET /subscriptions/plans`
Returns Basic, Standard and Premium plans with monthly/yearly prices.

`POST /subscriptions/checkout`
Body: `{ "tier": "PREMIUM", "billingInterval": "MONTHLY" }`
Creates a subscription record and returns a checkout URL.

## Admin

All admin routes require `ADMIN` or `SUPER_ADMIN`.

`GET /admin/dashboard`
Returns total users, active users/subscriptions, revenue, views and watch time.

`POST /admin/movies`
Creates catalog content with validation.

`PATCH /admin/movies/:id`
Updates metadata and media URLs.

`DELETE /admin/movies/:id`
Deletes a title and dependent relationships.

`PATCH /admin/users/:id/moderation`
Body: `{ "action": "BAN" | "SUSPEND" | "RESTORE" }`
