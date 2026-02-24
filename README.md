# Kid Chore Tracker

A simple web app for tracking kids' daily chores. Built with React (frontend) and Express (backend), ready for Heroku deployment.

## Features

- Login for `dkc`, `skc`, and `admin` (password same as username)
- Each kid sees their own chore list with a weekly day-by-day check-off grid
- Admin can add, remove, and rename chores for each kid
- Data persisted in **Heroku Postgres** (PostgreSQL via the `pg` package)

## Project Structure

```
kid-chore-tracking/
├── server/
│   ├── chores.json       # flat-file data store
│   ├── index.js          # Express API + static file server
│   ├── package.json
│   └── Procfile          # Heroku process definition
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── api.js
│       ├── index.js
│       └── components/
│           ├── Login.js
│           ├── Chores.js
│           └── Admin.js
└── README.md
```

## Local Development

### 1. Install & start the server

```bash
cd server
npm install
npm start        # runs on http://localhost:5003
```

### 2. Install & start the React client (separate terminal)

```bash
cd client
npm install
npm start        # runs on http://localhost:3000, proxies API to :5003
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Local Production Simulation (Single Server)

To simulate the production setup locally — where Express serves the built React app — run these commands:

```bash
# 1. Build the React client
cd client
npm install
npm run build

# 2. Start the Express server from the project root
cd ..
npm start        # runs on http://localhost:5003
```

Open [http://localhost:5003](http://localhost:5003) in your browser.

**Routing behaviour:**
- `/api/*` routes are handled by Express (login, chores, users, etc.)
- All other routes (e.g. `/`, `/login`) are served by the React app from `client/build`

> This mirrors exactly how the app runs on Heroku.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Authenticate a user |
| GET | `/api/users` | List all users |
| GET | `/api/chores/:username` | Get chores + completions for a user |
| POST | `/api/chores/:username/check` | Mark/unmark a chore for a day |
| POST | `/api/chores/:username/list` | Update a kid's chore list (admin) |

## Deploy to Heroku

### Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- A Heroku account

### Steps

```bash
# 1. Build the React client
cd client
npm install
npm run build

# 2. Deploy from the server directory
cd ../server
heroku create your-app-name
git subtree push --prefix server heroku main
```

Or deploy the whole repo and set the Heroku buildpack to run from `server/`:

```bash
heroku create your-app-name
heroku config:set PROJECT_PATH=server
heroku buildpacks:add heroku/nodejs
git push heroku main
```

The `Procfile` tells Heroku to run `node db-init.js` on every release (to create tables and seed initial data) and `node index.js` to start the web server.

> **Security Note:** Passwords are stored in plain text and authentication is intentionally minimal. **Do not use real passwords** — this app is intended for home/local use only. For any public deployment, add proper password hashing (e.g., bcrypt) and session management.

---

## Database Management

### Overview

Data is stored in **Heroku Postgres** (via the `pg` npm package). Previously the app used a flat file (`chores.json`) on the server filesystem, but Heroku's ephemeral filesystem resets that file on every deploy or dyno restart, causing data loss. PostgreSQL persists across deploys.

### Local Setup

1. **Install PostgreSQL** locally (e.g. `brew install postgresql` on macOS).
2. **Copy `.env.example` to `.env`** and fill in your values:
   ```bash
   cp .env.example .env
   ```
3. **Create the local database:**
   ```bash
   createdb kid_chores_dev
   ```
4. **Create tables and seed initial data:**
   ```bash
   node db-init.js
   ```

### Heroku Setup

1. **Add the Heroku Postgres add-on:**
   ```bash
   heroku addons:create heroku-postgresql:essential-0 --app <your-app>
   ```
2. The `Procfile` `release` step runs `node db-init.js` automatically on every deploy, creating tables and seeding the initial users if they don't exist yet.

### Workflow Checklist

- [ ] Never commit `.env`
- [ ] Always back up production before pushing data changes
- [ ] Use `scripts/backup-prod.sh` before every production deploy that touches data
- [ ] Use `scripts/export-prod-json.js` to inspect production data locally
- [ ] Use `scripts/import-json.js` to seed local DB from a prod export
- [ ] Test schema changes locally before deploying

### Pulling Production Data Locally

```bash
# 1. Back up production database to a local SQL file
./scripts/backup-prod.sh <your-app>

# 2. Restore the dump to your local database
./scripts/restore-local.sh backups/backup-<timestamp>.sql

# — or — export as JSON for inspection without a full DB restore
DATABASE_URL=$(heroku config:get DATABASE_URL --app <your-app>) node scripts/export-prod-json.js
# Output will be saved to backups/prod-export-<timestamp>.json

# Import a JSON export into the local DB
DATABASE_URL=postgres://localhost/kid_chores_dev node scripts/import-json.js backups/prod-export-<timestamp>.json
```

### Pushing Data to Production

> ⚠️ **This will OVERWRITE all production data.** Always back up first.

```bash
./scripts/backup-prod.sh <your-app>
./scripts/push-to-prod.sh --confirm <your-app>
```

### Connecting with a GUI

Tools like [TablePlus](https://tableplus.com/), [Postico](https://eggerapps.at/postico/), or [DBeaver](https://dbeaver.io/) can connect directly to your Heroku Postgres database.

Get the connection string:
```bash
heroku config:get DATABASE_URL --app <your-app>
```
Paste that URL into your GUI client's connection dialog.
