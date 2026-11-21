# WatchTower

WatchTower is a project and task management workspace with a React frontend and a Node.js/Express + MySQL REST API. The UI ships in French and English with light and dark themes.

## Stack

- **Frontend:** React 19, React Router, Vite, Tailwind CSS 4
- **Backend:** Node.js, Express 5, Zod validation
- **Database:** MySQL 8 (mysql2 driver, versioned SQL migrations)
- **Auth:** HttpOnly JWT access cookie (15 min) + hashed refresh session (7 days), bcrypt passwords
- **Roles:** `ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`

## Requirements

- Node.js 20+
- npm 10+
- MySQL 8 (local install or Docker)

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file and set real local values:

   ```bash
   cp .env.example .env
   ```

   At minimum set `DB_PASSWORD`, `JWT_SECRET` (32+ random characters), and `SEED_DEMO_PASSWORD`.

   Generate a strong secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. Start MySQL. With Docker:

   ```bash
   docker run --name watchtower-mysql \
     -e MYSQL_ROOT_PASSWORD=change-me \
     -e MYSQL_DATABASE=watchtower_db \
     -e MYSQL_USER=watchtower_user \
     -e MYSQL_PASSWORD=change-me \
     -p 3306:3306 -d mysql:8.4
   ```

   Create the separate test database:

   ```bash
   docker exec -it watchtower-mysql mysql -uroot -pchange-me \
     -e "CREATE DATABASE IF NOT EXISTS watchtower_test; GRANT ALL PRIVILEGES ON watchtower_test.* TO 'watchtower_user'@'%'; FLUSH PRIVILEGES;"
   ```

4. Apply migrations and seed demo data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Demo accounts

The seed uses `SEED_DEMO_PASSWORD` from `.env` for every demo account:

| Role | Email |
|---|---|
| Admin | `admin@watchtower.local` |
| Project Manager | `manager@watchtower.local` |
| Team Member | `member@watchtower.local` |

Seed data is development-only. The seed refuses to run when `NODE_ENV=production`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Express + Vite dev server on port 3000 |
| `npm start` | Production server (serve `dist/client` after `npm run build`) |
| `npm run build` | Build the frontend |
| `npm test` | Vitest suite (unit + API integration) |
| `npm run lint` | ESLint for client and server |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Insert demo users, project, tasks, notifications |

## API overview

Base path: `/api/v1`. Responses use `{ success, data, meta }` or `{ success, error: { code, message, details } }`.

Auth uses HttpOnly cookies; no token is stored in localStorage. Protected routes require a valid access cookie or an active refresh session. State-changing requests from browsers are accepted only from the configured `CORS_ORIGIN`.

Main resources:

- `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`
- `POST /auth/forgot-password`, `/auth/reset-password`
- `GET /auth/me`
- `GET/PATCH /users/me`, `PATCH /users/me/password`, `GET/PATCH /users/me/preferences`
- `GET /users`, `GET /users/:id`, `PATCH /users/:id/role`, `PATCH /users/:id/status`
- Projects, members, tasks, status transitions, comments, notifications, activity, reports, calendar, timeline

See [`AGENT/06_API_SPECIFICATION.md`](AGENT/06_API_SPECIFICATION.md) for the endpoint contract and implementation notes.

## Authorization rules

- Admins can read and manage everything.
- Project managers can create projects and manage projects they own or where they are a project `MANAGER`.
- Team members can view projects they belong to, update task status, and comment on project tasks.
- Only admins can change global user roles and account status.
- Archived projects are read-only for projects, members, tasks, and comments.
- Project members can change task status from the Kanban board; full task editing is restricted to admins and project managers.
- A task assignee must be an active member of the task's project.

## Security notes

- Passwords are hashed with bcrypt; hashes are never returned by the API.
- Refresh tokens are random, stored only as SHA-256 hashes, and revoked on logout, password change/reset, and account deactivation.
- Login and password reset endpoints are rate limited. `X-Forwarded-For` is ignored unless `TRUST_PROXY` explicitly configures a trusted proxy.
- All MySQL sessions are forced to UTC so `CURRENT_TIMESTAMP` defaults and `UTC_TIMESTAMP()` writes agree.
- Authentication and administrative changes are appended to `audit_logs` (no passwords or tokens).
- API errors do not expose SQL, stack traces, database names, or reflected request URLs.
- `.env` is git-ignored; `.env.example` contains placeholders only.

## Development limitations

- In development, `POST /auth/forgot-password` returns the reset token in the response and logs it to the server console because no email provider is configured. Set `EXPOSE_RESET_TOKEN=false` to hide it.
- Access JWTs are short-lived (15 min). Logout revokes the refresh session and clears cookies; an already-issued access cookie remains cryptographically valid until it expires, which is standard for stateless access tokens.
- Project managers can list the user directory (limited fields) because the project member picker needs it. Full user administration stays admin-only.
- Deadline notifications are generated on demand when notifications are fetched and deduplicated per task per day. The server also runs a UTC deadline sweep on startup and hourly; both paths use the same dedup key.
- Deleting a task is a soft delete: comments and activity history remain in the database while the task disappears from all API views and progress calculations.
- The server shuts down gracefully on `SIGTERM`/`SIGINT` (stops the scheduler, closes Vite/MySQL, then exits).
