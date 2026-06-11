# World Cup 2026 — Backend (Next.js + PostgreSQL)

Single source of truth for the Flutter app: stores match data in Postgres, polls
API-Football, serves a REST API, sends FCM push, and hosts an admin dashboard for
sending notifications + in-app messages.

```
API-Football ──poll (node-cron)──> Next.js ──> PostgreSQL "worldcup" (local + VPS)
                                      ├── REST API ──> Flutter app
                                      ├── /admin dashboard (notifications + messages)
                                      └── Firebase Admin (FCM) ──push──> devices
```

## 1. Configure

Copy `.env.example` → `.env` and fill in:

| Var | What |
|---|---|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/worldcup?schema=public` (local and VPS use DB name **worldcup**) |
| `API_FOOTBALL_KEY` | Key from dashboard.api-football.com (optional if you only seed sample data) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase **service-account** JSON as a single line (for sending FCM). *Different from the app's google-services.json.* |
| `ADMIN_PASSWORD` | Password for the `/admin` dashboard login |
| `AUTH_SECRET` | Long random string (signs admin cookies; also the `x-cron-secret` for `/api/cron`) |
| `ENABLE_POLLER` | `true` to run the node-cron poller in-process |

## 2. Database

```bash
npm install
npx prisma migrate dev --name init   # create tables (local). On VPS: npm run db:migrate
npm run db:seed                       # optional: load sample WC2026 data (12 teams, a live match, standings)
```

## 3. Run

```bash
npm run dev            # http://localhost:3000  (admin at /admin)
# or production:
npm run build && npm run start
```

To poll API-Football continuously (instead of in-process), run the worker separately
(e.g. under pm2 on the VPS):

```bash
ENABLE_POLLER=true npm run poll
```

Manual one-off sync (also usable as a Vercel Cron target):

```bash
curl -X POST "http://localhost:3000/api/cron?task=all" -H "x-cron-secret: $AUTH_SECRET"
```

## 4. Connect the Flutter app

In the app, edit `lib/core/config/app_config.dart`:

```dart
static const bool useMock = false;                 // use the live backend
static const String apiBaseUrl = 'http://10.0.2.2:3000'; // emulator → host
// real device on LAN: 'http://192.168.x.x:3000'   VPS: 'https://your.vps.host'
```

Rebuild the app. It now reads live data and registers for push.

## REST API (consumed by the app)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/fixtures` `?group&stage&status` | fixtures list |
| GET | `/api/fixtures/:id` `/events` `/lineups` `/stats` | match detail |
| GET | `/api/teams`, `/api/teams/:id` | teams + squad |
| GET | `/api/standings` | group tables |
| POST | `/api/devices` | register FCM token + favourites |
| GET | `/api/messages?deviceId=` | inbox |
| POST | `/api/messages/:id/read` | mark read |

## Admin dashboard — `/admin`

Login with `ADMIN_PASSWORD`. Compose & send **push notifications** and **in-app
messages** (audience: everyone / a team's followers / a single device), and view
data counts.

## Deployment notes

- Local + VPS share the **same schema and DB name** (`worldcup`); only `DATABASE_URL`
  differs. Apply migrations with `npm run db:migrate` on each.
- FCM push works on Android out of the box; iOS needs an APNs key uploaded to Firebase.
- Keep secrets in `.env` only (gitignored) — never in the app bundle.
