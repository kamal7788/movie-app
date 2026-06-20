# StreamFlix

Netflix-style movie & series streaming platform with user accounts, favorites, watchlist, and progress tracking.

## Features

- Netflix-like dark UI with smooth animations
- TMDB-powered movie & TV show listings
- Streaming service filters (Netflix, Disney+, etc.)
- Genre, year, rating, and sort filters
- VidSrc.to embedded player
- User accounts (register/login)
- Favorites & watchlist
- Continue watching progress tracking
- D-pad/remote control navigation for projectors & TVs
- Fully responsive (desktop, mobile, tablet)

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework, fast & lightweight)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT (JSON Web Tokens)
- **APIs:** TMDB v3 (metadata), VidSrc.to (streaming)
- **Deployment:** Docker

## Coolify Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### 2. Create a Coolify Application

1. Go to your Coolify dashboard
2. Click **New Application** → **Git Repository**
3. Select your repository and branch (`main`)
4. Set **Build Pack** to `Dockerfile`
5. Set **Dockerfile Location** to `./Dockerfile`

### 3. Set Environment Variables

In Coolify, go to **Environment Variables** and add:

| Variable | Description |
|---|---|
| `TMDB_API_KEY` | Your TMDB API Read Access Token (get from https://www.themoviedb.org/settings/api) |
| `JWT_SECRET` | A random string for JWT signing (e.g. `openssl rand -hex 32`) |
| `DATABASE_URL` | PostgreSQL connection string |

### 4. Add a PostgreSQL Database

In Coolify:
1. Go to **Services** → **New** → **PostgreSQL**
2. Set database name: `streamflix`
3. Set user: `streamflix`
4. Set password: (use a secure password)
5. Copy the internal connection URL to `DATABASE_URL` env var

Example `DATABASE_URL`:
```
postgresql://streamflix:your_password@db-host:5432/streamflix
```

### 5. Deploy

Click **Deploy** in Coolify. The app will:
1. Build the Docker image
2. Start the container
3. Run database migrations automatically
4. Be accessible at your configured domain

### 6. Get Your TMDB API Key

1. Create an account at [themoviedb.org](https://www.themoviedb.org)
2. Go to [API Settings](https://www.themoviedb.org/settings/api)
3. Copy your **API Read Access Token** (the long bearer token)
4. Paste it as the `TMDB_API_KEY` env var in Coolify

## Local Development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Edit .env with your values
# Start with Docker (PostgreSQL)
docker-compose -f docker-compose.dev.yml up -d

# Run migrations & start
npm run db:migrate
npm run dev
```

Open http://localhost:3000

## Docker Compose (Standalone)

```bash
# Edit .env with your TMDB key and JWT secret
cp .env.example .env

# Start everything
docker-compose up -d

# Open http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TMDB_API_KEY` | Yes | TMDB API Read Access Token |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `production` or `development` |
