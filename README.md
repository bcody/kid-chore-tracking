# Kid Chore Tracker

A simple web app for tracking kids' daily chores. Built with React (frontend) and Express (backend), ready for Heroku deployment.

## Features

- Login for `kid1`, `kid2`, and `admin` (password same as username)
- Each kid sees their own chore list with a weekly day-by-day check-off grid
- Admin can add, remove, and rename chores for each kid
- Data persisted in `server/chores.json` (flat file — no database needed)

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
npm start        # runs on http://localhost:5000
```

### 2. Install & start the React client (separate terminal)

```bash
cd client
npm install
npm start        # runs on http://localhost:3000, proxies API to :5000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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

The `Procfile` inside `server/` tells Heroku to run `node index.js`.

> **Note:** The `server/chores.json` file is used as the data store. On Heroku's ephemeral filesystem, data will reset on dyno restart. For persistence, replace the file-based store with a database (e.g., PostgreSQL via `pg`).

> **Security Note:** Passwords are stored in plain text in `chores.json` and authentication is intentionally minimal. **Do not use real passwords** — this app is intended for home/local use only. For any public deployment, add proper password hashing (e.g., bcrypt) and session management.
